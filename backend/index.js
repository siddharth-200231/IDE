const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const Docker = require('dockerode');
const cors = require('cors');
const connection = require('./db');
const userRouter = require('./routes/user');
require('dotenv').config();

const app = express();
app.use(cookieParser());
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  
  }
});

const docker = new Docker();

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
};

// Connect to MongoDB
connection();

// Routes
app.use('/user', userRouter);

// Socket.IO connection
io.on('connection', (socket) => {
  socket.on('execute_code', ({ language, code }) => {
    executeCode(language, code, socket);
  });
});

// Start server
server.listen( 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
