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

// Keep a simple map of clients to usernames (WebSocket -> username)
const users = new Map();
// Keep a reverse map for easy lookup (username -> WebSocket) for whispers
const usernameToWsMap = new Map();

// Helper to get current list of active usernames
function getActiveUsernames() {
  return Array.from(users.values());
}

// Function to broadcast JSON messages to all clients, optionally excluding one
function broadcastJson(obj, exceptWs = null) {
  const msg = JSON.stringify(obj);
  wss.clients.forEach((client) => {
    if (client !== exceptWs && client.readyState === 1) {
      client.send(msg);
    }
  });
}

// Function to send a JSON message to a specific WebSocket client
function sendJsonToWs(ws, obj) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(obj));
  }
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
      const username = msg.username;
      // Basic check for unique username (optional, could be more robust)
      if (usernameToWsMap.has(username)) {
        sendJsonToWs(ws, {
          type: 'system',
          text: `Username "${username}" is already taken. Please choose another.`
        });
        ws.close(); // Close connection for duplicate username
        return;
      }

      users.set(ws, username);
      usernameToWsMap.set(username, ws);

      sendJsonToWs(ws, { type: 'system', text: `Welcome ${username}!` });
      // Send the current list of users to the newly connected client
      sendJsonToWs(ws, { type: 'user_list', users: getActiveUsernames() });

      // Notify others about the new user
      broadcastJson(
        { type: 'system', text: `${username} joined the chat.` },
        ws
      );
      // Broadcast updated user list to all other clients
      broadcastJson({ type: 'user_joined', username: username }, ws);
    } else if (msg.type === 'chat') {
      const sender = users.get(ws) || 'Anonymous';
      const messageText = msg.text.trim();

      if (!messageText) return; // Don't send empty messages

      // Check for mention syntax: starts with @ and then a username
      const mentionMatch = messageText.match(/^@([^:]+):\s*(.+)/);

      if (mentionMatch) {
        const targetUsername = mentionMatch[1];
        const actualMessage = mentionMatch[2];
        const targetWs = usernameToWsMap.get(targetUsername);

        if (targetWs) {
          // Send whisper to the target user
          sendJsonToWs(targetWs, {
            type: 'whisper',
            sender: sender,
            text: actualMessage,
            target: targetUsername // Include target for client-side display
          });
          // Send a copy of the whisper to the sender (so they see it too)
          sendJsonToWs(ws, {
            type: 'whisper',
            sender: sender, // This will be 'You' on client side for self-messages
            text: actualMessage,
            target: targetUsername
          });
          console.log(
            `Whisper from ${sender} to ${targetUsername}: "${actualMessage}"`
          );
        } else {
          // Notify sender if target user is not found
          sendJsonToWs(ws, {
            type: 'system',
            text: `User "${targetUsername}" not found or offline.`
          });
          console.log(
            `Whisper attempt from ${sender} to non-existent user ${targetUsername}.`
          );
        }
      } else {
        // Normal public chat
        broadcastJson({ type: 'chat', sender, text: messageText }, ws);
        console.log(`Chat from ${sender}: "${messageText}"`);
      }
    }
  });

  ws.on('close', () => {
    const name = users.get(ws) || 'Anonymous';
    console.log(`${name} disconnected`);

    // Remove from maps
    users.delete(ws);
    usernameToWsMap.delete(name); // Remove by name as well

    // Notify others that the user left and update user list
    broadcastJson({ type: 'system', text: `${name} left the chat.` }, ws);
    broadcastJson({ type: 'user_left', username: name }, ws);
  });

  // Initial welcome message (this is before login type message is processed)
  // The real welcome message happens after successful login
  sendJsonToWs(ws, { type: 'system', text: 'Please log in with a username.' });
});

server.listen(port, () => {
  console.log(`🚀 Chat server running at http://localhost:${port}`);
});
