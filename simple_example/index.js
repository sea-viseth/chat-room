import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const port = 3000;

// HTTP routes
app.get('/', (req, res) => {
  res.send('Hello from Express + WebSocket Chat!');
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server on top of it
const wss = new WebSocketServer({ server });

// Broadcast helper: send to all connected clients
function broadcast(data, sender) {
  wss.clients.forEach((client) => {
    if (client !== sender && client.readyState === 1) {
      // 1 === WebSocket.OPEN
      client.send(data);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('New client connected');

  // Notify others that someone joined
  broadcast('A new user has joined the chat', ws);

  // Handle incoming messages
  ws.on('message', (message) => {
    console.log('Received:', message.toString());

    // Broadcast to all other clients
    broadcast(message.toString(), ws);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    broadcast('A user has left the chat', ws);
  });

  ws.send('Welcome to the chat room!');
});

// Start server
server.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  console.log(`WebSocket chat on ws://localhost:${port}`);
});
