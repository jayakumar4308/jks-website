// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminMenu = document.getElementById('adminMenu');
const roleText = document.getElementById('roleText');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// State
let currentUserRole = localStorage.getItem('userRole') || null;

// Initialization
window.onload = () => {
    if (currentUserRole) {
        handleAuthSuccess(currentUserRole);
    } else {
        let msg = new SpeechSynthesisUtterance("welcome to JKS login");
        speechSynthesis.speak(msg);
    }
};

// Voice Greeting Helper
function speakGreeting(role) {
    setTimeout(() => {
        let msg = new SpeechSynthesisUtterance(`Welcome to JKS website, ${role}`);
        speechSynthesis.speak(msg);
    }, 300);
}

function handleAuthSuccess(role) {
    currentUserRole = role;
    localStorage.setItem('userRole', role);
    loginScreen.style.display = "none";
    
    if (role === "admin") {
        roleText.innerText = "Admin";
        adminMenu.style.display = "block";
    } else {
        roleText.innerText = "Guest";
        adminMenu.style.display = "none";
    }

    speakGreeting(role === "admin" ? "Admin" : "Guest");
    loadBooks();
    loadRecords();
}

// ==========================================
// AUTHENTICATION
// ==========================================

// Login Button Click
document.getElementById('loginBtn').addEventListener('click', async () => {
    let u = usernameInput.value.trim();
    let p = passwordInput.value;

    if (!u || !p) {
        alert("Please enter username/email and password.");
        return;
    }

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await response.json();

        if (data.success) {
            handleAuthSuccess(data.role);
        } else {
            alert("Invalid Login: " + data.message);
        }
    } catch (error) {
        console.error("Login error:", error);
        alert("Server error during login.");
    }
});

// Logout Button Click
document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUserRole = null;
    localStorage.removeItem('userRole');
    loginScreen.style.display = "flex";
    showPage('welcome');
    let msg = new SpeechSynthesisUtterance("Logged out. Welcome to JKS login");
    speechSynthesis.speak(msg);
});

// Forgot Password
document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
    alert("Since this is a custom manual backend, password recovery via email is not set up. Please contact the system administrator.");
});

// ==========================================
// PAGE NAVIGATION
// ==========================================
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

document.getElementById('navWelcome').addEventListener('click', () => showPage('welcome'));
document.getElementById('navBooks').addEventListener('click', () => showPage('books'));
document.getElementById('navRecords').addEventListener('click', () => showPage('records'));
document.getElementById('navContact').addEventListener('click', () => showPage('contact'));
document.getElementById('navUpload').addEventListener('click', () => showPage('upload'));
document.getElementById('navSettings').addEventListener('click', () => showPage('settings'));

// Make delete function globally available for inline HTML onclick handlers
window.deleteItem = async function(type, docId) {
    if (currentUserRole !== 'admin') {
        alert("Only admins can delete files.");
        return;
    }

    if (!confirm("Are you sure you want to delete this?")) return;

    try {
        const response = await fetch(`/api/${type}/${docId}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            if (type === 'books') loadBooks();
            if (type === 'records') loadRecords();
        } else {
            alert("Failed to delete: " + data.error);
        }
    } catch (error) {
        alert("Error deleting: " + error.message);
    }
}

// ==========================================
// DATABASE & STORAGE LOGIC
// ==========================================

// Load Books
async function loadBooks() {
    try {
        const res = await fetch('/api/books');
        const books = await res.json();
        renderItems(books, 'booksContainer', 'noBooks', 'No Books Uploaded Yet.', 'books');
    } catch (error) {
        console.error("Error loading books:", error);
    }
}

// Load Records
async function loadRecords() {
    try {
        const res = await fetch('/api/records');
        const records = await res.json();
        renderItems(records, 'recordsContainer', 'noRecords', 'No Records Uploaded Yet.', 'records', 'View');
    } catch (error) {
        console.error("Error loading records:", error);
    }
}

function renderItems(items, containerId, msgId, emptyMsg, type, linkText = 'Download') {
    const container = document.getElementById(containerId);
    const noMsg = document.getElementById(msgId);
    
    container.innerHTML = "";
    if (items.length === 0) {
        noMsg.style.display = "block";
        noMsg.innerText = emptyMsg;
    } else {
        noMsg.style.display = "none";
        items.forEach((item) => {
            container.innerHTML += `
            <div class="card-box">
            <h3>${item.name}</h3>
            <a href="${item.url}" target="_blank">${linkText}</a>
            ${currentUserRole === 'admin' ? `<button class="deleteBtn" onclick="deleteItem('${type}', '${item.id}')">Delete</button>` : ''}
            </div>`;
        });
    }
}

// Reusable Upload Function
async function uploadFile(fileInputId, nameInputId, statusId, type) {
    const nameInput = document.getElementById(nameInputId);
    const fileInput = document.getElementById(fileInputId);
    const statusMsg = document.getElementById(statusId);

    const name = nameInput.value;
    const file = fileInput.files[0];

    if (!name || !file) {
        alert("Please provide a name and select a file.");
        return;
    }

    statusMsg.innerText = "Uploading... please wait.";
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);

    try {
        const response = await fetch(`/api/upload/${type}`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            statusMsg.innerText = "Upload successful!";
            nameInput.value = "";
            fileInput.value = "";
            
            // Refresh list
            if (type === 'books') loadBooks();
            if (type === 'records') loadRecords();

            setTimeout(() => { statusMsg.innerText = ""; }, 3000);
        } else {
            statusMsg.innerText = "Upload failed: " + data.error;
        }
    } catch (error) {
        console.error("Upload error:", error);
        statusMsg.innerText = "Upload failed: Server error.";
    }
}

// Upload Book Click
document.getElementById('uploadBookBtn').addEventListener('click', () => {
    uploadFile('bookFile', 'bookName', 'bookUploadStatus', 'books');
});

// Upload Record Click
document.getElementById('uploadRecordBtn').addEventListener('click', () => {
    uploadFile('recordFile', 'recordName', 'recordUploadStatus', 'records');
});

// Change Password
document.getElementById('changePassBtn').addEventListener('click', async () => {
    const oldPass = document.getElementById('oldPass').value;
    const newPass = document.getElementById('newPass').value;

    if (!oldPass || !newPass) {
        alert("Please enter both old and new passwords.");
        return;
    }

    try {
        const response = await fetch('/api/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
        });
        const data = await response.json();

        if (data.success) {
            alert("Password successfully changed!");
            document.getElementById('oldPass').value = "";
            document.getElementById('newPass').value = "";
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Change password error:", error);
        alert("Server error while changing password.");
    }
});
