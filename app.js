import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

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
const storage = getStorage(app);

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
window.deleteItem = async function (collectionName, docId, fileUrl) {
    if (currentUserRole !== 'admin') return alert("Only admins can delete.");
    if (!confirm("Are you sure?")) return;

    try {
        await deleteDoc(doc(db, collectionName, docId));
        if (fileUrl) {
            // Reconstruct storage ref from URL
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef).catch(e => console.log("Storage delete skipped or error"));
        }
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
    });
}

function loadRecords() {
    onSnapshot(collection(db, "records"), (snapshot) => {
        const records = [];
        snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() }));
        renderItems(records, 'recordsContainer', 'noRecords', 'No Records Uploaded Yet.', 'records');
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

// Upload Data
async function uploadFile(fileInputId, nameInputId, statusId, collectionName) {
    const name = document.getElementById(nameInputId).value;
    const file = document.getElementById(fileInputId).files[0];
    const statusMsg = document.getElementById(statusId);

    if (!name || !file) return alert("Please provide a name and select a file.");

    statusMsg.innerText = "Uploading to Firebase... please wait.";

    const uniqueFileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${collectionName}/${uniqueFileName}`);

    try {
        const uploadTask = await uploadBytesResumable(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        await addDoc(collection(db, collectionName), {
            name: name,
            url: downloadURL,
            createdAt: new Date()
        });

        statusMsg.innerText = "Upload successful!";
        document.getElementById(nameInputId).value = "";
        document.getElementById(fileInputId).value = "";
        setTimeout(() => { statusMsg.innerText = ""; }, 3000);
    } catch (error) {
        console.error("Upload error:", error);
        statusMsg.innerText = "Upload failed: " + error.message;
    }
}

document.getElementById('uploadBookBtn').addEventListener('click', () => {
    uploadFile('bookFile', 'bookName', 'bookUploadStatus', 'books');
});

document.getElementById('uploadRecordBtn').addEventListener('click', () => {
    uploadFile('recordFile', 'recordName', 'recordUploadStatus', 'records');
});
