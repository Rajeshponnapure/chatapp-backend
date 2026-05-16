const express =
  require('express');

const http =
  require('http');

const cors =
  require('cors');

const multer =
  require('multer');

const path =
  require('path');

const fs =
  require('fs');

const {
  Server
} = require('socket.io');

const {
  v4: uuidv4
} = require('uuid');

const mongoose = require('mongoose');
require('dotenv').config();

const Message = require('./models/Message');

const inspectAndFixMessageIndexes = async () => {
  try {
    const indexes = await Message.collection.indexes();
    const ttlIndexes = indexes.filter(
      (index) => typeof index.expireAfterSeconds === 'number'
    );

    if (ttlIndexes.length) {
      console.warn('[MessageModel] TTL index detected. Older messages may be auto-deleted:', ttlIndexes);

      for (const index of ttlIndexes) {
        await Message.collection.dropIndex(index.name);
        console.warn(`[MessageModel] Dropped TTL index: ${index.name}`);
      }
    }

    await Message.collection.createIndex({ room: 1, createdAt: 1 });
  } catch (error) {
    console.error('[MessageModel] Failed to inspect/fix indexes:', error);
  }
};

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await inspectAndFixMessageIndexes();
  })
  .catch(err => console.error('MongoDB connection error:', err));

const app =
  express();

const server =
  http.createServer(app);

app.use(cors());

app.use(express.json());

/*
=====================
UPLOADS FOLDER
=====================
*/

const uploadsDir =
  path.join(
    __dirname,
    'uploads'
  );

if (
  !fs.existsSync(
    uploadsDir
  )
) {

  fs.mkdirSync(
    uploadsDir
  );

}

/*
=====================
STATIC FILES
=====================
*/

app.use(
  '/uploads',

  express.static(
    uploadsDir
  )
);

/*
=====================
MULTER
=====================
*/

const storage =
  multer.diskStorage({

    destination:
      (req, file, cb) => {

        cb(
          null,
          uploadsDir
        );

      },

    filename:
      (req, file, cb) => {

        cb(

          null,

          Date.now() +
          '-' +
          file.originalname

        );

      }

  });

const upload =
  multer({

    storage

  });

/*
=====================
UPLOAD ROUTE
=====================
*/

app.post(
  '/upload',

  upload.single(
    'file'
  ),

  (req, res) => {

    res.json({

      file:
        `https://chatapp-backend-kxir.onrender.com/uploads/${req.file.filename}`

    });

  }
);

/*
=====================
SOCKET
=====================
*/

const io =
  new Server(server, {

    cors: {

      origin:
        'http://localhost:5173',

      methods:
        ['GET', 'POST']

    }

  });

let users = [];

const normalizeRoom = (room = '') =>
  String(room)
    .trim()
    .toUpperCase();

const normalizeName = (name = '') =>
  String(name)
    .trim();

const getRoomUsers =
  (room) => {

    return users.filter(
      (user) =>
        user.room === room
    );

  };

