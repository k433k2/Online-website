const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const cors = require('cors');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const config = require('./config/config');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Create new user
        user = new User({
            name,
            email,
            password: await bcrypt.hash(password, 10)
        });

        await user.save();

        // Create token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            config.jwtSecret,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Validate password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: user._id, email: user.email },
            config.jwtSecret,
            { expiresIn: '1h' }
        );

        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            },
            token
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
// Add these routes to your server.js

// Protected file routes
app.post('/api/merge', authenticate, upload.array('files', 10), processFiles('merge'));
app.post('/api/split', authenticate, upload.single('file'), processFiles('split'));
app.post('/api/compress', authenticate, upload.single('file'), processFiles('compress'));
app.post('/api/word', authenticate, upload.single('file'), processFiles('word'));
app.post('/api/excel', authenticate, upload.single('file'), processFiles('excel'));

// Authentication middleware
function authenticate(req, res, next) {
    const token = req.body.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
}

// File processing factory
function processFiles(toolType) {
    return async (req, res) => {
        try {
            let result;
            
            switch(toolType) {
                case 'merge':
                    result = await mergePDFs(req.files);
                    break;
                case 'split':
                    result = await splitPDF(req.file);
                    break;
                case 'compress':
                    result = await compressPDF(req.file);
                    break;
                case 'word':
                    result = await convertToWord(req.file);
                    break;
                case 'excel':
                    result = await convertToExcel(req.file);
                    break;
                default:
                    throw new Error('Invalid tool type');
            }

            // Save file info to database if user is authenticated
            if (req.userId) {
                const fileRecord = new File({
                    userId: req.userId,
                    toolType,
                    originalName: req.file?.originalname || 'merged.pdf',
                    processedName: result.filename,
                    path: result.filepath,
                    size: result.size,
                    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
                });
                await fileRecord.save();
            }

            // Send the file for download
            res.download(result.filepath, result.filename, (err) => {
                if (err) {
                    console.error('Download error:', err);
                }
                // Clean up file after sending
                fs.unlinkSync(result.filepath);
            });
        } catch (err) {
            console.error(`${toolType} error:`, err);
            res.status(500).json({ 
                message: `Failed to ${toolType} PDF`,
                error: err.message 
            });
        }
    };
}
// Validate token
router.get('/validate', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (err) {
        console.error(err);
        res.status(401).json({ message: 'Invalid token' });
    }
});

module.exports = router;
const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configure file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// PDF Merge Endpoint
app.post('/api/merge', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).json({ error: 'Please upload at least 2 PDF files' });
        }

        const mergedPdf = await PDFDocument.create();
        
        for (const file of req.files) {
            const pdfBytes = fs.readFileSync(file.path);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
            
            // Delete the uploaded file after processing
            fs.unlinkSync(file.path);
        }

        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(outputDir, `merged-${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, mergedPdfBytes);
        
        res.download(outputPath, 'merged.pdf', (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            fs.unlinkSync(outputPath);
        });
    } catch (err) {
        console.error('Merge error:', err);
        res.status(500).json({ error: 'Failed to merge PDFs', details: err.message });
    }
});

// PDF Split Endpoint
app.post('/api/split', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Please upload a PDF file' });
        }

        const pdfBytes = fs.readFileSync(req.file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pageCount = pdfDoc.getPageCount();
        
        // Split each page into separate PDF
        const zip = new AdmZip();
        
        for (let i = 0; i < pageCount; i++) {
            const newPdf = await PDFDocument.create();
            const [page] = await newPdf.copyPages(pdfDoc, [i]);
            newPdf.addPage(page);
            const newPdfBytes = await newPdf.save();
            zip.addFile(`page-${i+1}.pdf`, Buffer.from(newPdfBytes));
        }
        
        const zipData = zip.toBuffer();
        const zipPath = path.join(outputDir, `split-${Date.now()}.zip`);
        fs.writeFileSync(zipPath, zipData);
        
        res.download(zipPath, 'split_pages.zip', (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            fs.unlinkSync(zipPath);
            fs.unlinkSync(req.file.path);
        });
    } catch (err) {
        console.error('Split error:', err);
        res.status(500).json({ error: 'Failed to split PDF', details: err.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Clean up old files periodically
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    [path.join(__dirname, 'uploads'), outputDir].forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.readdirSync(dir).forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > oneHour) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    });
}, 60 * 60 * 1000); // Run every hour
