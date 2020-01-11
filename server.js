const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const sio = require('socket.io');
const favicon = require('serve-favicon');
const compression = require('compression');

const app = express(),
  options = { 
    key: fs.readFileSync(__dirname + '/rtc-video-room-key.pem'),
    cert: fs.readFileSync(__dirname + '/rtc-video-room-cert.pem')
  },
  port = process.env.PORT || 3000,
  //to be adapt to your own case
  server = process.env.NODE_ENV === 'production' ?
    http.createServer(app).listen(port, '0.0.0.0') :
    http.createServer(app).listen(port, '0.0.0.0'),
  io = sio(server);

// compress all requests
app.use(compression());
app.use(express.static(path.join(__dirname, 'dist')));
app.use((req, res) => res.sendFile(__dirname + '/dist/index.html'));
app.use(favicon('./dist/favicon.ico'));
// Switch off the default 'X-Powered-By: Express' header
app.disable('x-powered-by');

//config is done, we listen for connections
io.sockets.on('connection', socket => {
  let room = '';
  const create = err => {
    if (err) {
      return console.log(err);
    }
    socket.join(room);
    socket.emit('create');
  };

  // sending to all clients in the room (channel) except sender
  socket.on('message', (message) => {
    if(message === undefined || message === null) return;
    const url = socket.request.headers.referer.split('/');
    room = url[url.length - 1];
    console.log(room);
    socket.to(room).emit('message');
    socket.to(room).emit('message', message);
  });

  socket.on('find', (data) => {
    console.log('find: ', data);
    const url = socket.request.headers.referer.split('/');
    room = url[url.length - 1];
    console.log(room);
    const sr = io.sockets.adapter.rooms[room];
    console.log(sr);
    if (sr === undefined) {
      // no room with such name is found so create it
      socket.join(room);
      socket.emit('create');
    } else if (sr.length === 1) {
      console.log('guest connected');
      socket.join(room);
      socket.to(room).emit('guest connected');
      socket.emit('join');
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('auth', data => {
    console.log('auth: ', data);
    data.sid = socket.id;
    console.log(data);
    console.log(room);
    console.log(socket.broadcast.to(room));
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('approve', data);
    console.log('emitted approval');
  });

  socket.on('accept', id => {
    console.log('accept: ', id);
    io.sockets.connected[id].join(room);
    // sending to all clients in 'game' room(channel), include sender
    io.in(room).emit('bridge');
  });

  socket.on('reject', () => socket.emit('full'));
  
  socket.on('leave', () => {
    console.log('leave: ');
    // sending to all clients in the room (channel) except sender
    socket.broadcast.to(room).emit('hangup');
    socket.leave(room);});
});