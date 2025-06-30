import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Maps: ws -> { username, room }
const clients = new Map();
// Maps: room -> Set of ws connections
const rooms = new Map();

function broadcastToRoom(room, obj, exceptWs = null) {
  const msg = JSON.stringify(obj);
  const members = rooms.get(room);
  if (members) {
    for (const client of members) {
      if (client !== exceptWs && client.readyState === 1) {
        client.send(msg);
      }
    }
  }
}

function broadcastRoomList() {
  const roomList = Array.from(rooms.keys());
  const msg = JSON.stringify({ type: 'rooms', rooms: roomList });
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(msg);
    }
  }
}

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      console.log('Invalid JSON:', data.toString());
      return;
    }

    if (msg.type === 'join') {
      const { username, room } = msg;
      clients.set(ws, { username, room });

      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);

      ws.send(
        JSON.stringify({
          type: 'system',
          text: `Welcome ${username} to room ${room}`
        })
      );
      broadcastToRoom(
        room,
        { type: 'system', text: `${username} joined the room.` },
        ws
      );
      broadcastRoomList();
    }

    if (msg.type === 'chat') {
      const user = clients.get(ws);
      if (!user) {
        ws.send(JSON.stringify({ type: 'system', text: 'Join a room first.' }));
        return;
      }
      broadcastToRoom(
        user.room,
        { type: 'chat', sender: user.username, text: msg.text },
        ws
      );
    }
  });

  ws.on('close', () => {
    const user = clients.get(ws);
    if (user) {
      const { room, username } = user;
      const members = rooms.get(room);
      if (members) {
        members.delete(ws);
        if (members.size === 0) {
          rooms.delete(room);
        }
      }
      broadcastToRoom(
        room,
        { type: 'system', text: `${username} left the room.` },
        ws
      );
      broadcastRoomList();
    }
    clients.delete(ws);
  });
});

server.listen(port, () => {
  console.log(`🚀 Multi-room chat running at http://localhost:${port}`);
});
