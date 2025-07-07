const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const cors = require('cors');

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
