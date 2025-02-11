const express = require('express');
const app = express();
const cors = require('cors');

app.use(cors());
app.use(express.json());
const cookieParser = require('cookie-parser');
app.use(cookieParser());

const http = require('http');
const server = http.createServer(app);
const connection = require('./db');
const userRouter = require('./routes/user');

dotenv = require('dotenv');
dotenv.config();

const io = require('socket.io')
const socket = io(server);
connection();

app.use('/user', userRouter);


server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
