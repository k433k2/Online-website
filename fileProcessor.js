const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const File = require('./models/File');

// Process files based on tool type
exports.processFiles = async (toolType, files, userId) => {
    switch (toolType) {
        case 'merge':
            return await mergePDFs(files, userId);
        case 'split':
            return await splitPDF(files[0], userId);
        case 'compress':
            return await compressPDF(files[0], userId);
        case 'word':
            return await convertToWord(files[0], userId);
        case 'excel':
            return await convertToExcel(files[0], userId);
        default:
            throw new Error('Invalid tool type');
    }
};

// Merge multiple PDFs
async function mergePDFs(files, userId) {
    const mergedPdf = await PDFDocument.create();
    
    for (const file of files) {
        const pdfBytes = fs.readFileSync(file.path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    const outputPath = path.join(__dirname, '../output', `merged-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, mergedPdfBytes);

    return {
        filename: 'merged.pdf',
        filepath: outputPath,
        size: mergedPdfBytes.length
    };
}

// Split PDF into individual pages
async function splitPDF(file, userId) {
    const pdfBytes = fs.readFileSync(file.path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    
    const zip = new AdmZip();
    
    for (let i = 0; i < pageCount; i++) {
        const newPdf = await PDFDocument.create();
        const [page] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(page);
        const newPdfBytes = await newPdf.save();
        zip.addFile(`page-${i+1}.pdf`, Buffer.from(newPdfBytes));
    }
    
    const zipPath = path.join(__dirname, '../output', `split-${Date.now()}.zip`);
    fs.writeFileSync(zipPath, zip.toBuffer());

    return {
        filename: 'split_pages.zip',
        filepath: zipPath,
        size: fs.statSync(zipPath).size
    };
}

// Compress PDF (simplified example)
async function compressPDF(file, userId) {
    const pdfBytes = fs.readFileSync(file.path);
    const outputPath = path.join(__dirname, '../output', `compressed-${Date.now()}.pdf`);
    fs.writeFileSync(outputPath, pdfBytes);
    
    return {
        filename: 'compressed.pdf',
        filepath: outputPath,
        size: fs.statSync(outputPath).size
    };
}

// Convert to Word (simplified example)
async function convertToWord(file, userId) {
    const outputPath = path.join(__dirname, '../output', `converted-${Date.now()}.docx`);
    fs.writeFileSync(outputPath, 'This would be a Word document in a real implementation');
    
    return {
        filename: 'converted.docx',
        filepath: outputPath,
        size: fs.statSync(outputPath).size
    };
}

// Convert to Excel (simplified example)
async function convertToExcel(file, userId) {
    const outputPath = path.join(__dirname, '../output', `converted-${Date.now()}.xlsx`);
    fs.writeFileSync(outputPath, 'This would be an Excel file in a real implementation');
    
    return {
        filename: 'converted.xlsx',
        filepath: outputPath,
        size: fs.statSync(outputPath).size
    };
}
