const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); // 👈 оборачиваем сервер
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb+srv://igorprobnyj:WJZLfLPRuvEodhGA@cluster0.wnlc6d1.mongodb.net/chat?retryWrites=true&w=majority')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error', err));

const messageSchema = new mongoose.Schema({
  clientId: String,
  text: String,
  from: String,
  timestamp: Date,
});

const Message = mongoose.model('Message', messageSchema);

app.get('/api/chats', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).lean();
    const chats = {};
    for (const msg of messages) {
      if (!chats[msg.clientId]) {
        chats[msg.clientId] = [];
      }
      chats[msg.clientId].push(msg);
    }

    const result = Object.entries(chats).map(([clientId, messages]) => ({
      clientId,
      messages,
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении чатов' });
  }
});

app.post('/api/messages', async (req, res) => {
  const { clientId, text } = req.body;

  if (!clientId || !text) {
    return res.status(400).json({ error: 'clientId и text обязательны' });
  }

  try {
    const message = new Message({
      clientId,
      text,
      from: 'manager',
      timestamp: new Date(),
    });

    await message.save();

    // 🔴 отправка через socket.io
    io.emit('newMessage', message);

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Ошибка при сохранении сообщения:', error);
    res.status(500).json({ error: 'Ошибка при сохранении сообщения' });
  }
});

io.on('connection', socket => {
  console.log('Менеджер подключился через Socket.IO');
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`Manager backend running on http://localhost:${PORT}`);
});
