const express = require('express');
const bodyParser = require('body-parser');
const { Server } = require('ws'); 
const { Client } = require('pg');
require('dotenv').config();

const db = new Client({ database: 'user' });
db.connect();

const app = express();
app.use(bodyParser.json());

const wss = new Server({ port: 9305 });
console.log('WebSocket server running on port 9305');

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  ws.on('message', (message) => {
    console.log('Received message from client:', message);
  });

  ws.send('Welcome! WebSocket connected.');
});

app.listen(9303, () => console.log('User service running on port 9303'));
