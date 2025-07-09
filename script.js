 document.addEventListener('DOMContentLoaded', function() {
            // Mobile menu toggle
            const hamburger = document.querySelector('.hamburger');
            const navLinks = document.querySelector('.nav-links');

            hamburger.addEventListener('click', function() {
                navLinks.classList.toggle('active');
                hamburger.innerHTML = navLinks.classList.contains('active') ? 
                    '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
            });

            // Smooth scrolling for navigation
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    const targetId = this.getAttribute('href');
                    if (targetId === '#') return;
                    
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        // Close mobile menu if open
                        if (navLinks.classList.contains('active')) {
                            navLinks.classList.remove('active');
                            hamburger.innerHTML = '<i class="fas fa-bars"></i>';
                        }
                        
                        // Show the tool section
                        document.querySelectorAll('.tool-section').forEach(section => {
                            section.classList.remove('active');
                        });
                        targetElement.classList.add('active');
                        
                        // Scroll to the section
                        window.scrollTo({
                            top: targetElement.offsetTop - 80,
                            behavior: 'smooth'
                        });
                    }
                });
            });

            // Tool card navigation
            document.querySelectorAll('.tool-card').forEach(card => {
                card.addEventListener('click', function() {
                    const tool = this.getAttribute('data-tool');
                    const targetSection = document.querySelector(`#${tool}`);
                    
                    if (targetSection) {
                        document.querySelectorAll('.tool-section').forEach(section => {
                            section.classList.remove('active');
                        });
                        targetSection.classList.add('active');
                        
                        window.scrollTo({
                            top: targetSection.offsetTop - 80,
                            behavior: 'smooth'
                        });
                    }
                });
            });

            // Toast notification
            function showToast(message, duration = 3000) {
                const toast = document.getElementById('toast');
                toast.textContent = message;
                toast.classList.add('show');
                
                setTimeout(() => {
                    toast.classList.remove('show');
                }, duration);
            }

            // Initialize all tool functionalities
            initMergeTool();
            initSplitTool();
            initCompressTool();
        });

        // Merge PDF Tool
        function initMergeTool() {
            const mergeUploadBox = document.getElementById('merge-upload-box');
            const mergeFileInput = document.getElementById('merge-file-input');
            const mergeFileList = document.getElementById('merge-file-list');
            const mergeBtn = document.getElementById('merge-btn');
            const mergeReset = document.getElementById('merge-reset');
            const mergeSpinner = document.getElementById('merge-spinner');
            const mergeOrder = document.getElementById('merge-order');
            const customOrderContainer = document.getElementById('custom-order-container');
            
            let mergeFiles = [];

            // Toggle custom order input
            mergeOrder.addEventListener('change', function() {
                if (this.value === 'custom') {
                    customOrderContainer.style.display = 'block';
                } else {
                    customOrderContainer.style.display = 'none';
                }
            });

            // Handle file upload via button
            mergeUploadBox.addEventListener('click', function() {
                mergeFileInput.click();
            });

            // Handle file selection
            mergeFileInput.addEventListener('change', function(e) {
                handleMergeFiles(e.target.files);
            });

            // Handle drag and drop
            mergeUploadBox.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.style.borderColor = '#4a6bff';
                this.style.backgroundColor = 'rgba(74, 107, 255, 0.05)';
            });

            mergeUploadBox.addEventListener('dragleave', function() {
                this.style.borderColor = '#ccc';
                this.style.backgroundColor = 'transparent';
            });

            mergeUploadBox.addEventListener('drop', function(e) {
                e.preventDefault();
                this.style.borderColor = '#ccc';
                this.style.backgroundColor = 'transparent';
                
                if (e.dataTransfer.files.length > 0) {
                    handleMergeFiles(e.dataTransfer.files);
                }
            });

            // Process selected files
            function handleMergeFiles(files) {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type === 'application/pdf') {
                        mergeFiles.push(file);
                    }
                }
                
                updateMergeFileList();
            }

            // Update the file list display
            function updateMergeFileList() {
                mergeFileList.innerHTML = '';
                
                if (mergeFiles.length === 0) {
                    mergeFileList.innerHTML = '<p>No files selected</p>';
                    return;
                }
                
                mergeFiles.forEach((file, index) => {
                    const fileItem = document.createElement('div');
                    fileItem.className = 'file-item';
                    fileItem.innerHTML = `
                        <div class="file-info">
                            <i class="fas fa-file-pdf file-icon"></i>
                            <div>
                                <div class="file-name">${file.name}</div>
                                <div class="file-size">${formatFileSize(file.size)}</div>
                            </div>
                        </div>
                        <i class="fas fa-times file-remove" data-index="${index}"></i>
                    `;
                    mergeFileList.appendChild(fileItem);
                });
                
                // Add event listeners to remove buttons
                document.querySelectorAll('.file-remove').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const index = parseInt(this.getAttribute('data-index'));
                        mergeFiles.splice(index, 1);
                        updateMergeFileList();
                    });
                });
            }

            // Merge PDFs
            mergeBtn.addEventListener('click', async function() {
                if (mergeFiles.length < 2) {
                    showToast('Please select at least 2 PDF files to merge');
                    return;
                }
                
                mergeSpinner.style.display = 'block';
                mergeBtn.disabled = true;
                
                try {
                    let mergedPdf = await PDFLib.PDFDocument.create();
                    let filesToMerge = [...mergeFiles];
                    
                    // Handle custom order if selected
                    if (mergeOrder.value === 'custom') {
                        const customOrder = document.getElementById('custom-order').value;
                        if (!customOrder) {
                            showToast('Please specify custom order');
                            return;
                        }
                        
                        const orderArray = customOrder.split(',').map(num => parseInt(num.trim()) - 1);
                        filesToMerge = orderArray.map(index => mergeFiles[index]).filter(Boolean);
                        
                        if (filesToMerge.length !== mergeFiles.length) {
                            showToast('Invalid custom order specified');
                            return;
                        }
                    } else if (mergeOrder.value === 'reverse') {
                        filesToMerge.reverse();
                    }
                    
                    // Merge all PDFs
                    for (const file of filesToMerge) {
                        const arrayBuffer = await file.arrayBuffer();
                        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                        pages.forEach(page => mergedPdf.addPage(page));
                    }
                    
                    // Save merged PDF
                    const mergedPdfBytes = await mergedPdf.save();
                    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
                    saveAs(blob, 'merged.pdf');
                    
                    showToast('PDFs merged successfully!');
                } catch (error) {
                    console.error('Error merging PDFs:', error);
                    showToast('Error merging PDFs. Please try again.');
                } finally {
                    mergeSpinner.style.display = 'none';
                    mergeBtn.disabled = false;
                }
            });
            
            // Reset merge tool
            mergeReset.addEventListener('click', function() {
                mergeFiles = [];
                mergeFileInput.value = '';
                updateMergeFileList();
                mergeOrder.value = 'normal';
                customOrderContainer.style.display = 'none';
            });
        }

        // Split PDF Tool
        function initSplitTool() {
            const splitUploadBox = document.getElementById('split-upload-box');
            const splitFileInput = document.getElementById('split-file-input');
            const splitFileList = document.getElementById('split-file-list');
            const splitBtn = document.getElementById('split-btn');
            const splitReset = document.getElementById('split-reset');
            const splitSpinner = document.getElementById('split-spinner');
            const rangeContainer = document.getElementById('range-container');
            const intervalContainer = document.getElementById('interval-container');
            const splitModeRadios = document.querySelectorAll('input[name="split-mode"]');
            
            let splitFile = null;

            // Toggle between range and interval mode
            splitModeRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    if (this.value === 'range') {
                        rangeContainer.style.display = 'block';
                        intervalContainer.style.display = 'none';
                    } else {
                        rangeContainer.style.display = 'none';
                        intervalContainer.style.display = 'block';
                    }
                });
            });

            // Handle file upload via button
            splitUploadBox.addEventListener('click', function() {
                splitFileInput.click();
            });

            // Handle file selection
            splitFileInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (file.type === 'application/pdf') {
                        splitFile = file;
                        updateSplitFileList();
                    } else {
                        showToast('Please select a PDF file');
                    }
                }
            });

            // Handle drag and drop
            splitUploadBox.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.style.borderColor = '#4a6bff';
                this.style.backgroundColor = 'rgba(74, 107, 255, 0.05)';
            });

            splitUploadBox.addEventListener('dragleave', function() {
                this.style.borderColor = '#ccc';
                this.style.backgroundColor = 'transparent';
            });

            splitUploadBox.addEventListener('drop', function(e) {
                e.preventDefault();
                this.style.borderColor = '#ccc';
                this.style.backgroundColor = 'transparent';
                
                if (e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file.type === 'application/pdf') {
                        splitFile = file;
                        updateSplitFileList();
                    } else {
                        showToast('Please select a PDF file');
                    }
                }
            });

            // Update the file list display
            function updateSplitFileList() {
                splitFileList.innerHTML = '';
                
                if (!splitFile) {
                    splitFileList.innerHTML = '<p>No file selected</p>';
                    return;
                }
                
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <div class="file-info">
                        <i class="fas fa-file-pdf file-icon"></i>
                        <div>
                            <div class="file-name">${splitFile.name}</div>
                            <div class="file-size">${formatFileSize(splitFile.size)}</div>
                        </div>
                    </div>
                    <i class="fas fa-times file-remove" id="split-remove"></i>
                `;
                splitFileList.appendChild(fileItem);
                
                // Add event listener to remove button
                document.getElementById('split-remove').addEventListener('click', function() {
                    splitFile = null;
                    splitFileInput.value = '';
                    updateSplitFileList();
                });
            }

            // Split PDF
            splitBtn.addEventListener('click', async function() {
                if (!splitFile) {
                    showToast('Please select a PDF file to split');
                    return;
                }
                
                splitSpinner.style.display = 'block';
                splitBtn.disabled = true;
                
                try {
                    const arrayBuffer = await splitFile.arrayBuffer();
                    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                    const pageCount = pdfDoc.getPageCount();
                    
                    const splitMode = document.querySelector('input[name="split-mode"]:checked').value;
                    
                    if (splitMode === 'range') {
                        // Split by page range
                        const pageRange = document.getElementById('page-range').value;
                        if (!pageRange) {
                            showToast('Please specify page range');
                            return;
                        }
                        
                        const pagesToExtract = parsePageRange(pageRange, pageCount);
                        if (pagesToExtract.length === 0) {
                            showToast('Invalid page range specified');
                            return;
                        }
                        
                        // Create new PDF with selected pages
                        const newPdf = await PDFLib.PDFDocument.create();
                        const pages = await newPdf.copyPages(pdfDoc, pagesToExtract.map(i => i - 1));
                        pages.forEach(page => newPdf.addPage(page));
                        
                        const pdfBytes = await newPdf.save();
                        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                        saveAs(blob, `split_${splitFile.name}`);
                        
                        showToast('PDF split successfully!');
                    } else {
                        // Split by interval
                        const interval = parseInt(document.getElementById('split-interval-value').value);
                        if (isNaN(interval) || interval < 1 || interval > pageCount) {
                            showToast('Invalid interval specified');
                            return;
                        }
                        
                        // Split into multiple PDFs
                        for (let i = 0; i < pageCount; i += interval) {
                            const end = Math.min(i + interval, pageCount);
                            const newPdf = await PDFLib.PDFDocument.create();
                            const pages = await newPdf.copyPages(pdfDoc, Array.from({length: end - i}, (_, j) => i + j));
                            pages.forEach(page => newPdf.addPage(page));
                            
                            const pdfBytes = await newPdf.save();
                            const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                            saveAs(blob, `split_${i+1}-${end}_${splitFile.name}`);
                        }
                        
                        showToast(`PDF split into ${Math.ceil(pageCount / interval)} files!`);
                    }
                } catch (error) {
                    console.error('Error splitting PDF:', error);
                    showToast('Error splitting PDF. Please try again.');
                } finally {
                    splitSpinner.style.display = 'none';
                    splitBtn.disabled = false;
                }
            });
            
            // Reset split tool
            splitReset.addEventListener('click', function() {
                splitFile = null;
                splitFileInput.value = '';
                updateSplitFileList();
                document.getElementById('split-range').checked = true;
                rangeContainer.style.display = 'block';
                intervalContainer.style.display = 'none';
                document.getElementById('page-range').value = '';
                document.getElementById('split-interval-value').value = '1';
            });
        }

        // Compress PDF Tool
        function initCompressTool() {
            const compressUploadBox = document.getElementById('compress-upload-box');
            const compressFileInput = document.getElementById('compress-file-input');
            const compressFileList = document.getElementById('compress-file-list');
            const compressBtn = document.getElementById('compress-btn');
            const compressReset = document.getElementById('compress-reset');
            const compressSpinner = document.getElementById('compress-spinner');
            const compressionLevel = document.getElementById('compression-level');
            const compressionLevelValue = document.getElementById('compression-level-value');
            const outputQuality = document.getElementById('output-quality');
            const outputQualityValue = document.getElementById('output-quality-value');
            
            let compressFile = null;

            // Update compression level display
            compressionLevel.addEventListener('input', function() {
                const levels = ['Low Compression', 'Medium Compression', 'High Compression'];
                compressionLevelValue.textContent = levels[this.value - 1];
            });

            // Update quality display
            outputQuality.addEventListener('input', function() {
                outputQualityValue.textContent = `${this.value}%`;
            });

            // Handle file upload via button
            compressUploadBox.addEventListener('click', function() {
                compressFileInput.click();
            });

            // Handle file selection
            compressFileInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    if (file.type === 'application/pdf') {
                        compressFile = file;
                        updateCompressFileList();
                    } else {
                        showToast('Please select a PDF file');
                    }
                }
            });

            // Handle drag and drop
            compressUploadBox.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.style.borderColor = '#4a6bff';
                this.style.backgroundColor = 'rgba(74, 107, 255, 0.05)';
            });

            compressUploadBox.addEventListener('dragleave', function() {
                this.style.borderColor = '#ccc';
                this.style.backgroundColor = 'transparent';
            });

            compressUploadBox.addEventListener('drop', function(e) {
                e.preventDefault();
                this.style.borderColor = '#ccc';
                this.style.backgroundColor = 'transparent';
                
                if (e.dataTransfer.files.length > 0) {
                    const file = e.dataTransfer.files[0];
                    if (file.type === 'application/pdf') {
                        compressFile = file;
                        updateCompressFileList();
                    } else {
                        showToast('Please select a PDF file');
                    }
                }
            });

            // Update the file list display
            function updateCompressFileList() {
                compressFileList.innerHTML = '';
                
                if (!compressFile) {
                    compressFileList.innerHTML = '<p>No file selected</p>';
                    return;
                }
                
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <div class="file-info">
                        <i class="fas fa-file-pdf file-icon"></i>
                        <div>
                            <div class="file-name">${compressFile.name}</div>
                            <div class="file-size">${formatFileSize(compressFile.size)}</div>
                        </div>
                    </div>
                    <i class="fas fa-times file-remove" id="compress-remove"></i>
                `;
                compressFileList.appendChild(fileItem);
                
                // Add event listener to remove button
                document.getElementById('compress-remove').addEventListener('click', function() {
                    compressFile = null;
                    compressFileInput.value = '';
                    updateCompressFileList();
                });
            }

            // Compress PDF
