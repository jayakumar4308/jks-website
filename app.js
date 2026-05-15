// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const adminMenu = document.getElementById('adminMenu');
const roleText = document.getElementById('roleText');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// State
let currentUserRole = null; // 'admin' or 'guest'

// Voice Greeting Helper
function speakGreeting(role) {
    setTimeout(() => {
        let msg = new SpeechSynthesisUtterance(`Welcome to JKS website, ${role}`);
        speechSynthesis.speak(msg);
    }, 300);
}

// ==========================================
// AUTHENTICATION
// ==========================================

// Monitor Auth State
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in
        loginScreen.style.display = "none";

        // Determine role based on email
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

        // Load data
        loadBooks();
        loadRecords();
    } else {
        // User is signed out
        currentUserRole = null;
        loginScreen.style.display = "flex";
        showPage('welcome');
        let msg = new SpeechSynthesisUtterance("welcome to JKS login");
        speechSynthesis.speak(msg);
    }
});

// Login Button Click
document.getElementById('loginBtn').addEventListener('click', () => {
    let u = usernameInput.value.trim();
    let p = passwordInput.value;

    if (!u || !p) {
        alert("Please enter username/email and password.");
        return;
    }

    // Handle dummy guest login
    if (u.toLowerCase() === "guest") {
        u = "guest@jks.com";
    }

    // Try to sign in with Firebase
    signInWithEmailAndPassword(auth, u, p)
        .then((userCredential) => {
            // Success (handled by onAuthStateChanged)
        })
        .catch((error) => {
            alert("Invalid Login: " + error.message);
        });
});

// Logout Button Click
document.getElementById('logoutBtn').addEventListener('click', () => {
    signOut(auth).then(() => {
        // Sign-out successful.
    }).catch((error) => {
        alert("Error logging out.");
    });
});

// Forgot Password
document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
    let email = usernameInput.value.trim();
    if (!email) {
        alert("Please enter your Admin Email address in the Username field first, then click Forgot Password.");
        return;
    }
    if (email.toLowerCase() === "guest" || email.toLowerCase() === "guest@jks.com") {
        alert("You cannot reset the guest password.");
        return;
    }

    sendPasswordResetEmail(auth, email)
        .then(() => {
            alert("Password reset email sent! Check your inbox.");
        })
        .catch((error) => {
            alert("Error sending reset email. Ensure the email is correct. " + error.message);
        });
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

// Make delete function globally available for inline HTML onclick handlers
window.deleteItem = async function (collectionName, docId, fileUrl) {
    if (currentUserRole !== 'admin') {
        alert("Only admins can delete files.");
        return;
    }

    if (!confirm("Are you sure you want to delete this?")) return;

    try {
        // Delete from Firestore
        await deleteDoc(doc(db, collectionName, docId));

        // Delete from Storage
        if (fileUrl) {
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef).catch(e => console.log("Storage delete error:", e));
        }
    } catch (error) {
        alert("Error deleting: " + error.message);
    }
}

// ==========================================
// DATABASE & STORAGE LOGIC
// ==========================================

// Load Books (Real-time listener)
function loadBooks() {
    const booksRef = collection(db, "books");
    onSnapshot(booksRef, (snapshot) => {
        const container = document.getElementById('booksContainer');
        const noBooksMsg = document.getElementById('noBooks');

        container.innerHTML = "";
        if (snapshot.empty) {
            noBooksMsg.style.display = "block";
            noBooksMsg.innerText = "No Books Uploaded Yet.";
        } else {
            noBooksMsg.style.display = "none";
            snapshot.forEach((doc) => {
                const data = doc.data();
                container.innerHTML += `
                <div class="card-box">
                <h3>${data.name}</h3>
                <a href="${data.url}" target="_blank">Download</a>
                ${currentUserRole === 'admin' ? `<button class="deleteBtn" onclick="deleteItem('books', '${doc.id}', '${data.url}')">Delete</button>` : ''}
                </div>`;
            });
        }
    });
}

// Load Records (Real-time listener)
function loadRecords() {
    const recordsRef = collection(db, "records");
    onSnapshot(recordsRef, (snapshot) => {
        const container = document.getElementById('recordsContainer');
        const noRecordsMsg = document.getElementById('noRecords');

        container.innerHTML = "";
        if (snapshot.empty) {
            noRecordsMsg.style.display = "block";
            noRecordsMsg.innerText = "No Records Uploaded Yet.";
        } else {
            noRecordsMsg.style.display = "none";
            snapshot.forEach((doc) => {
                const data = doc.data();
                container.innerHTML += `
                <div class="card-box">
                <h3>${data.name}</h3>
                <a href="${data.url}" target="_blank">View</a>
                ${currentUserRole === 'admin' ? `<button class="deleteBtn" onclick="deleteItem('records', '${doc.id}', '${data.url}')">Delete</button>` : ''}
                </div>`;
            });
        }
    });
}

// Reusable Upload Function
async function uploadFile(fileInputId, nameInputId, statusId, collectionName) {
    const name = document.getElementById(nameInputId).value;
    const file = document.getElementById(fileInputId).files[0];
    const statusMsg = document.getElementById(statusId);

    if (!name || !file) {
        alert("Please provide a name and select a file.");
        return;
    }

    statusMsg.innerText = "Uploading... please wait.";

    // Create unique file name to avoid overwriting
    const uniqueFileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `${collectionName}/${uniqueFileName}`);

    try {
        // Upload to Storage
        const uploadTask = await uploadBytesResumable(storageRef, file);
        const downloadURL = await getDownloadURL(uploadTask.ref);

        // Add to Firestore
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

// Upload Book Click
document.getElementById('uploadBookBtn').addEventListener('click', () => {
    uploadFile('bookFile', 'bookName', 'bookUploadStatus', 'books');
});

// Upload Record Click
document.getElementById('uploadRecordBtn').addEventListener('click', () => {
    uploadFile('recordFile', 'recordName', 'recordUploadStatus', 'records');
});