io.on(
  'connection',
  (socket) => {

    /*
    =====================
    JOIN ROOM
    =====================
    */

    socket.on(
      'joinRoom',
      async ({ name, room }) => {

        const normalizedRoom = normalizeRoom(room);
        const normalizedName = normalizeName(name);

        if (!normalizedRoom || !normalizedName) {
          return;
        }

        users =
          users.filter(
            (user) =>
              user.id !== socket.id
          );

        users.push({

          id:
            socket.id,

          name: normalizedName,

          room: normalizedRoom

        });

        socket.join(normalizedRoom);

        try {
          const messages = await Message.find({ room: normalizedRoom }).sort({ createdAt: 1 });
          
          io.to(normalizedRoom).emit(
            'onlineUsers',
            getRoomUsers(normalizedRoom)
          );

          socket.emit(
            'previousMessages',
            messages
          );
        } catch (error) {
          console.error('Error fetching previous messages:', error);
        }

      }
    );

    /*
    =====================
    SEND MESSAGE
    =====================
    */

    socket.on(
      'sendMessage',
      async (message) => {
        try {
          const normalizedRoom = normalizeRoom(message.room);

          if (!normalizedRoom) {
            return;
          }

          const newMessage = new Message({
            ...message,
            room: normalizedRoom,
            author: normalizeName(message.author),
            seen: false
          });

          const savedMessage = await newMessage.save();

          io.to(
            normalizedRoom
          ).emit(
            'message',
            savedMessage
          );
        } catch (error) {
          console.error('Error saving message:', error);
        }
      }
    );

    /*
    =====================
    EDIT MESSAGE
    =====================
    */

    socket.on(
      'editMessage',
      async ({
        room,
        messageId,
        newText
      }) => {
        try {
          const normalizedRoom = normalizeRoom(room);

          if (!normalizedRoom || !messageId) {
            return;
          }

          await Message.findByIdAndUpdate(messageId, {
            text: newText,
            edited: true // Note: You might want to add 'edited' to your schema if you want to track it
          });

          const updatedMessages = await Message.find({ room: normalizedRoom }).sort({ createdAt: 1 });

          io.to(normalizedRoom).emit(
            'messagesUpdated',
            updatedMessages
          );
        } catch (error) {
          console.error('Error editing message:', error);
        }
      }
    );

    /*
    =====================
    DELETE MESSAGE
    =====================
    */

    socket.on(
      'deleteMessage',
      async ({
        room,
        messageId
      }) => {
        try {
          console.warn('deleteMessage blocked: message deletion is disabled to preserve chat history.');
        } catch (error) {
          console.error('Error deleting message:', error);
        }
      }
    );

    /*
    =====================
    MESSAGE SEEN
    =====================
    */

    socket.on(
      'messageSeen',
      async ({
        room,
        messageId
      }) => {
        try {
          const normalizedRoom = normalizeRoom(room);

          if (!normalizedRoom || !messageId) {
            return;
          }

          await Message.findByIdAndUpdate(messageId, {
            seen: true,
            seenAt: new Date()
          });

          const updatedMessages = await Message.find({ room: normalizedRoom }).sort({ createdAt: 1 });

          io.to(normalizedRoom).emit(
            'messagesUpdated',
            updatedMessages
          );
        } catch (error) {
          console.error('Error updating message seen status:', error);
        }
      }
    );

    /*
    =====================
    TYPING
    =====================
    */

    socket.on(
      'typing',
      ({ room, name }) => {

        const normalizedRoom = normalizeRoom(room);
        const normalizedName = normalizeName(name);

        if (!normalizedRoom || !normalizedName) {
          return;
        }

        socket.to(normalizedRoom).emit(
          'typing',
          normalizedName
        );

      }
    );

    /*
    =====================
    CALL USER
    =====================
    */

    socket.on(
      'call-user',
      (data) => {

        io.to(
          data.userToCall
        ).emit(
          'incoming-call',
          {

            signal:
              data.signalData,

            from:
              data.from,

            name:
              data.name,

            callType:
              data.callType

          }
        );

      }
    );

    /*
    =====================
    ANSWER CALL
    =====================
    */

    socket.on(
      'answer-call',
      (data) => {

        io.to(
          data.to
        ).emit(
          'call-accepted',

          data.signal
        );

      }
    );

    /*
    =====================
    END CALL
    =====================
    */

    socket.on(
      'end-call',
      (data) => {

        io.to(
          data.to
        ).emit(
          'call-ended'
        );

      }
    );

    /*
    =====================
    CLEAR CHAT
    =====================
    */

    socket.on(
      'clearChat',
      async (room) => {
        try {
          const normalizedRoom = normalizeRoom(room);
          console.warn(`clearChat blocked for room ${normalizedRoom || '(invalid)'}: room clearing is disabled to preserve chat history.`);
        } catch (error) {
          console.error('Error clearing chat:', error);
        }
      }
    );

    /*
    =====================
    LEAVE ROOM
    =====================
    */

    socket.on(
      'leaveRoom',
      () => {

        const user =
          users.find(
            (u) =>
              u.id ===
              socket.id
          );

        if (user) {

          users =
            users.filter(
              (u) =>
                u.id !== socket.id
            );

          io.to(
            user.room
          ).emit(
            'onlineUsers',

            getRoomUsers(
              user.room
            )
          );

        }

      }
    );

    /*
    =====================
    DISCONNECT
    =====================
    */

    socket.on(
      'disconnect',
      () => {

        const user =
          users.find(
            (u) =>
              u.id ===
              socket.id
          );

        if (user) {

          users =
            users.filter(
              (u) =>
                u.id !== socket.id
            );

          io.to(
            user.room
          ).emit(
            'onlineUsers',

            getRoomUsers(
              user.room
            )
          );

        }

      }
    );

  }
);

const PORT = process.env.PORT || 5000;

server.listen(
  PORT,
  () => {

    console.log(
      `SERVER RUNNING ON ${PORT}`
    );

  }
);