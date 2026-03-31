const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(bodyParser.json());

// Database connection
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        UNIQUE(post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES posts(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
    });
  }
});

// Routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      'INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      function (err) {
        if (err) {
          console.error(err.message);
          return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(201).json({ user: { id: this.lastID, username } });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
        expiresIn: '1h',
      });

      res.json({ token });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const auth = req.headers['authorization'];
  const token = auth && auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// GET /api/posts — fetch all posts with like counts and comments
app.get('/api/posts', (_req, res) => {
  db.all(
    `SELECT p.id, p.content, p.created_at,
            u.id as author_id, u.username as author_username,
            COUNT(l.id) as likes
     FROM posts p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN likes l ON l.post_id = p.id
     GROUP BY p.id
     ORDER BY p.created_at DESC`,
    [],
    (err, posts) => {
      if (err) return res.status(500).json({ error: err.message });
      db.all(
        `SELECT c.id, c.post_id, c.content, u.username as author_username
         FROM comments c
         JOIN users u ON c.user_id = u.id
         ORDER BY c.created_at ASC`,
        [],
        (err, comments) => {
          if (err) return res.status(500).json({ error: err.message });
          const commentsByPost = {};
          comments.forEach(c => {
            if (!commentsByPost[c.post_id]) commentsByPost[c.post_id] = [];
            commentsByPost[c.post_id].push({ id: c.id, content: c.content, author: { username: c.author_username } });
          });
          res.json(posts.map(p => ({
            id: p.id,
            content: p.content,
            likes: p.likes,
            author: { username: p.author_username },
            replies: commentsByPost[p.id] || []
          })));
        }
      );
    }
  );
});

// POST /api/posts — create a new post
app.post('/api/posts', authenticateToken, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });
  db.run('INSERT INTO posts (user_id, content) VALUES (?, ?)', [req.user.id, content.trim()], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, content: content.trim(), likes: 0, replies: [], author: { username: req.user.username } });
  });
});

// POST /api/posts/:id/like — toggle like on a post
app.post('/api/posts/:id/like', authenticateToken, (req, res) => {
  const postId = req.params.id;
  db.get('SELECT id FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id], (err, existing) => {
    if (err) return res.status(500).json({ error: err.message });
    if (existing) {
      db.run('DELETE FROM likes WHERE post_id = ? AND user_id = ?', [postId, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ liked: false });
      });
    } else {
      db.run('INSERT INTO likes (post_id, user_id) VALUES (?, ?)', [postId, req.user.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ liked: true });
      });
    }
  });
});

// POST /api/posts/:id/comments — add a comment to a post
app.post('/api/posts/:id/comments', authenticateToken, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });
  db.run('INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)', [req.params.id, req.user.id, content.trim()], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ id: this.lastID, content: content.trim(), author: { username: req.user.username } });
  });
});

// GET /api/users/:username — profile data: user info, stats, and posts
app.get('/api/users/:username', (req, res) => {
  const { username } = req.params;
  db.get('SELECT id, username FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.all(
      `SELECT p.id, p.content, p.created_at, COUNT(l.id) as likes, COUNT(DISTINCT c.id) as comment_count
       FROM posts p
       LEFT JOIN likes l ON l.post_id = p.id
       LEFT JOIN comments c ON c.post_id = p.id
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [user.id],
      (err, posts) => {
        if (err) return res.status(500).json({ error: err.message });
        const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
        res.json({
          username: user.username,
          postCount: posts.length,
          totalLikes,
          posts: posts.map(p => ({
            id: p.id,
            content: p.content,
            likes: p.likes,
            commentCount: p.comment_count,
            createdAt: p.created_at
          }))
        });
      }
    );
  });
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Catch-all route to serve React app for non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});