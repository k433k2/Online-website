document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadArea = document.getElementById('uploadArea');
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');
    const toolCards = document.querySelectorAll('.tool-card');
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const loginBtn = document.getElementById('loginBtn');
    
    let currentTool = '';
    let selectedFiles = [];
    
    // Tool selection
    toolCards.forEach(card => {
        card.addEventListener('click', function() {
            currentTool = this.getAttribute('data-tool');
            if (selectedFiles.length > 0) {
                processFiles();
            } else {
                alert('Please select files first');
            }
        });
    });
    
    // File upload handling
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#dee2e6';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#dee2e6';
        handleFiles(e.dataTransfer.files);
    });
    
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));
    
    function handleFiles(files) {
        selectedFiles = Array.from(files).filter(file => 
            file.type === 'application/pdf' || file.name.endsWith('.pdf')
        );
        
        if (selectedFiles.length > 0) {
            uploadArea.innerHTML = `
                <h3>${selectedFiles.length} file(s) selected</h3>
                <p>Choose an action below</p>
            `;
        } else {
            alert('Please select PDF files only');
        }
    }
    
    // Process files
    async function processFiles() {
        if (!currentTool) return;
        
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('files', file));
        
        try {
            const token = localStorage.getItem('token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;
            
            const response = await fetch(`/api/${currentTool}`, {
                method: 'POST',
                headers,
                body: formData
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                
                // Set appropriate filename
                let filename = 'document';
                switch(currentTool) {
                    case 'merge': filename = 'merged.pdf'; break;
                    case 'split': filename = 'split_pages.zip'; break;
                    case 'compress': filename = 'compressed.pdf'; break;
                    case 'word': filename = 'converted.docx'; break;
                    case 'excel': filename = 'converted.xlsx'; break;
                }
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Processing failed');
            }
        } catch (err) {
            alert(err.message);
        }
    }
    
    // Authentication
    loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        authModal.style.display = 'flex';
    });
    
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = e.target[0].value;
        const password = e.target[1].value;
        
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            if (response.ok) {
                const { token } = await response.json();
                localStorage.setItem('token', token);
                authModal.style.display = 'none';
                loginBtn.textContent = 'My Account';
            } else {
                throw new Error('Login failed');
            }
        } catch (err) {
            alert(err.message);
        }
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });
});
