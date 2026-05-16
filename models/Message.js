const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  room: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    default: '',
  },
  file: {
    type: String,
    default: '',
  },
  fileName: {
    type: String,
    default: '',
  },
  isImage: {
    type: Boolean,
    default: false,
  },
  fileType: {
    type: String,
    default: '',
  },
  seen: {
    type: Boolean,
    default: false,
  },
  seenAt: {
    type: Date,
    default: null,
  },
  time: {
    type: String,
    default: '',
  },
  edited: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual for id to match frontend expectation
MessageSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

// Ensure virtuals are serialized
MessageSchema.set('toJSON', {
  virtuals: true,
});

module.exports = mongoose.model('Message', MessageSchema);