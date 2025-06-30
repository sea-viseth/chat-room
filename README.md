# Multi Chat Room Project

## Description

This project demonstrates WebSocket implementation for real-time communication between client and server.

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn package manager

## Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to project directory
cd chat-room

# Install dependencies
npm install
```

## Running the Project

```bash
# For development with auto-restart
npm run dev

# For production
npm start
```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. The WebSocket connection will be established automatically
3. Send messages through the interface to test real-time communication

## Project Structure

```
├── server.js          # WebSocket server
├── public/            # Client-side files
│   ├── index.html     # Main HTML file
│   ├── script.js      # Client WebSocket logic
│   └── style.css      # Styling
└── package.json       # Dependencies and scripts
```

## Features

- Real-time bidirectional communication
- Connection status indicators
- Message broadcasting
- Error handling

## License

Viseth Dev
