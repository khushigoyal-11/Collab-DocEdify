const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const fs         = require('fs');
const path       = require('path');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET   = process.env.JWT_SECRET;
const PORT         = process.env.PORT || 5000;
const HISTORY_FILE = path.join(__dirname, 'history.json');

const app = express();
app.use(cors());
app.use(express.json());

// … authMiddleware, /api/register, /api/login, /api/history endpoints unchanged …

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
  const { username } = socket.user;
  console.log(`🔌 [${socket.id}] CONNECTED as ${username}`);
  online.set(socket.id, { username });

  socket.emit('init', documentState);
  io.emit('presence', Array.from(online.values()));

  socket.on('update', (newDoc) => {
    console.log(`📥 [${username}] update:`, newDoc);
    documentState = newDoc;
    io.emit('update', documentState);
  });

  socket.on('cursor', (...args) => {
    console.log('📥 [RAW cursor args]', args);
    const payload = args[0];
    console.log('📥 [Parsed payload]', payload);
    const { user, position } = payload || {};
    console.log(`📥 [Destructured] user=${user}, position=${position}`);
    io.emit('cursor', { user, position });
  });

  socket.on('disconnect', () => {
    console.log(`❌ [${socket.id}] DISCONNECTED (${username})`);
    online.delete(socket.id);
    io.emit('presence', Array.from(online.values()));
  });
});

server.listen(PORT, () => console.log(`🔌 Server listening on port ${PORT}`));
