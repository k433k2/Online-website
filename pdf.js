const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { PDFDocument } = require('pdf-lib');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Configure file storage
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const userId = req.user.id;
    const dir = `uploads/${userId}`;
    
    await fs.ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// @route   POST api/pdf/merge
// @desc    Merge PDF files
// @access  Private
router.post('/merge', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ errors: [{ msg: 'Please upload at least 2 PDF files' }] });
    }

    const mergedPdf = await PDFDocument.create();
    
    for (const file of req.files) {
      const pdfBytes = await fs.readFile(file.path);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
      pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    const outputPath = path.join(path.dirname(req.files[0].path), 'merged.pdf');
    await fs.writeFile(outputPath, mergedPdfBytes);

    // Save file info to user
    const user = await User.findById(req.user.id);
    user.files.push({
      name: 'merged.pdf',
      path: outputPath,
      type: 'pdf',
      size: mergedPdfBytes.length
    });
    await user.save();

    res.json({ 
      success: true,
      downloadUrl: `/uploads/${req.user.id}/merged.pdf`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add similar routes for split, compress, convert-to-word, convert-to-excel

module.exports = router;
