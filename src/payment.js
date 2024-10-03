const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib/callback_api');
const { Client } = require('pg');
require('dotenv').config();

const db = new Client({ database: 'payment' });
db.connect();

const app = express();
app.use(bodyParser.json());

const consumePaymentQueue = () => {
  amqp.connect('amqp://localhost', (error0, connection) => {
    if (error0) throw error0;
    connection.createChannel((error1, channel) => {
      if (error1) throw error1;
      const queue = 'paymentQueue';

      channel.assertQueue(queue, { durable: false });
      console.log("Waiting for messages in %s", queue);

      channel.consume(queue, async (msg) => {
        const data = JSON.parse(msg.content.toString());
        console.log(`Received message from Product: ${JSON.stringify(data)}`);

        const { productId, userId, qty, price } = data;
        const bill = qty * price;

        try {
          const query = 'INSERT INTO payments(product_id, user_id, qty, bill) VALUES($1, $2, $3, $4) RETURNING *';
          const values = [productId, userId, qty, bill];
          const result = await db.query(query, values);

          console.log('Payment record inserted:', result.rows[0]);

          const notificationMessage = {
            userId: userId,
            productId: productId,
            qty: qty,
            bill: bill,
          };

          channel.assertQueue('notificationQueue', { durable: false });
          channel.sendToQueue('notificationQueue', Buffer.from(JSON.stringify(notificationMessage)));
          console.log('Sent message to Notification service:', notificationMessage);
        } catch (err) {
          console.error('Error while inserting payment:', err);
        }
      }, { noAck: true });
    });
  });
};

consumePaymentQueue();

app.listen(9302, () => console.log('Payment service running on port 9302'));
