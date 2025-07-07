// server.js or index.js
const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Load config and models
const config = require('./config/config');
const User = require('./models/User');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(config.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// Auth Middleware
function authenticate(req, res, next) {
    const token = req.body.token || req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required' });

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.userId = decoded.id;
        next();
    } catch {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({
            name,
            email,
            password: await bcrypt.hash(password, 10)
        });
        await user.save();

        const token = jwt.sign({ id: user._id, email: user.email }, config.jwtSecret, { expiresIn: '1h' });
        res.status(201).json({ user: { id: user._id, name: user.name, email: user.email }, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, email: user.email }, config.jwtSecret, { expiresIn: '1h' });
        res.json({ user: { id: user._id, name: user.name, email: user.email }, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/api/auth/validate', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: 'Invalid token' });
    }
});

// PDF Merge
app.post('/api/merge', authenticate, upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) return res.status(400).json({ error: 'Upload at least 2 PDFs' });

        const mergedPdf = await PDFDocument.create();
        for (const file of req.files) {
            const pdfBytes = fs.readFileSync(file.path);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
            fs.unlinkSync(file.path);
        }

        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(outputDir, `merged-${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, mergedPdfBytes);

        res.download(outputPath, 'merged.pdf', err => {
            if (err) console.error('Download error:', err);
            fs.unlinkSync(outputPath);
        });
    } catch (err) {
        console.error('Merge error:', err);
        res.status(500).json({ error: 'Failed to merge PDFs', details: err.message });
    }
});

// PDF Split
app.post('/api/split', authenticate, upload.single('file'), async (req, res) => {
    try {
        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();

        const zip = new AdmZip();
        for (let i = 0; i < pageCount; i++) {
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(page);
            const newPdfBytes = await newPdf.save();
            zip.addFile(`page-${i + 1}.pdf`, Buffer.from(newPdfBytes));
        }

        const zipPath = path.join(outputDir, `split-${Date.now()}.zip`);
        fs.writeFileSync(zipPath, zip.toBuffer());

        res.download(zipPath, 'split_pages.zip', err => {
            if (err) console.error('Download error:', err);
            fs.unlinkSync(zipPath);
            fs.unlinkSync(req.file.path);
        });
    } catch (err) {
        console.error('Split error:', err);
        res.status(500).json({ error: 'Failed to split PDF', details: err.message });
    }
});

// Start server
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

// Clean old files
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    [path.join(__dirname, 'uploads'), outputDir].forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > oneHour) fs.unlinkSync(filePath);
            });
        }
    });
}, 60 * 60 * 1000);
