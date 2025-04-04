require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const Docker = require('dockerode');
const cors = require('cors');
const connection = require('./db');
const userRouter = require('./routes/user');
const fileRouter = require('./routes/files');
const { uploadToS3, getFileFromS3, checkS3Connection } = require('./config/s3');

const app = express();
app.use(cookieParser());
app.use(cors());
app.use(express.json());

// Add console log to debug routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/user', userRouter);
app.use('/files', fileRouter);

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

const docker = new Docker();

// Add default code templates
const defaultCode = {
  javascript: '// Collaborative JavaScript coding\nconsole.log("Hello from collaborative session!");',
  python: '# Collaborative Python coding\nprint("Hello from collaborative session!")',
  java: '// Collaborative Java coding\nclass Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from collaborative session!");\n    }\n}'
};

const executeCode = async (language, code, socket) => {
  try {
    // Check if image exists
    const images = await docker.listImages();
    const imageExists = images.some(img => 
      img.RepoTags && img.RepoTags.includes(`code-executor-${language}:latest`)
    );

    if (!imageExists) {
      socket.emit('execution_error', `Container image for ${language} not found. Please build the image first.`);
      return;
    }

    const containerConfig = {
      Image: `code-executor-${language}:latest`, // Add :latest tag
      Cmd: [],
      WorkingDir: '/app',
      NetworkDisabled: true,
      Memory: 128 * 1024 * 1024,
      MemorySwap: 128 * 1024 * 1024,
      CpuQuota: 100000,
      StopTimeout: 5
    };

    // Configure command based on language
    switch(language) {
      case 'python':
        containerConfig.Cmd = ['python', '-c', code];
        break;
      case 'java':
        containerConfig.Cmd = ['/bin/sh', '-c', `echo '${code}' > Main.java && javac Main.java && java Main`];
        break;
      case 'javascript':
        containerConfig.Cmd = ['node', '-e', code];
        break;
      default:
        throw new Error('Unsupported language');
    }

    socket.emit('execution_status', 'Creating container...');
    const container = await docker.createContainer(containerConfig);
    
    socket.emit('execution_status', 'Running code...');
    await container.start();
    
    const stream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true
    });

    stream.on('data', (chunk) => {
      socket.emit('code_output', chunk.toString());
    });

    stream.on('end', async () => {
      socket.emit('execution_complete');
      await container.remove();
    });

  } catch (error) {
    console.error('Execution error:', error);
    socket.emit('execution_error', error.message);
  }
}

