require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const connectDB = require('./config/db');
const authRoutes = require('./auth');
const { processFiles } = require('./fileProcessor');
const File = require('./models/File');

const app = express();
const port = process.env.PORT || 3001;

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configure file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Create output directory
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Routes
app.use('/api/auth', authRoutes);

// Authentication middleware
function authenticate(req, res, next) {
    const token = req.body.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ message: 'Invalid token' });
    }
}

// File processing routes
app.post('/api/merge', authenticate, upload.array('files', 10), async (req, res) => {
    try {
        const result = await processFiles('merge', req.files, req.userId);
        await sendFileResponse(res, result, req.files.map(f => f.originalname).join(', '));
    } catch (err) {
        handleError(res, err, 'merge');
    }
});

app.post('/api/split', authenticate, upload.single('file'), async (req, res) => {
    try {
        const result = await processFiles('split', [req.file], req.userId);
        await sendFileResponse(res, result, req.file.originalname);
    } catch (err) {
        handleError(res, err, 'split');
    }
});

app.post('/api/compress', authenticate, upload.single('file'), async (req, res) => {
    try {
        const result = await processFiles('compress', [req.file], req.userId);
        await sendFileResponse(res, result, req.file.originalname);
    } catch (err) {
        handleError(res, err, 'compress');
    }
});

app.post('/api/word', authenticate, upload.single('file'), async (req, res) => {
    try {
        const result = await processFiles('word', [req.file], req.userId);
        await sendFileResponse(res, result, req.file.originalname);
    } catch (err) {
        handleError(res, err, 'word');
    }
});

app.post('/api/excel', authenticate, upload.single('file'), async (req, res) => {
    try {
        const result = await processFiles('excel', [req.file], req.userId);
        await sendFileResponse(res, result, req.file.originalname);
    } catch (err) {
        handleError(res, err, 'excel');
    }
});
// Add to server.js after other routes

// Get user's files
app.get('/api/files', authenticate, async (req, res) => {
    try {
        const files = await File.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(files);
    } catch (err) {
        console.error('Error fetching files:', err);
        res.status(500).json({ message: 'Failed to fetch files' });
    }
});

// Download specific file
app.get('/api/files/:id', authenticate, async (req, res) => {
    try {
        const file = await File.findOne({
            _id: req.params.id,
            userId: req.userId
        });

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (!fs.existsSync(file.path)) {
            return res.status(404).json({ message: 'File no longer available' });
        }

        res.download(file.path, file.processedName, (err) => {
            if (err) console.error('Download error:', err);
        });
    } catch (err) {
        console.error('File download error:', err);
        res.status(500).json({ message: 'Failed to download file' });
    }
});
// Helper functions
async function sendFileResponse(res, result, originalName) {
    const fileRecord = new File({
        userId: res.req.userId,
        toolType: res.req.route.path.split('/')[2],
        originalName,
        processedName: result.filename,
        path: result.filepath,
        size: result.size,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    await fileRecord.save();

    res.download(result.filepath, result.filename, (err) => {
        if (err) console.error('Download error:', err);
        fs.unlinkSync(result.filepath);
    });
}

function handleError(res, err, operation) {
    console.error(`${operation} error:`, err);
    res.status(500).json({ 
        message: `Failed to ${operation} file`,
        error: err.message 
    });
}

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Clean up old files
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    ['uploads', 'output'].forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (fs.existsSync(dirPath)) {
            fs.readdirSync(dirPath).forEach(file => {
                const filePath = path.join(dirPath, file);
                const stat = fs.statSync(filePath);
                if (now - stat.mtimeMs > oneHour) {
                    fs.unlinkSync(filePath);
                }
            });
        }
    });
}, 60 * 60 * 1000);
