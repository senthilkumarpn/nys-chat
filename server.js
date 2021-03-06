var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var socket = require('socket.io');
var mongodb = require('./server/routes/mongodb/mongo.api');
var filesystem = require('./server/filesystem/chat.storage');
var cors = require('cors');

app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ limit: '1mb', extended: false }));

// Angular DIST output folder
app.use(express.static(path.join(__dirname, 'dist/nys-chat')));

//mongo api
app.use('/mongodb', mongodb);
app.use('/chatfiles', express.static(path.join(__dirname, 'server/filesystem/chats')));

// Send all other requests to the Angular app
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist/nys-chat/index.html'));
});

//setting port and starting server
const port = process.env.PORT || '3000';
var server = app.listen(port, () => { console.log(`Running on localhost:${port}`) });

//Socket setup
var socket_io = socket(server);
var users = {};
socket_io.on('connection', function (socket) {
    console.log('new socket connection made');

    //creating online usere
    socket.on('login', function(data){
        users[socket.id] = data;
        socket_io.sockets.emit('online',Object.values(users));
    });

    // Handle chat event
    socket.on('chat', function (data) {
        socket_io.sockets.emit('chat', data);
        filesystem.storeChat(data);
    });
    //Handle type event
    socket.on('typing', function (data) {
        socket_io.sockets.emit('typing', data);
    });
    //Handle delete chat event
    socket.on('deletechat', function (data) {
        filesystem.deleteChat(data, function () {
            socket_io.emit('chatDeleted', data);
        });
    });

    //removing online user
    socket.on('disconnect', function(){
        delete users[socket.id];
        socket_io.sockets.emit('online',Object.values(users));
    });

    //removing online user
    socket.on('logout', function(){
        delete users[socket.id];
        socket_io.sockets.emit('online',Object.values(users));
    });
});