// Replace the existing compressBtn click handler with this:
compressBtn.addEventListener('click', async function() {
    if (!compressFile) {
        showToast('Please select a PDF file to compress');
        return;
    }
    
    compressSpinner.style.display = 'block';
    compressBtn.disabled = true;
    
    try {
        // Get quality setting from slider (convert from 50-100 range to 0.5-1.0)
        const quality = parseInt(document.getElementById('output-quality').value) / 100;
        
        // Perform the compression
        const pdfBytes = await compressPDFWithPDFJS(compressFile, quality);
        
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        saveAs(blob, `compressed_${compressFile.name}`);
        
        // Show compression results
        const originalSize = compressFile.size;
        const compressedSize = blob.size;
        const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
        
        showToast(`PDF compressed successfully! Reduced by ${reduction}% (${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)})`);
    } catch (error) {
        console.error('Error compressing PDF:', error);
        showToast('Error compressing PDF. Please try again.');
    } finally {
        compressSpinner.style.display = 'none';
        compressBtn.disabled = false;
    }
});
            
            // Reset compress tool
            compressReset.addEventListener('click', function() {
                compressFile = null;
                compressFileInput.value = '';
                updateCompressFileList();
                compressionLevel.value = '2';
                compressionLevelValue.textContent = 'Medium Compression';
                outputQuality.value = '85';
                outputQualityValue.textContent = '85%';
            });
        }

        // Helper functions
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function parsePageRange(rangeStr, maxPages) {
            if (!rangeStr) return [];
            
            const parts = rangeStr.split(',');
            const pages = new Set();
            
            for (const part of parts) {
                if (part.includes('-')) {
                    const [start, end] = part.split('-').map(num => parseInt(num.trim()));
                    if (isNaN(start) || isNaN(end) || start < 1 || end > maxPages || start > end) {
                        return [];
                    }
                    
                    for (let i = start; i <= end; i++) {
                        pages.add(i);
                    }
                } else {
                    const num = parseInt(part.trim());
                    if (isNaN(num) || num < 1 || num > maxPages) {
                        return [];
                    }
                    pages.add(num);
                }
            }
            
            return Array.from(pages).sort((a, b) => a - b);
        }
