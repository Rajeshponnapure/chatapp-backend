# ChatApp Server

This folder contains the backend for ChatApp.

## What the server does
- Runs the Express API and Socket.io real-time server
- Connects to MongoDB through Mongoose
- Stores chat messages in the `messages` collection
- Handles file uploads through `multer`
- Serves uploaded files from the `uploads` folder

## Folder Overview
- `index.js` - Main server entry point
- `models/` - Mongoose models, including the message schema
- `uploads/` - Runtime file uploads served to clients
- `.env` - Local secrets and environment values, never commit this file
- `.env.example` - Safe template you can copy to create your own `.env`

## Git Ignore Rules
This folder includes a [`.gitignore`](./.gitignore) file so that these items stay out of GitHub:
- `node_modules/`
- `.env`
- `uploads/`
- log files

If any of these files were already tracked before, remove them from Git history tracking with:

```bash
git rm --cached .env
git rm -r --cached node_modules
git rm -r --cached uploads
```

## Main Runtime Files
- [index.js](./index.js)
- [models/Message.js](./models/Message.js)
- [.env.example](./.env.example)
- [.gitignore](./.gitignore)

## Notes
The server now also checks MongoDB message indexes at startup and removes TTL indexes from the message collection so chat history is not automatically deleted after a few hours.
