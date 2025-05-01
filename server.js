// server.js
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 6000;
const app = express();
app.use(cors());

const server = app.listen(PORT, () =>
  console.log(`🔌  Server listening on http://localhost:${PORT}`)
);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('🖥️  New client connected');
  ws.on('message', (message) => {
    console.log('⏫ Received from client:', message);
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === ws.OPEN) {
        console.log('⏬ Broadcasting to other client');
        client.send(message);
      }
    });
  });
  ws.on('close', () => console.log('❌  Client disconnected'));
});
