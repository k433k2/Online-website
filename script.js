document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const toolCards = document.querySelectorAll('.tool-card');
    const uploadArea = document.getElementById('uploadArea');
    const browseFilesBtn = document.getElementById('browseFiles');
    const fileInput = document.getElementById('fileInput');
    const toolModal = document.getElementById('toolModal');
    const closeModal = document.querySelector('.close-modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalUploadArea = document.getElementById('modalUploadArea');
    const modalBrowseFiles = document.getElementById('modalBrowseFiles');
    const modalFileInput = document.getElementById('modalFileInput');
    const fileList = document.getElementById('fileList');
    const processBtn = document.getElementById('processBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const resultContainer = document.getElementById('resultContainer');
    const loginBtn = document.getElementById('loginBtn');
    
    let currentTool = '';
    let selectedFiles = [];
    
    // Tool Card Click Handlers
    toolCards.forEach(card => {
        card.addEventListener('click', function() {
            currentTool = this.getAttribute('data-tool');
            openToolModal(currentTool);
        });
    });
    
    // Open Tool Modal
    function openToolModal(tool) {
        const toolTitles = {
            'merge': 'Merge PDF Files',
            'split': 'Split PDF File',
            'compress': 'Compress PDF File',
            'word': 'Convert PDF to Word',
            'excel': 'Convert PDF to Excel',
            'convert': 'Convert PDF File'
        };
        
        modalTitle.textContent = toolTitles[tool] || 'PDF Tool';
        toolModal.style.display = 'flex';
        
        // Reset modal content
        fileList.innerHTML = '';
        selectedFiles = [];
        processBtn.style.display = 'none';
        progressContainer.style.display = 'none';
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';
        
        // Reset process button
        processBtn.textContent = 'Process Files';
        processBtn.disabled = false;
        processBtn.onclick = processFiles;
    }
    
    // Close Modal
    closeModal.addEventListener('click', function() {
        toolModal.style.display = 'none';
    });
    
    // Click outside modal to close
    window.addEventListener('click', function(event) {
        if (event.target === toolModal) {
            toolModal.style.display = 'none';
        }
    });
    
    // File Upload Handling
    function setupFileUpload(uploadArea, fileInput, callback) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // Highlight drop area when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            uploadArea.style.borderColor = 'var(--primary)';
            uploadArea.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
        }
        
        function unhighlight() {
            uploadArea.style.borderColor = '#dee2e6';
            uploadArea.style.backgroundColor = 'white';
        }
        
        // Handle dropped files
        uploadArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            callback(files);
        }
        
        // Handle file input
        fileInput.addEventListener('change', function() {
            callback(this.files);
        });
    }
    
    // Main upload area
    setupFileUpload(uploadArea, fileInput, function(files) {
        if (files.length > 0) {
            openToolModal('merge');
            handleFiles(files);
        }
    });
    
    // Modal upload area
    setupFileUpload(modalUploadArea, modalFileInput, function(files) {
        if (files.length > 0) {
            handleFiles(files);
        }
    });
    
    // Browse files buttons
    browseFilesBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    modalBrowseFiles.addEventListener('click', function() {
        modalFileInput.click();
    });
    
    // Handle selected files
    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => 
            file.type === 'application/pdf' || file.name.endsWith('.pdf')
        );
        
        if (newFiles.length === 0) {
            alert('Please select PDF files only.');
            return;
        }
        
        selectedFiles = [...selectedFiles, ...newFiles];
        displayFileList();
        
        if (selectedFiles.length > 0) {
            processBtn.style.display = 'block';
        }
    }
    
    // Display list of selected files
    function displayFileList() {
        fileList.innerHTML = '<h3>Selected Files:</h3>';
        
        if (selectedFiles.length === 0) {
            fileList.innerHTML += '<p>No files selected</p>';
            return;
        }
        
        const list = document.createElement('ul');
        list.style.listStyleType = 'none';
        list.style.padding = '0';
        
        selectedFiles.forEach((file, index) => {
            const item = document.createElement('li');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.marginBottom = '10px';
            item.style.padding = '10px';
            item.style.backgroundColor = '#f8f9fa';
            item.style.borderRadius = '5px';
            
            const fileInfo = document.createElement('div');
            fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;
            
            const removeBtn = document.createElement('button');
            removeBtn.textContent = 'Remove';
            removeBtn.classList.add('btn');
            removeBtn.style.backgroundColor = 'var(--danger)';
            removeBtn.style.borderColor = 'var(--danger)';
            
            removeBtn.addEventListener('click', function() {
                selectedFiles.splice(index, 1);
                displayFileList();
                
                if (selectedFiles.length === 0) {
                    processBtn.style.display = 'none';
                }
            });
            
            item.appendChild(fileInfo);
            item.appendChild(removeBtn);
            list.appendChild(item);
        });
        
        fileList.appendChild(list);
    }
    
    // Format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Process files
    function processFiles() {
        if (selectedFiles.length === 0) return;
        
        // Disable button during processing
        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';
        progressContainer.style.display = 'block';
        
        // Simulate processing with progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            progressBar.style.width = `${progress}%`;
            
            if (progress >= 100) {
                clearInterval(interval);
                processComplete();
            }
        }, 200);
    }
    
    // Process complete handler
    function processComplete() {
        progressBar.style.backgroundColor = 'var(--success)';
        resultContainer.style.display = 'block';
        
        // Show different results based on tool
        switch(currentTool) {
            case 'merge':
                resultContainer.innerHTML = `
                    <h3>Merge Complete!</h3>
                    <p>Your ${selectedFiles.length} PDF files have been merged successfully.</p>
                    <button class="btn btn-primary" id="downloadBtn">Download Merged PDF</button>
                `;
                break;
            case 'split':
                resultContainer.innerHTML = `
                    <h3>Split Complete!</h3>
                    <p>Your PDF has been split into ${selectedFiles[0].pageCount || 'multiple'} files.</p>
                    <button class="btn btn-primary" id="downloadBtn">Download Split Files</button>
                `;
                break;
            case 'compress':
                const originalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
                const compressedSize = originalSize * 0.6; // Simulate 40% reduction
                resultContainer.innerHTML = `
                    <h3>Compression Complete!</h3>
                    <p>Reduced from ${formatFileSize(originalSize)} to ${formatFileSize(compressedSize)} (${Math.round((1 - compressedSize/originalSize)*100)}% smaller)</p>
                    <button class="btn btn-primary" id="downloadBtn">Download Compressed PDF</button>
                `;
                break;
            default:
                resultContainer.innerHTML = `
                    <h3>Conversion Complete!</h3>
                    <p>Your PDF has been converted to ${currentTool === 'word' ? 'Word' : currentTool === 'excel' ? 'Excel' : 'the selected format'}.</p>
                    <button class="btn btn-primary" id="downloadBtn">Download Converted File</button>
                `;
        }
        
        // Set up download button
        document.getElementById('downloadBtn').addEventListener('click', function() {
            alert('In a real implementation, this would download the processed file.');
            toolModal.style.display = 'none';
            
            // Reset modal after delay
            setTimeout(() => {
                progressBar.style.width = '0%';
                progressBar.style.backgroundColor = 'var(--primary)';
                processBtn.textContent = 'Process Files';
                processBtn.disabled = false;
                fileList.innerHTML = '';
                selectedFiles = [];
                processBtn.style.display = 'none';
                progressContainer.style.display = 'none';
                resultContainer.style.display = 'none';
                resultContainer.innerHTML = '';
            }, 500);
        });
    }
    
    // Login button handler
    loginBtn.addEventListener('click', function(e) {
        e.preventDefault();
        alert('Login functionality would be implemented here in a production app.');
    });
});
