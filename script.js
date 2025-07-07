document.addEventListener('DOMContentLoaded', function () {
    // === DOM Elements ===
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
    const authModal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignup = document.getElementById('showSignup');
    const showLogin = document.getElementById('showLogin');
    const registerForm = document.getElementById('registerUser');
    const loginUserForm = document.getElementById('loginUser');
    const userDropdown = document.getElementById('userDropdown');
    const userNameSpan = document.getElementById('userName');
    const logoutBtn = document.getElementById('logoutBtn');
    const myFilesBtn = document.getElementById('myFiles');
    const authForms = document.getElementById('authForms'); // Missing earlier

    let currentTool = '';
    let selectedFiles = [];
    let currentUser = null;

    // === Tool Card Click Handler ===
    toolCards.forEach(card => {
        card.addEventListener('click', function () {
            currentTool = this.getAttribute('data-tool');
            openToolModal(currentTool);
        });
    });

    // === Modal ===
    closeModal.addEventListener('click', () => toolModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === toolModal || e.target === authModal) {
            toolModal.style.display = 'none';
            authModal.style.display = 'none';
        }
    });

    // === Tool Modal Logic ===
    function openToolModal(tool) {
        const titles = {
            merge: 'Merge PDF Files',
            split: 'Split PDF File',
            compress: 'Compress PDF File',
            word: 'Convert PDF to Word',
            excel: 'Convert PDF to Excel',
            convert: 'Convert PDF File'
        };
        modalTitle.textContent = titles[tool] || 'PDF Tool';
        toolModal.style.display = 'flex';
        selectedFiles = [];
        fileList.innerHTML = '';
        processBtn.style.display = 'none';
        resultContainer.style.display = 'none';
        resultContainer.innerHTML = '';
        progressContainer.style.display = 'none';
        progressBar.style.width = '0%';
        processBtn.disabled = false;
        processBtn.textContent = 'Process Files';
        processBtn.onclick = processFiles;
    }

    // === File Upload ===
    setupFileUpload(uploadArea, fileInput, files => {
        openToolModal('merge');
        handleFiles(files);
    });

    setupFileUpload(modalUploadArea, modalFileInput, handleFiles);

    browseFilesBtn.addEventListener('click', () => fileInput.click());
    modalBrowseFiles.addEventListener('click', () => modalFileInput.click());

    function setupFileUpload(area, input, callback) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event =>
            area.addEventListener(event, e => {
                e.preventDefault();
                e.stopPropagation();
            })
        );

        ['dragenter', 'dragover'].forEach(e =>
            area.addEventListener(e, () => {
                area.style.borderColor = 'var(--primary)';
                area.style.backgroundColor = 'rgba(67, 97, 238, 0.1)';
            })
        );

        ['dragleave', 'drop'].forEach(e =>
            area.addEventListener(e, () => {
                area.style.borderColor = '#dee2e6';
                area.style.backgroundColor = 'white';
            })
        );

        area.addEventListener('drop', e => callback(e.dataTransfer.files));
        input.addEventListener('change', () => callback(input.files));
    }

    function handleFiles(files) {
        const newFiles = Array.from(files).filter(file => file.type === 'application/pdf');
        if (newFiles.length === 0) return alert('Please select only PDF files.');
        selectedFiles = [...selectedFiles, ...newFiles];
        displayFileList();
        if (selectedFiles.length > 0) processBtn.style.display = 'block';
    }

    function displayFileList() {
        fileList.innerHTML = '<h3>Selected Files:</h3>';
        const list = document.createElement('ul');
        list.style.listStyle = 'none';
        selectedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                ${file.name} (${formatFileSize(file.size)})
                <button class="btn" style="background: var(--danger); border: none;">Remove</button>
            `;
            li.querySelector('button').onclick = () => {
                selectedFiles.splice(index, 1);
                displayFileList();
                if (selectedFiles.length === 0) processBtn.style.display = 'none';
            };
            list.appendChild(li);
        });
        fileList.appendChild(list);
    }

    function formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function processFiles() {
        if (selectedFiles.length === 0) return;
        processBtn.disabled = true;
        processBtn.textContent = 'Processing...';
        progressContainer.style.display = 'block';
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressBar.style.width = `${progress}%`;
            if (progress >= 100) {
                clearInterval(interval);
                processComplete();
            }
        }, 150);
    }

    async function processComplete() {
        progressBar.style.backgroundColor = 'var(--success)';
        resultContainer.style.display = 'block';

        try {
            const formData = new FormData();
            selectedFiles.forEach(file => formData.append('files', file));
            formData.append('tool', currentTool);

            const token = localStorage.getItem('token');
            if (token) formData.append('token', token);

            const response = await fetch(`/api/${currentTool}`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error(await response.text());

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const filenames = {
                merge: 'merged.pdf',
                split: 'split_pages.zip',
                compress: 'compressed.pdf',
                word: 'converted.docx',
                excel: 'converted.xlsx'
            };
            a.download = filenames[currentTool] || 'converted.pdf';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            resultContainer.innerHTML = `
                <h3>Process Complete!</h3>
                <p>Your file has been processed successfully.</p>
                <p>If the download didn't start, <a href="#" id="manualDownload">click here</a>.</p>
                <button class="btn btn-primary" onclick="document.getElementById('toolModal').style.display='none'">Close</button>
            `;

            document.getElementById('manualDownload').onclick = e => {
                e.preventDefault();
                a.click();
            };
        } catch (err) {
            console.error('Processing error:', err);
            resultContainer.innerHTML = `
                <h3>Error</h3>
                <p>${err.message || 'File processing failed.'}</p>
                <button class="btn btn-primary" onclick="document.getElementById('toolModal').style.display='none'">Close</button>
            `;
        } finally {
            processBtn.disabled = false;
            processBtn.textContent = 'Process Files';
        }
    }

    // === Authentication ===
    const token = localStorage.getItem('token');
    if (token) validateToken(token);

    loginBtn.addEventListener('click', e => {
        e.preventDefault();
        authModal.style.display = 'flex';
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    });

    showSignup.addEventListener('click', e => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    showLogin.addEventListener('click', e => {
        e.preventDefault();
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    });

    loginUserForm.addEventListener('submit', async e => {
        e.preventDefault();
        const credentials = {
            email: document.getElementById('loginEmail').value,
            password: document.getElementById('loginPassword').value
        };
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentUser(data.user, data.token);
                authModal.style.display = 'none';
                showSuccess('Login successful!');
            } else showError(data.message || 'Login failed');
        } catch {
            showError('Network error.');
        }
    });

    registerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const user = {
            name: document.getElementById('registerName').value,
            email: document.getElementById('registerEmail').value,
            password: document.getElementById('registerPassword').value
        };
        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(user)
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentUser(data.user, data.token);
                authModal.style.display = 'none';
                showSuccess('Registration successful!');
            } else showError(data.message || 'Registration failed');
        } catch {
            showError('Network error.');
        }
    });

    logoutBtn.addEventListener('click', () => logoutUser());

    async function validateToken(token) {
        try {
            const res = await fetch('/api/auth/validate', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const user = await res.json();
                setCurrentUser(user, token);
            } else localStorage.removeItem('token');
        } catch (err) {
            console.error('Token validation failed:', err);
        }
    }

    function setCurrentUser(user, token) {
        currentUser = user;
        localStorage.setItem('token', token);
        updateUI();
    }

    function logoutUser() {
        currentUser = null;
        localStorage.removeItem('token');
        updateUI();
        showSuccess('Logged out successfully');
    }

    function updateUI() {
        if (currentUser) {
            loginBtn.style.display = 'none';
            userDropdown.style.display = 'inline-block';
            userNameSpan.textContent = currentUser.name;
        } else {
            loginBtn.style.display = 'block';
            userDropdown.style.display = 'none';
        }
    }

    function showError(msg) {
        const div = document.createElement('div');
        div.className = 'alert alert-error';
        div.textContent = msg;
        authForms.prepend(div);
        setTimeout(() => div.remove(), 3000);
    }

    function showSuccess(msg) {
        const div = document.createElement('div');
        div.className = 'alert alert-success';
        div.textContent = msg;
        document.body.prepend(div);
        setTimeout(() => div.remove(), 3000);
    }
});
