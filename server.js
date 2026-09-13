const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const multer = require('multer');
const Database = require('better-sqlite3');

const app = express();
const port = process.env.PORT || 3000;
const uploadDirectory = path.join(__dirname, 'uploads');
const database = new Database(path.join(__dirname, 'bleue-votex.db'));

fs.mkdirSync(uploadDirectory, { recursive: true });
database.exec(`
    CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_name TEXT NOT NULL,
        stored_name TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
`);

const storage = multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, uploadDirectory),
    filename: (_request, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();
        const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
        callback(null, safeName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 },
    fileFilter: (_request, file, callback) => {
        if (file.mimetype.startsWith('video/')) callback(null, true);
        else callback(new Error('Seuls les fichiers vidéo sont acceptés.'));
    }
});

app.use(express.static(__dirname));
app.use('/uploads', express.static(uploadDirectory));

app.get('/api/public-videos', (_request, response) => {
    const videos = database.prepare('SELECT id, original_name AS name, stored_name AS storedName, mime_type AS type, size, created_at AS createdAt FROM videos ORDER BY id DESC').all();
    response.json(videos);
});

app.post('/api/public-videos', upload.array('videos', 20), (request, response) => {
    const insert = database.prepare('INSERT INTO videos (original_name, stored_name, mime_type, size) VALUES (?, ?, ?, ?)');
    const insertMany = database.transaction(files => files.map(file => insert.run(file.originalname, file.filename, file.mimetype, file.size).lastInsertRowid));
    const ids = insertMany(request.files);
    response.status(201).json({ ids });
});

app.delete('/api/public-videos/:id', (request, response) => {
    const video = database.prepare('SELECT stored_name AS storedName FROM videos WHERE id = ?').get(request.params.id);
    if (!video) return response.sendStatus(404);
    database.prepare('DELETE FROM videos WHERE id = ?').run(request.params.id);
    fs.rm(path.join(uploadDirectory, video.storedName), { force: true }, error => {
        if (error) return response.sendStatus(500);
        response.sendStatus(204);
    });
});

app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') return response.status(413).json({ error: 'La vidéo dépasse la taille maximale autorisée.' });
    response.status(400).json({ error: error.message || 'Erreur pendant le téléversement.' });
});

app.listen(port, () => {
    console.log(`Bleue Votex disponible sur http://localhost:${port}`);
});
