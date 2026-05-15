import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
// No need for Firebase Storage anymore since we use Google Drive links!

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
// storage is no longer needed

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminMenu = document.getElementById('adminMenu');
const roleText = document.getElementById('roleText');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

let currentUserRole = null;

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

        // In Firebase, we will set the guest email to guest@jks.com
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

    // Auto-convert guest username to the dummy email
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
document.getElementById('navBooks').addEventListener('click', () => showPage('books'));
document.getElementById('navRecords').addEventListener('click', () => showPage('records'));
document.getElementById('navContact').addEventListener('click', () => showPage('contact'));
document.getElementById('navUpload').addEventListener('click', () => showPage('upload'));
document.getElementById('navSettings').addEventListener('click', () => showPage('settings'));

// Delete Item
window.deleteItem = async function (collectionName, docId) {
    if (currentUserRole !== 'admin') return alert("Only admins can delete.");
    if (!confirm("Are you sure?")) return;

    try {
        await deleteDoc(doc(db, collectionName, docId));
        // We no longer need to delete from Firebase Storage because files are hosted on Google Drive!
    } catch (error) {
        alert("Error deleting: " + error.message);
    }
}

// Load Data
function loadBooks() {
    onSnapshot(collection(db, "books"), (snapshot) => {
        const books = [];
        snapshot.forEach(doc => books.push({ id: doc.id, ...doc.data() }));
        renderItems(books, 'booksContainer', 'noBooks', 'No Books Uploaded Yet.', 'books');
    }, (error) => {
        document.getElementById('noBooks').style.display = "block";
        document.getElementById('noBooks').innerText = "Error Loading Database: " + error.message;
        console.error(error);
    });
}

function loadRecords() {
    onSnapshot(collection(db, "records"), (snapshot) => {
        const records = [];
        snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
        renderItems(records, 'recordsContainer', 'noRecords', 'No Records Uploaded Yet.', 'records');
    }, (error) => {
        document.getElementById('noRecords').style.display = "block";
        document.getElementById('noRecords').innerText = "Error Loading Database: " + error.message;
        console.error(error);
    });
}

function renderItems(items, containerId, msgId, emptyMsg, type) {
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
            <div style="margin: 10px 0;">
                <a href="${item.url}" target="_blank" style="margin-right: 15px;">View</a>
                <a href="${item.url}" download="${item.name}" target="_blank">Download</a>
            </div>
            ${currentUserRole === 'admin' ? `<button class="deleteBtn" onclick="deleteItem('${type}', '${item.id}', '${item.url}')">Delete</button>` : ''}
            </div>`;
        });
    }
}

// Add Data (Now using Google Drive Links)
async function uploadFile(urlInputId, nameInputId, statusId, collectionName) {
    const nameEl = document.getElementById(nameInputId);
    const urlEl = document.getElementById(urlInputId);
    const statusMsg = document.getElementById(statusId);

    if (!nameEl || !urlEl) {
        return alert("Error: Your browser is loading an old version of the website. Please Hard Refresh (Ctrl+Shift+R)!");
    }

    const name = nameEl.value;
    const url = urlEl.value;

    if (!name || !url) return alert("Please provide a name and paste a valid link.");

    statusMsg.innerText = "Adding to Database... please wait.";

    try {
        // Save the Name and the Google Drive URL directly to Firestore Database
        await addDoc(collection(db, collectionName), {
            name: name,
            url: url,
            createdAt: new Date()
        });

        statusMsg.innerText = "Successfully Added!";
        document.getElementById(nameInputId).value = "";
        document.getElementById(urlInputId).value = "";
        setTimeout(() => { statusMsg.innerText = ""; }, 3000);
    } catch (error) {
        console.error("Database error:", error);
        statusMsg.innerText = "Error: " + error.message;
    }
}

document.getElementById('uploadBookBtn').addEventListener('click', () => {
    uploadFile('bookUrl', 'bookName', 'bookUploadStatus', 'books');
});

document.getElementById('uploadRecordBtn').addEventListener('click', () => {
    uploadFile('recordUrl', 'recordName', 'recordUploadStatus', 'records');
});
