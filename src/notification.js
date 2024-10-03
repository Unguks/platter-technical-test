const express = require('express');
const amqp = require('amqplib/callback_api'); 
const WebSocket = require('ws'); 
require('dotenv').config();

const app = express();

const ws = new WebSocket('ws://localhost:9305');

const consumeNotificationQueue = () => {
  amqp.connect('amqp://localhost', (error0, connection) => {
    if (error0) throw error0;
    connection.createChannel((error1, channel) => {
      if (error1) throw error1;
      const queue = 'notificationQueue';

      channel.assertQueue(queue, { durable: false });
      console.log("Waiting for messages in %s", queue);

      channel.consume(queue, (msg) => {
        const notificationData = JSON.parse(msg.content.toString());
        console.log('Received notification from Payment:', notificationData);

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notificationData));
          console.log('Notification sent to User via WebSocket:', notificationData);
        }
      }, { noAck: true });
    });
  });
};

consumeNotificationQueue();

app.listen(9304, () => console.log('Notification service running on port 9304'));
