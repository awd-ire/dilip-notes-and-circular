const express = require('express');
const mysql = require('mysql2');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'dilip', // Replace with your MySQL username
    password: '3615', // Replace with your MySQL password
    database: 'demo', // Replace with your database name
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
    } else {
        console.log('Connected to MySQL');
    }
});

// File storage configuration
const storage = multer.diskStorage({
    destination: './public/uploads/circulars', // Directory for circular files
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`); // File name format
    },
});

const upload = multer({ storage });

// Route to handle circular upload
app.post('/upload-circular', upload.single('circular_file'), (req, res) => {
    const circularTitle = req.body.circular_title;
    const filePath = `/uploads/circulars/${req.file.filename}`;

    if (!circularTitle || !req.file) {
        return res.status(400).send('Circular title and file are required');
    }

    // Insert into database
    const sql = 'INSERT INTO circulars (circular_title, file_url) VALUES (?, ?)';
    db.query(sql, [circularTitle, filePath], (err) => {
        if (err) {
            console.error('Error inserting circular:', err);
            return res.status(500).send('Failed to upload circular');
        }
        res.send('Circular uploaded successfully');
    });
});

// Route to fetch all circulars
app.get('/circulars', (req, res) => {
    const sql = 'SELECT circular_id, circular_title FROM circulars';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error retrieving circulars:', err);
            return res.status(500).send('Error retrieving circulars');
        }
        res.json(results);
    });
});

// Route to download a circular
app.get('/download-circular/:id', (req, res) => {
    const circularId = req.params.id;
    const sql = 'SELECT file_url FROM circulars WHERE circular_id = ?';

    db.query(sql, [circularId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error finding circular:', err);
            return res.status(500).send('Circular not found');
        }

        const filePath = path.join(__dirname, 'public/uploads/circulars', result[0].file_url);
        res.download(filePath);
    });
});

// Route to delete a circular
app.delete('/circulars/:id', (req, res) => {
    const circularId = req.params.id;
    const sql = 'SELECT file_url FROM circulars WHERE circular_id = ?';

    db.query(sql, [circularId], (err, result) => {
        if (err || result.length === 0) {
            console.error('Error finding circular:', err);
            return res.status(500).send('Circular not found');
        }

        const filePath = path.join(__dirname, 'public', result[0].file_url);

        // Delete the file from the server
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting circular file:', err);
                return res.status(500).send('Failed to delete circular file');
            }

            // Delete the record from the database
            const deleteSql = 'DELETE FROM circulars WHERE circular_id = ?';
            db.query(deleteSql, [circularId], (err) => {
                if (err) {
                    console.error('Error deleting circular record:', err);
                    return res.status(500).send('Failed to delete circular');
                }
                res.send('Circular deleted successfully');
            });
        });
    });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
