const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve Frontend Files Securely (avoiding serving database.json)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/style.css', (req, res) => res.sendFile(path.join(__dirname, 'style.css')));
app.get('/app.js', (req, res) => res.sendFile(path.join(__dirname, 'app.js')));
app.get('/logo.png', (req, res) => {
    const logoPath = path.join(__dirname, 'logo.png');
    if (fs.existsSync(logoPath)) res.sendFile(logoPath);
    else res.status(404).send('Logo not found');
});

// Setup Multer for File Uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '_' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Database Helper Functions
const DB_FILE = path.join(__dirname, 'database.json');
function readDB() {
    if (!fs.existsSync(DB_FILE)) return { books: [], records: [] };
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}
function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// =======================
// API ROUTES
// =======================

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    
    // Ensure users object exists
    if (!db.users) return res.status(500).json({ success: false, message: 'Database misconfigured' });

    if (username === db.users.admin.username && password === db.users.admin.password) {
        res.json({ success: true, role: 'admin' });
    } else if (username === db.users.guest.username && password === db.users.guest.password) {
        res.json({ success: true, role: 'guest' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// Change Admin Password
app.post('/api/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const db = readDB();
    
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Missing fields' });
    }

    if (db.users.admin.password !== oldPassword) {
        return res.status(401).json({ success: false, message: 'Incorrect old password' });
    }
    
    db.users.admin.password = newPassword;
    writeDB(db);
    
    res.json({ success: true });
});

// Get Books
app.get('/api/books', (req, res) => {
    const db = readDB();
    res.json(db.books || []);
});

// Get Records
app.get('/api/records', (req, res) => {
    const db = readDB();
    res.json(db.records || []);
});

// Upload File (Book or Record)
app.post('/api/upload/:type', upload.single('file'), (req, res) => {
    const type = req.params.type; // 'books' or 'records'
    if (type !== 'books' && type !== 'records') {
        return res.status(400).json({ error: 'Invalid type' });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { name } = req.body;
    if (!name) {
        // delete uploaded file if name is missing
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: 'Name is required' });
    }

    const fileUrl = '/uploads/' + req.file.filename;

    const db = readDB();
    const newEntry = {
        id: Date.now().toString(),
        name: name,
        url: fileUrl,
        filename: req.file.filename
    };

    if (!db[type]) db[type] = [];
    db[type].push(newEntry);
    writeDB(db);

    res.json({ success: true, entry: newEntry });
});

// Delete File
app.delete('/api/:type/:id', (req, res) => {
    const { type, id } = req.params;
    if (type !== 'books' && type !== 'records') return res.status(400).json({ error: 'Invalid type' });

    const db = readDB();
    if (!db[type]) return res.status(404).json({ error: 'Not found' });

    const index = db[type].findIndex(item => item.id === id);
    if (index === -1) return res.status(404).json({ error: 'Item not found' });

    const item = db[type][index];

    // Remove from array
    db[type].splice(index, 1);
    writeDB(db);

    // Delete actual file
    const filePath = path.join(__dirname, 'uploads', item.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    res.json({ success: true });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