// Connect to services
(async () => {
  try {
    // Connect to MongoDB
    await connection();
    console.log('MongoDB connected successfully');

    // Check S3 connection
    await checkS3Connection();
    console.log('S3 connection verified');

  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
})();

// Socket.IO collaboration handlers
const collaborationSessions = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  
  // Associate user with socket ID for better tracking
  let userSessionData = {
    userName: '',
    sessionId: '',
    language: ''
  };
  
  // Update the join_session handler for more reliable room joining
  socket.on('join_session', (data) => {
    const { sessionId, userName, language } = data;
    
    // Sanitize the session ID to ensure consistent room names
    const cleanSessionId = sessionId ? sessionId.replace(/[^a-zA-Z0-9-]/g, '') : '';
    
    console.log(`Join request for session ${cleanSessionId} from ${userName}`);
    
    // Store user data with the clean session ID
    userSessionData = { 
      sessionId: cleanSessionId, 
      userName, 
      language 
    };
    
    // Leave all previous rooms
    socket.rooms.forEach(room => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });
    
    // Create or get session
    if (!collaborationSessions.has(cleanSessionId)) {
      console.log(`Creating new session: ${cleanSessionId}`);
      collaborationSessions.set(cleanSessionId, {
        language,
        code: defaultCode[language] || '',
        participants: []
      });
    }
    
    const session = collaborationSessions.get(cleanSessionId);
    
    // Add participant
    if (!session.participants.includes(userName)) {
      session.participants.push(userName);
    }

    // Join room in a simpler, more direct way
    socket.join(cleanSessionId);
    console.log(`Socket ${socket.id} joined room ${cleanSessionId}`);
    
    // Send initial code
    socket.emit('initial_code', { code: session.code });
    
    // Notify all clients of participants
    io.to(cleanSessionId).emit('participants_update', {
      participants: session.participants
    });
  });
  
  // Handle disconnections properly
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // If user was in a session, remove them
    if (userSessionData.sessionId && userSessionData.userName) {
      const session = collaborationSessions.get(userSessionData.sessionId);
      if (session) {
        // Remove the participant
        session.participants = session.participants.filter(name => name !== userSessionData.userName);
        
        // Broadcast updated participants list
        io.to(userSessionData.sessionId).emit('participants_update', {
          participants: session.participants
        });
        
        console.log(`${userSessionData.userName} left session ${userSessionData.sessionId}`);
        
        // Clean up empty sessions
        if (session.participants.length === 0) {
          collaborationSessions.delete(userSessionData.sessionId);
          console.log(`Session ${userSessionData.sessionId} removed (no participants left)`);
        }
      }
    }
  });
  
  // Handle code changes
  socket.on('code_change', (data) => {
    const { sessionId, code, language, timestamp, sender } = data;
    
    console.log(`CODE CHANGE EVENT from ${socket.id} for session ${sessionId}`);
    
    // Update existing session
    if (!collaborationSessions.has(sessionId)) {
      collaborationSessions.set(sessionId, {
        language: language || 'javascript',
        code: code || '',
        participants: [userSessionData.userName || 'Anonymous']
      });
      socket.join(sessionId);
    }
    
    // Always update the session code
    const session = collaborationSessions.get(sessionId);
    session.code = code;
    
    // Critical fix: use io.to() to send to all clients in the room
    // Including the sender, but the sender will ignore it
    console.log(`Broadcasting code update to ALL clients in room ${sessionId}`);
    
    io.to(sessionId).emit('code_update', {
      code,
      timestamp,
      sender: socket.id
    });
    
    console.log('Broadcast complete');
  });
  
  // Handle code execution
  socket.on('run_code', (data) => {
    const { sessionId, code, language } = data;
    
    // Execute the code and broadcast results
    if (collaborationSessions.has(sessionId)) {
      executeCode(language, code, {
        emit: (event, data) => {
          io.to(sessionId).emit(event, data);
        }
      });
    }
  });

  // Add test ping/pong to verify room behavior
  socket.on('ping_room', (data) => {
    const { sessionId } = data;
    
    console.log(`Ping received from ${socket.id} to room ${sessionId}`);
    
    // Broadcast to all OTHER clients in the room
    socket.to(sessionId).emit('pong_room', {
      from: socket.id,
      timestamp: new Date().toISOString()
    });
    
    // Send an acknowledgment to the sender
    socket.emit('ping_ack', {
      roomMembers: Array.from(io.sockets.adapter.rooms.get(sessionId) || [])
    });
  });

  // Add this event handler in your Socket.IO connection section
  socket.on('leave_session', (data) => {
    const { sessionId } = data;
    
    console.log(`Explicit leave_session from socket ${socket.id} for room ${sessionId}`);
    
    // Leave the room
    socket.leave(sessionId);
    
    // Handle the same cleanup as done in disconnect event
    if (userSessionData.sessionId && userSessionData.userName) {
      const session = collaborationSessions.get(userSessionData.sessionId);
      if (session) {
        // Remove the participant
        session.participants = session.participants.filter(name => name !== userSessionData.userName);
        
        // Broadcast updated participants list to everyone in the room
        io.to(userSessionData.sessionId).emit('participants_update', {
          participants: session.participants
        });
        
        console.log(`${userSessionData.userName} left session ${userSessionData.sessionId}`);
        
        // Clean up empty sessions
        if (session.participants.length === 0) {
          collaborationSessions.delete(userSessionData.sessionId);
          console.log(`Session ${userSessionData.sessionId} removed (no participants left)`);
        }
      }
    }
    
    // Clear user session data
    userSessionData = {
      userName: '',
      sessionId: '',
      language: ''
    };
  });

  // Add this new handler for testing broadcasts
  socket.on('force_broadcast_test', (data) => {
    const { sessionId, message, origin } = data;
    
    console.log(`Broadcast test request from ${socket.id} (${origin}) to room ${sessionId}`);
    console.log(`Message: ${message}`);
    
    // Log all sockets in the room
    const roomSockets = io.sockets.adapter.rooms.get(sessionId);
    console.log(`Room ${sessionId} has ${roomSockets ? roomSockets.size : 0} connected sockets:`);
    
    if (roomSockets) {
      for (const socketId of roomSockets) {
        console.log(`- Socket ${socketId} is in the room`);
      }
    }
    
    // Broadcast the test message to everyone else in the room
    socket.to(sessionId).emit('broadcast_test_received', {
      message,
      from: socket.id,
      origin,
      timestamp: new Date().toISOString()
    });
    
    // Also send confirmation to the sender
    socket.emit('broadcast_test_confirmed', {
      message: `Your test message was broadcast to ${roomSockets ? roomSockets.size - 1 : 0} other clients`,
      roomMembers: Array.from(roomSockets || [])
    });
  });

  // Add a basic hello world handler that doesn't rely on rooms
  socket.on('hello_world', (data) => {
    console.log('Hello world request received:', data);
    
    // Send direct response to this socket only
    socket.emit('hello_world_response', {
      message: 'Hello from server',
      serverTime: new Date().toISOString(),
      receivedData: data
    });
  });

  // Add these event handlers to your socket.io connection code
  socket.on('direct_test', (data) => {
    console.log('Received direct test from socket:', socket.id);
    console.log('Test data:', data);
    
    // Send response back to the SAME client
    socket.emit('direct_test_response', {
      message: `Server received: ${data.message}`,
      serverTimestamp: new Date().toISOString()
    });
    
    // Also try broadcasting to the session room
    if (data.sessionId) {
      console.log(`Broadcasting test message to room ${data.sessionId}`);
      socket.to(data.sessionId).emit('direct_test_response', {
        message: `Broadcast from ${socket.id}: ${data.message}`,
        serverTimestamp: new Date().toISOString()
      });
    }
  });

  socket.on('force_broadcast', (data) => {
    console.log('Forced broadcast received:', data);
    
    // Broadcast to ALL clients in the session INCLUDING sender
    io.in(data.sessionId).emit('force_broadcast_received', {
      code: data.code,
      timestamp: data.timestamp,
      sender: data.sender
    });
    
    // Log how many clients received this
    const roomSockets = io.sockets.adapter.rooms.get(data.sessionId);
    console.log(`Broadcast to ${roomSockets ? roomSockets.size : 0} clients in room ${data.sessionId}`);
  });

  socket.on('execute_code', ({ language, code }) => {
    // Execute the code based on the language
    executeCode(language, code, socket);
  });
});

// Add a simple health check endpoint
app.get('/socket-test', (req, res) => {
  res.send({
    status: 'ok',
    socketConnections: io.engine.clientsCount,
    rooms: Array.from(io.sockets.adapter.rooms.keys()),
    server: 'running'
  });
});

// Add this endpoint to verify socket connections
app.get('/socket-stats', (req, res) => {
  try {
    const stats = {
      connections: io.engine.clientsCount,
      rooms: {},
      sessionInfo: {}
    };
    
    // Add room information
    for (const [roomId, roomSet] of io.sockets.adapter.rooms.entries()) {
      // Skip socket ID rooms
      if (!roomSet.has(roomId)) {
        stats.rooms[roomId] = Array.from(roomSet);
      }
    }
    
    // Add session information
    for (const [sessionId, session] of collaborationSessions.entries()) {
      stats.sessionInfo[sessionId] = {
        participants: session.participants,
        language: session.language,
        codeLength: session.code ? session.code.length : 0
      };
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart server with explicit listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO server available at http://localhost:${PORT}`);
});
