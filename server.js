// server.js
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const fs         = require('fs');
const path       = require('path');
const { v4: uuidv4 } = require('uuid');

// Load secret and port from environment
const JWT_SECRET  = process.env.JWT_SECRET;
const PORT        = process.env.PORT || 5000;
const HISTORY_FILE = path.join(__dirname, 'history.json');

const app = express();
app.use(cors());
app.use(express.json());

const users = [];   // in-memory users

// Load or init history + documentState
let history = [];
let documentState = '';
try {
  history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  if (history.length) {
    documentState = history[history.length - 1].content;
  }
} catch {
  history = [];
}
function saveHistory() {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

// --- AUTH ---
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username))
    return res.status(409).json({ error: 'Username taken' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: users.length + 1, username, passwordHash };
  users.push(user);
  const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, username });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, username });
});

// --- HISTORY ENDPOINTS ---
app.get('/api/history', (_req, res) => {
  res.json(history.map(h => ({ id: h.id, timestamp: h.timestamp })));
});
app.get('/api/history/:id', (req, res) => {
  const item = history.find(h => h.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});
app.post('/api/history/save', (_req, res) => {
  const entry = { id: uuidv4(), timestamp: Date.now(), content: documentState };
  history.push(entry);
  saveHistory();
  res.json(entry);
});
app.post('/api/history/:id/rollback', (req, res) => {
  const item = history.find(h => h.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  documentState = item.content;
  io.emit('update', documentState);
  const entry = { id: uuidv4(), timestamp: Date.now(), content: documentState };
  history.push(entry);
  saveHistory();
  res.json({ ok: true });
});

// --- WEBSOCKET SETUP ---
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

const online = new Map();
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Auth error'));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    next(new Error('Auth error'));
  }
});
io.on('connection', (socket) => {
  const { id, username } = socket.user;
  online.set(socket.id, { id, username });

  socket.emit('init', documentState);
  io.emit('presence', Array.from(online.values()));

  socket.on('update', (newDoc) => {
    documentState = newDoc;
    io.emit('update', documentState);
  });

  socket.on('cursor', (pos) => {
    socket.broadcast.emit('cursor', { username, position: pos });
  });

  socket.on('disconnect', () => {
    online.delete(socket.id);
    io.emit('presence', Array.from(online.values()));
  });
});

server.listen(PORT, () => console.log(`🔌 Server listening on port ${PORT}`));