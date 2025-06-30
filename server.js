import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup to serve static HTML file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

// Serve static HTML
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Keep a simple map of clients to usernames
const users = new Map();

function broadcastJson(obj, exceptWs = null) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client !== exceptWs && client.readyState === 1) {
      client.send(msg);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      console.log('Invalid message:', data.toString());
      return;
    }

    // Handle login
    if (msg.type === 'login') {
      users.set(ws, msg.username);
      ws.send(
        JSON.stringify({ type: 'system', text: `Welcome ${msg.username}!` })
      );
      broadcastJson(
        { type: 'system', text: `${msg.username} joined the chat.` },
        ws
      );
    }

    // Handle normal chat
    if (msg.type === 'chat') {
      const sender = users.get(ws) || 'Anonymous';
      broadcastJson({ type: 'chat', sender, text: msg.text }, ws);
    }
  });

  ws.on('close', () => {
    const name = users.get(ws) || 'A user';
    console.log(`${name} disconnected`);
    broadcastJson({ type: 'system', text: `${name} left the chat.` }, ws);
    users.delete(ws);
  });
});

server.listen(port, () => {
  console.log(`🚀 Chat server running at http://localhost:${port}`);
});
