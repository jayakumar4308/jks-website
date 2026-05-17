import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// TODO: Paste your Firebase config object here!
const firebaseConfig = {
    apiKey: "AIzaSyDspOEF754J_MAZRWWLrRyY6bBxzjAVlVs",
    authDomain: "jks-website-dd99e.firebaseapp.com",
    projectId: "jks-website-dd99e",
    storageBucket: "jks-website-dd99e.firebasestorage.app",
    messagingSenderId: "252666286454",
    appId: "1:252666286454:web:257ca1da60ffab7435aa57"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminMenu = document.getElementById('adminMenu');
const roleText = document.getElementById('roleText');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

let currentUserRole = null;

let allSubjects = [];
let allBooks = [];
let allRecords = [];
let currentSubjectId = null;
let currentTab = 'books'; // 'books' or 'records'
let currentSort = 'newest';

// Voice Greeting
function speakGreeting(role) {
    setTimeout(() => {
        let msg = new SpeechSynthesisUtterance(`Welcome to JKS website, ${role}`);
        speechSynthesis.speak(msg);
    }, 300);
}

// Auth State Listener
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.style.display = "none";
        if (user.email === "guest@jks.com") {
            currentUserRole = "guest";
            roleText.innerText = "Guest";
            adminMenu.style.display = "none";
            speakGreeting("Guest");
        } else {
            currentUserRole = "admin";
            roleText.innerText = "Admin";
            adminMenu.style.display = "block";
            speakGreeting("Admin");
        }
        loadSubjects();
        loadBooks();
        loadRecords();
    } else {
        currentUserRole = null;
        loginScreen.style.display = "flex";
        showPage('welcome');
        let msg = new SpeechSynthesisUtterance("welcome to JKS login");
        speechSynthesis.speak(msg);
    }
});

// Login
document.getElementById('loginBtn').addEventListener('click', () => {
    let u = usernameInput.value.trim();
    let p = passwordInput.value;
    if (!u || !p) return alert("Enter credentials.");
    if (u.toLowerCase() === "guest") u = "guest@jks.com";
    signInWithEmailAndPassword(auth, u, p)
        .catch((error) => alert("Invalid Login: " + error.message));
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).catch(e => alert("Error logging out."));
});

// Forgot Password / Change Password
document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
    alert("You can change your password inside the Settings page once logged in.");
});

document.getElementById('changePassBtn').addEventListener('click', () => {
    const newPass = document.getElementById('newPass').value;
    if (!newPass || newPass.length < 6) return alert("New password must be at least 6 characters.");
    updatePassword(auth.currentUser, newPass).then(() => {
        alert("Password updated successfully!");
        document.getElementById('newPass').value = "";
        document.getElementById('oldPass').value = "";
    }).catch((error) => {
        alert("Error changing password: " + error.message + " (You may need to log out and log back in first).");
    });
});

// Navigation
function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

document.getElementById('navWelcome').addEventListener('click', () => showPage('welcome'));
document.getElementById('navLibrary').addEventListener('click', () => {
    showPage('library');
    currentSubjectId = null;
});
document.getElementById('navContact').addEventListener('click', () => showPage('contact'));
document.getElementById('navUpload').addEventListener('click', () => showPage('upload'));
document.getElementById('navSettings').addEventListener('click', () => showPage('settings'));

document.getElementById('backToLibraryBtn').addEventListener('click', () => {
    showPage('library');
    currentSubjectId = null;
});

// Delete Item
window.deleteItem = async function (collectionName, docId) {
    if (currentUserRole !== 'admin') return alert("Only admins can delete.");
    if (!confirm("Are you sure?")) return;
    try {
        await deleteDoc(doc(db, collectionName, docId));
    } catch (error) {
        alert("Error deleting: " + error.message);
    }
}

// Load Subjects
function loadSubjects() {
    onSnapshot(collection(db, "subjects"), (snapshot) => {
        allSubjects = [];
        snapshot.forEach(doc => allSubjects.push({ id: doc.id, ...doc.data() }));
        renderSubjects();
        updateSubjectDropdowns();
    }, (error) => console.error("Error loading subjects", error));
}

function renderSubjects() {
    const container = document.getElementById('subjectsContainer');
    const noMsg = document.getElementById('noSubjects');
    container.innerHTML = "";
    
    if (allSubjects.length === 0) {
        noMsg.style.display = "block";
        noMsg.innerText = "No subjects found. Admin can create them in Settings.";
    } else {
        noMsg.style.display = "none";
        allSubjects.forEach(sub => {
            const card = document.createElement('div');
            card.className = "subject-card";
            if (sub.imageUrl) {
                card.style.backgroundImage = `url('${sub.imageUrl}')`;
            } else if (sub.color) {
                card.style.backgroundColor = sub.color;
            }
            card.innerHTML = `<h3>${sub.name}</h3>`;
            if (currentUserRole === 'admin') {
                card.innerHTML += `<button class="deleteBtn" style="position:absolute; top:10px; right:10px; padding:5px; font-size:12px;" onclick="event.stopPropagation(); deleteItem('subjects', '${sub.id}')">X</button>`;
            }
            card.onclick = () => openSubject(sub);
            container.appendChild(card);
        });
    }
}

function updateSubjectDropdowns() {
    const bookSelect = document.getElementById('bookSubjectSelect');
    const recordSelect = document.getElementById('recordSubjectSelect');
    if(!bookSelect || !recordSelect) return;
    
    let options = '<option value="">Select a Subject...</option>';
    allSubjects.forEach(sub => {
        options += `<option value="${sub.id}">${sub.name}</option>`;
    });
    
    bookSelect.innerHTML = options;
    recordSelect.innerHTML = options;
}

