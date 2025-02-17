const express = require('express');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const Docker = require('dockerode');
const cors = require('cors');
const connection = require('./db');
const userRouter = require('./routes/user');
require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

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
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }

    const fileName = `temp.${language}`;
    const filePath = path.join(tempDir, fileName);

    // Write code to a temporary file
    fs.writeFileSync(filePath, code);

    let command;
    switch (language) {
      case 'python':
        command = `python ${filePath}`;
        break;
      case 'java':
        const javaFilePath = path.join(tempDir, 'Main.java');
        fs.writeFileSync(javaFilePath, code);
        command = `javac ${javaFilePath} && java -cp ${tempDir} Main`;
        break;
      case 'javascript':
        command = `node ${filePath}`;
        break;
      default:
        throw new Error('Unsupported language');
    }

    socket.emit('execution_status', 'Running code...');
    exec(command, (error, stdout, stderr) => {
      if (error) {
        socket.emit('execution_error', stderr || error.message);
        return;
      }
      socket.emit('code_output', stdout);
      socket.emit('execution_complete');
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
server.listen( process.env.port, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
