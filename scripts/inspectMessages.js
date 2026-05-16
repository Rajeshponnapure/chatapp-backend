const mongoose = require('mongoose');
require('dotenv').config();
const Message = require('../models/Message');

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI not found in server/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);

  const total = await Message.countDocuments();
  const rooms = await Message.distinct('room');
  const authors = await Message.distinct('author');
  const recent = await Message.find().sort({ createdAt: -1 }).limit(20).lean();

  console.log('=== Messages Overview ===');
  console.log('Total messages:', total);
  console.log('Distinct rooms:', rooms.length ? rooms.join(', ') : '(none)');
  console.log('Distinct authors:', authors.length ? authors.join(', ') : '(none)');
  console.log('\n=== Recent messages (up to 20) ===');

  recent.forEach((m, i) => {
    console.log(`\n#${i + 1} id: ${m._id}`);
    console.log(`room: ${m.room}`);
    console.log(`author: ${m.author}`);
    console.log(`text: ${m.text || ''}`);
    if (m.file) console.log(`file: ${m.file}`);
    console.log(`createdAt: ${m.createdAt}`);
  });

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Error querying messages:', err);
  process.exit(1);
});