// Load Books & Records
function loadBooks() {
    onSnapshot(collection(db, "books"), (snapshot) => {
        allBooks = [];
        snapshot.forEach(doc => allBooks.push({ id: doc.id, ...doc.data() }));
        if(currentSubjectId) renderSubjectItems();
    });
}

function loadRecords() {
    onSnapshot(collection(db, "records"), (snapshot) => {
        allRecords = [];
        snapshot.forEach(doc => allRecords.push({ id: doc.id, ...doc.data() }));
        if(currentSubjectId) renderSubjectItems();
    });
}

// Subject Details Logic
function openSubject(subject) {
    currentSubjectId = subject.id;
    document.getElementById('currentSubjectTitle').innerText = subject.name;
    showPage('subject-details');
    renderSubjectItems();
}

document.getElementById('tabBooks').addEventListener('click', (e) => {
    currentTab = 'books';
    document.getElementById('tabBooks').classList.add('active');
    document.getElementById('tabRecords').classList.remove('active');
    renderSubjectItems();
});

document.getElementById('tabRecords').addEventListener('click', (e) => {
    currentTab = 'records';
    document.getElementById('tabRecords').classList.add('active');
    document.getElementById('tabBooks').classList.remove('active');
    renderSubjectItems();
});

document.getElementById('sortDropdown').addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderSubjectItems();
});

function renderSubjectItems() {
    if (!currentSubjectId) return;
    const container = document.getElementById('subjectItemsContainer');
    const noMsg = document.getElementById('noSubjectItems');
    
    let items = currentTab === 'books' ? allBooks : allRecords;
    let type = currentTab === 'books' ? 'books' : 'records';
    
    // Filter by subject
    items = items.filter(item => item.subjectId === currentSubjectId);
    
    // Sort
    items.sort((a, b) => {
        if (currentSort === 'nameAZ') return a.name.localeCompare(b.name);
        if (currentSort === 'nameZA') return b.name.localeCompare(a.name);
        
        let timeA = a.createdAt ? a.createdAt.toMillis() : 0;
        let timeB = b.createdAt ? b.createdAt.toMillis() : 0;
        
        if (currentSort === 'newest') return timeB - timeA;
        if (currentSort === 'oldest') return timeA - timeB;
        return 0;
    });
    
    container.innerHTML = "";
    if (items.length === 0) {
        noMsg.style.display = "block";
        noMsg.innerText = `No ${currentTab} found in this subject.`;
    } else {
        noMsg.style.display = "none";
        items.forEach((item) => {
            container.innerHTML += `
            <div class="card-box">
            <h3>${item.name}</h3>
            <div style="margin: 10px 0;">
                <a href="${item.url}" target="_blank">View / Download</a>
            </div>
            ${currentUserRole === 'admin' ? `<button class="deleteBtn" onclick="deleteItem('${type}', '${item.id}')">Delete</button>` : ''}
            </div>`;
        });
    }
}

// Add Data (Now using Google Drive Links)
async function uploadFile(selectId, urlInputId, nameInputId, statusId, collectionName) {
    const nameEl = document.getElementById(nameInputId);
    const urlEl = document.getElementById(urlInputId);
    const selectEl = document.getElementById(selectId);
    const statusMsg = document.getElementById(statusId);

    const name = nameEl.value;
    const url = urlEl.value;
    const subjectId = selectEl.value;

    if (!name || !url || !subjectId) return alert("Please provide a name, valid link, and select a subject.");

    statusMsg.innerText = "Adding to Database... please wait.";

    try {
        await addDoc(collection(db, collectionName), {
            name: name,
            url: url,
            subjectId: subjectId,
            createdAt: new Date()
        });

        statusMsg.innerText = "Successfully Added!";
        nameEl.value = "";
        urlEl.value = "";
        selectEl.value = "";
        setTimeout(() => { statusMsg.innerText = ""; }, 3000);
    } catch (error) {
        console.error("Database error:", error);
        statusMsg.innerText = "Error: " + error.message;
    }
}

document.getElementById('uploadBookBtn').addEventListener('click', () => {
    uploadFile('bookSubjectSelect', 'bookUrl', 'bookName', 'bookUploadStatus', 'books');
});

document.getElementById('uploadRecordBtn').addEventListener('click', () => {
    uploadFile('recordSubjectSelect', 'recordUrl', 'recordName', 'recordUploadStatus', 'records');
});

// Subject Creation (Admin)
let selectedSubjectColor = "#3b82f6"; // default selected

document.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', (e) => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        e.target.classList.add('selected');
        selectedSubjectColor = e.target.getAttribute('data-color');
    });
});

document.getElementById('createSubjectBtn').addEventListener('click', async () => {
    const nameInput = document.getElementById('newSubjectName');
    const imageInput = document.getElementById('newSubjectImage');
    const statusMsg = document.getElementById('subjectCreateStatus');
    
    const name = nameInput.value.trim();
    const imageUrl = imageInput.value.trim();
    
    if(!name) return alert("Please enter a subject name.");
    
    statusMsg.innerText = "Creating subject...";
    try {
        await addDoc(collection(db, "subjects"), {
            name: name,
            imageUrl: imageUrl || null,
            color: imageUrl ? null : selectedSubjectColor,
            createdAt: new Date()
        });
        statusMsg.innerText = "Subject created successfully!";
        nameInput.value = "";
        imageInput.value = "";
        setTimeout(() => { statusMsg.innerText = ""; }, 3000);
    } catch(err) {
        statusMsg.innerText = "Error: " + err.message;
    }
});
