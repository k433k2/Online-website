document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const toolCards = document.querySelectorAll('.tool-card');
    const uploadArea = document.getElementById('uploadArea');
    const browseFilesBtn = document.getElementById('browseFiles');
    const fileInput = document.getElementById('fileInput');
    const toolModal = document.getElementById('toolModal');
    const closeModal = document.querySelectorAll('.close-modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalUploadArea = document.getElementById('modalUploadArea');
    const modalBrowseFiles = document.getElementById('modalBrowseFiles');
    const modalFileInput = document.getElementById('modalFileInput');
    const fileList = document.getElementById('fileList');
    const processBtn = document.getElementById('processBtn');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const resultContainer = document.getElementById('resultContainer');
    const authModal = document.getElementById('authModal');
    const filesModal = document.getElementById('filesModal');
    const filesList = document.getElementById('filesList');
    
    let currentTool = '';
    let selectedFiles = [];
    
    // Tool Card Click Handlers
    toolCards.forEach(card => {
        card.addEventListener('click', function() {
            if (!currentUser) {
                showAlert('Please login to use this feature', 'error');
                authModal.style.display = 'flex';
                return;
            }
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
    closeModal.forEach(btn => {
        btn.addEventListener('click', function() {
            toolModal.style.display = 'none';
            authModal.style.display = 'none';
            filesModal.style.display = 'none';
        });
    });
    
    // Click outside modal to close
    window.addEventListener('click', function(event) {
        if (event.target === toolModal) toolModal.style.display = 'none';
        if (event.target === authModal) authModal.style.display = 'none';
        if (event.target === filesModal) filesModal.style.display = 'none';
    });
    
    // File Upload Handling
    function setupFileUpload(uploadArea, fileInput, callback) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
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
        
        uploadArea.addEventListener('drop', handleDrop, false);
        
        function handleDrop(e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            callback(files);
        }
        
        fileInput.addEventListener('change', function() {
            callback(this.files);
        });
    }
    
    // Setup file upload areas
    setupFileUpload(uploadArea, fileInput, function(files) {
        if (files.length > 0) {
            if (!currentUser) {
                showAlert('Please login to use this feature', 'error');
                authModal.style.display = 'flex';
                return;
            }
            openToolModal('merge');
            handleFiles(files);
        }
    });
    
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
            showAlert('Please select PDF files only.', 'error');
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
        
        // Validate files based on tool
        if (currentTool === 'merge' && selectedFiles.length < 2) {
            showAlert('Please select at least 2 files to merge', 'error');
            return;
        }
        
        // Disable button during processing
        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';
        progressContainer.style.display = 'block';
        
        // Simulate progress
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
   async function processComplete() {
    progressBar.style.backgroundColor = 'var(--success)';
    resultContainer.style.display = 'block';

    try {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));
        
        formData.append('tool', currentTool);
        
        const token = localStorage.getItem('token');
        if (token) {
            formData.append('token', token);
        }

        // Show processing status
        resultContainer.innerHTML = `
            <div class="processing-status">
                <h3>Processing your files...</h3>
                <p>Please wait while we prepare your download.</p>
                <div class="progress-container">
                    <div class="progress-bar" style="width: 100%"></div>
                </div>
            </div>
        `;

        const response = await fetch(`/api/${currentTool}`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        // Create download link
        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        
        // Set appropriate filename
        let filename = 'document';
        switch(currentTool) {
            case 'merge': filename = 'merged.pdf'; break;
            case 'split': filename = 'split_pages.zip'; break;
            case 'compress': filename = 'compressed.pdf'; break;
            case 'word': filename = 'converted.docx'; break;
            case 'excel': filename = 'converted.xlsx'; break;
            default: filename = 'converted.pdf';
        }

        // Show download options
        resultContainer.innerHTML = `
            <div class="download-options">
                <h3>Your file is ready!</h3>
                <p>Processed ${selectedFiles.length} file(s) successfully.</p>
                
                <div class="download-buttons">
                    <button id="autoDownloadBtn" class="btn btn-primary">
                        <i class="download-icon">↓</i> Download Now
                    </button>
                    <button id="manualDownloadBtn" class="btn btn-secondary">
                        Download Later
                    </button>
                </div>
                
                <div class="additional-options">
                    <a href="#" id="saveToAccount" class="save-option">
                        <i class="save-icon">💾</i> Save to My Account
                    </a>
                </div>
            </div>
        `;

        // Auto-download after short delay
        setTimeout(() => {
            const autoDownloadBtn = document.getElementById('autoDownloadBtn');
            if (autoDownloadBtn) autoDownloadBtn.click();
        }, 1000);

        // Set up download buttons
        document.getElementById('autoDownloadBtn').addEventListener('click', (e) => {
            e.preventDefault();
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Show success message
            resultContainer.innerHTML += `
                <div class="alert alert-success">
                    Download started! Check your downloads folder.
                </div>
            `;
        });

        document.getElementById('manualDownloadBtn').addEventListener('click', (e) => {
            e.preventDefault();
            resultContainer.innerHTML += `
                <div class="download-link">
                    <p>Your download link:</p>
                    <a href="${downloadUrl}" download="${filename}" class="btn btn-primary">
                        Click to Download
                    </a>
                    <p class="small">Link valid for 24 hours</p>
                </div>
            `;
        });

        // Save to account functionality
        if (currentUser) {
            document.getElementById('saveToAccount').addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    const saveResponse = await fetch('/api/files/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            tool: currentTool,
                            
    
    // Show alert message
    function showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        document.body.prepend(alertDiv);
        setTimeout(() => alertDiv.remove(), 3000);
    }
    
    // Load user files
    async function loadUserFiles() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const response = await fetch('/api/auth/validate', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const filesResponse = await fetch('/api/files', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (filesResponse.ok) {
                    const files = await filesResponse.json();
                    displayUserFiles(files);
                }
            }
        } catch (err) {
            console.error('Error loading user files:', err);
        }
    }
    
    // Display user files
    function displayUserFiles(files) {
        filesList.innerHTML = '';
        
        if (files.length === 0) {
            filesList.innerHTML = '<p>No files found</p>';
            return;
        }
        
        const list = document.createElement('ul');
        list.style.listStyleType = 'none';
        list.style.padding = '0';
        
        files.forEach(file => {
            const item = document.createElement('li');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.marginBottom = '10px';
            item.style.padding = '10px';
            item.style.backgroundColor = '#f8f9fa';
            item.style.borderRadius = '5px';
            
            const fileInfo = document.createElement('div');
            fileInfo.innerHTML = `
                <strong>${file.toolType.toUpperCase()}</strong><br>
                ${file.originalName}<br>
                <small>${new Date(file.createdAt).toLocaleString()}</small>
            `;
            
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = 'Download';
            downloadBtn.classList.add('btn', 'btn-primary');
            downloadBtn.style.padding = '5px 10px';
            
            downloadBtn.addEventListener('click', async () => {
                try {
                    const token = localStorage.getItem('token');
                    const response = await fetch(`/api/files/${file._id}`, {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const blob = await response.blob();
                        const downloadUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = file.processedName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(downloadUrl);
                    }
                } catch (err) {
                    console.error('Download error:', err);
                    showAlert('Failed to download file', 'error');
                }
            });
            
            item.appendChild(fileInfo);
            item.appendChild(downloadBtn);
            list.appendChild(item);
        });
        
        filesList.appendChild(list);
    }
    
    // My Files button click handler
    document.getElementById('myFiles')?.addEventListener('click', async (e) => {
        e.preventDefault();
        filesModal.style.display = 'flex';
        await loadUserFiles();
    });
});
