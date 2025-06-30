import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000');

ws.on('open', () => {
  console.log('Connected to server');

  // Send a message to the server
  ws.send('Hello Server!');
});

ws.on('message', (data) => {
  console.log('Received from server:', data.toString());
});

ws.on('close', () => {
  console.log('Disconnected from server');
});
