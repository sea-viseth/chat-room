import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dbConnection from './db/connection.js';
import Room from './db/models/Room.js';
import User from './db/models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.static(path.join(__dirname, 'public')));
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Connect to MongoDB
await dbConnection();

const clients = new Map();
const rooms = new Map();

app.get('/rooms', async (_, res) => {
  try {
    const allRooms = await Room.find({}, 'name');
    const roomList = allRooms.map((r) => r.name);
    res.json(roomList);
  } catch (err) {
    console.error('MongoDB error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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
  Room.find({}, 'name')
    .then((allRooms) => {
      const roomList = allRooms.map((r) => r.name);
      const msg = JSON.stringify({ type: 'rooms', rooms: roomList });
      for (const client of wss.clients) {
        if (client.readyState === 1) {
          client.send(msg);
        }
      }
    })
    .catch((err) => console.error('MongoDB error:', err));
}
function getOnlineUsersInRoom(room) {
  const usernames = new Set();
  for (const [client, data] of clients.entries()) {
    if (data.room === room) {
      usernames.add(data.username);
    }
  }
  return Array.from(usernames);
}

function broadcastOnlineList(room) {
  const onlineUsers = getOnlineUsersInRoom(room);
  const msg = JSON.stringify({ type: 'online', users: onlineUsers });
  const members = rooms.get(room);
  if (members) {
    for (const client of members) {
      if (client.readyState === 1) {
        client.send(msg);
      }
    }
  }
}

wss.on('connection', (ws) => {
  broadcastRoomList();

  ws.on('message', async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.type === 'join') {
      const { username, room } = msg;
      clients.set(ws, { username, room });
      broadcastOnlineList(room);
      // Save user in DB if not exists
      await User.findOneAndUpdate(
        { username },
        {},
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch((err) => console.error('MongoDB user upsert error:', err));

      // Rooms logic
      if (!rooms.has(room)) rooms.set(room, new Set());
      rooms.get(room).add(ws);

      await Room.findOne({ name: room })
        .then(
          async (foundRoom) => foundRoom || (await Room.create({ name: room }))
        )
        .then((foundRoom) => {
          foundRoom.messages.forEach((m) => {
            ws.send(
              JSON.stringify({
                type: 'chat',
                sender: m.sender,
                text: m.text,
                timestamp: m.timestamp,
                owner: m.sender === username
              })
            );
          });
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
        });
    }

    if (msg.type === 'chat') {
      const user = clients.get(ws);
      if (!user) return;
      broadcastOnlineList(user.room);
      broadcastToRoom(
        user.room,
        {
          type: 'chat',
          sender: user.username,
          text: msg.text,
          timestamp: new Date()
        },
        ws
      );
      await Room.findOneAndUpdate(
        { name: user.room },
        { $push: { messages: { sender: user.username, text: msg.text } } },
        { new: true, upsert: true }
      );
    }
  });

  ws.on('close', () => {
    const user = clients.get(ws);
    if (user) {
      const members = rooms.get(user.room);
      if (members) {
        members.delete(ws);
        if (members.size === 0) rooms.delete(user.room);
      }
      broadcastToRoom(
        user.room,
        { type: 'system', text: `${user.username} left the room.` },
        ws
      );
      broadcastRoomList();
    }
    clients.delete(ws);
  });
});

server.listen(port, () =>
  console.log(`🚀 Server running at http://localhost:${port}`)
);
