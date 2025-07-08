const express = require('express');
const multer = require('multer');
const pdfLib = require('pdf-lib');
const { PDFDocument } = pdfLib;
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const app = express();
const port = process.env.PORT || 3000;

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Create output directory if it doesn't exist
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

// PDF Merge Endpoint - Improved with proper file handling
app.post('/api/merge', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length < 2) {
      return res.status(400).json({ error: 'Please upload at least 2 PDF files' });
    }

    const mergedPdf = await PDFDocument.create();
    
    for (const file of files) {
      try {
        const pdfBytes = fs.readFileSync(file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
      } catch (err) {
        console.error(`Error processing file ${file.originalname}:`, err);
        // Clean up uploaded files
        files.forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ 
          error: `File ${file.originalname} is not a valid PDF or is corrupted` 
        });
      }
    }

    const mergedPdfBytes = await mergedPdf.save();
    const outputFilename = `merged-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputFilename);
    fs.writeFileSync(outputPath, mergedPdfBytes);
    
    // Set proper headers for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${outputFilename}`);
    res.setHeader('Content-Length', mergedPdfBytes.length);
    
    // Stream the file
    const fileStream = fs.createReadStream(outputPath);
    fileStream.pipe(res);
    
    // Clean up after streaming is complete
    fileStream.on('close', () => {
      try {
        // Delete the merged file
        fs.unlinkSync(outputPath);
        // Delete uploaded files
        files.forEach(file => fs.unlinkSync(file.path));
      } catch (cleanupErr) {
        console.error('Error during cleanup:', cleanupErr);
      }
    });
    
  } catch (err) {
    console.error('Merge error:', err);
    res.status(500).json({ error: 'Failed to merge PDFs' });
    
    // Clean up any uploaded files in case of error
    if (req.files) {
      req.files.forEach(file => {
        try { fs.unlinkSync(file.path); } catch (e) {}
      });
    }
  }
});

// PDF Split Endpoint - Improved with proper zip handling
app.post('/api/split', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please upload a PDF file' });
    }

    const pdfBytes = fs.readFileSync(req.file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    if (pageCount === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'The PDF contains no pages' });
    }

    const zipFilename = `split-pages-${Date.now()}.zip`;
    const zipPath = path.join(outputDir, zipFilename);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${zipFilename}`);
      
      const zipStream = fs.createReadStream(zipPath);
      zipStream.pipe(res);
      
      zipStream.on('close', () => {
        try {
          fs.unlinkSync(zipPath);
          fs.unlinkSync(req.file.path);
        } catch (cleanupErr) {
          console.error('Error during cleanup:', cleanupErr);
        }
      });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create();
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);
      const newPdfBytes = await newPdf.save();
      archive.append(Buffer.from(newPdfBytes), { name: `page-${i+1}.pdf` });
    }

    await archive.finalize();

  } catch (err) {
    console.error('Split error:', err);
    res.status(500).json({ error: 'Failed to split PDF' });
    
    // Clean up in case of error
    try { fs.unlinkSync(req.file.path); } catch (e) {}
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
