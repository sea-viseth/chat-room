# WebSocket Chat Application with Docker

This project is a WebSocket-based chat application that can be run locally using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your machine
- Git (for cloning the repository)

## Quick Start with Docker

1. **Clone and navigate to the project directory**:

   ```bash
   cd "/Users/seaviseth/Learn/Web Socket"
   ```

2. **Start the application with Docker Compose**:

   ```bash
   docker-compose up --build
   ```

   Or use the npm script:

   ```bash
   npm run docker:up
   ```

3. **Access the application**:

   - Open your browser and go to `http://localhost:3000`
   - The WebSocket server will be running on `ws://localhost:3000`
   - MongoDB will be available on `localhost:27017`

4. **Stop the application**:

   ```bash
   docker-compose down
   ```

   Or use the npm script:

   ```bash
   npm run docker:down
   ```

## Available Scripts

- `npm run docker:up` - Start the application with Docker Compose
- `npm run docker:down` - Stop and remove containers
- `npm run docker:logs` - View logs from all containers
- `npm run dev` - Run the application locally (requires local MongoDB)

## Docker Setup Details

### Services

1. **websocket-app**: Your Node.js WebSocket application

   - Runs on port 3000
   - Automatically restarts on code changes (volume mounted)
   - Connects to the MongoDB container

2. **mongodb**: MongoDB database
   - Runs on port 27017
   - Username: `admin`
   - Password: `password123`
   - Database: `chat-bot`
   - Data persisted in Docker volume

### Environment Variables

The Docker setup uses different environment variables than your cloud MongoDB:

- **Local Docker**: `mongodb://admin:password123@mongodb:27017/chat-bot?authSource=admin`
- **Cloud MongoDB**: Your existing connection string in `.env`

### Development Workflow

1. Start the containers: `npm run docker:up`
2. Make changes to your code
3. The application will automatically restart due to nodemon and volume mounting
4. View logs: `npm run docker:logs`
5. Stop when done: `npm run docker:down`

### Troubleshooting

- **Port conflicts**: If port 3000 or 27017 are already in use, modify the ports in `docker-compose.yml`
- **Permission issues**: On Linux/macOS, you might need to run Docker commands with `sudo`
- **Container not starting**: Check logs with `docker-compose logs [service-name]`

### Data Persistence

MongoDB data is stored in a Docker volume named `mongodb_data`. This means your data will persist between container restarts. To completely reset the database, remove the volume:

```bash
docker-compose down -v
```
