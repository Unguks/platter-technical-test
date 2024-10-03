const express = require('express');
const bodyParser = require('body-parser');
const amqp = require('amqplib/callback_api'); 
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const { Client } = require('pg');
const db = new Client({ database: 'product' });
db.connect();

app.post('/product/check-out', async (req, res) => {
  const { productId, qty, userId } = req.body;

  try {
    await db.query('BEGIN');
    const result = await db.query('UPDATE products SET qty = qty - $1 WHERE id = $2 RETURNING *', [qty, productId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = result.rows[0];
    const message = {
      productId: product.id,
      userId: userId,
      qty: qty,
      price: product.price,
    };

    amqp.connect('amqp://localhost', (error0, connection) => {
      if (error0) throw error0;
      connection.createChannel((error1, channel) => {
        if (error1) throw error1;
        const queue = 'paymentQueue';
        channel.assertQueue(queue, { durable: false });
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
        console.log(`Sent message to Payment: ${JSON.stringify(message)}`);
      });
    });

    await db.query('COMMIT');
    return res.status(200).json({ message: 'Product quantity updated and sent to payment service.' });

  } catch (err) {
    await db.query('ROLLBACK');
    return res.status(500).json({ error: 'Transaction failed' });
  }
});

app.listen(9301, () => console.log('Product service running on port 9301'));
