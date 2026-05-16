# Server Setup Guide

This guide explains how to set up the ChatApp backend from scratch, connect it to MongoDB, and run it locally.

## 1. Prerequisites
- Node.js 16 or newer
- npm
- A MongoDB database, either MongoDB Atlas or a local MongoDB installation

## 2. Prepare MongoDB

### Option A: MongoDB Atlas
1. Create or sign in to your MongoDB Atlas account.
2. Create a new project if needed.
3. Create a new cluster.
4. Create a database user under Database Access.
5. Allow your IP address under Network Access.
6. Create a database name for the app, for example `chatapp`.
7. Copy the connection string from Atlas.
8. Replace the placeholders in the URI with your username, password, cluster name, and database name.

Example:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority&appName=<app-name>
```

### Option B: Local MongoDB
1. Install MongoDB Community Server.
2. Start the MongoDB service.
3. Use a local URI such as:

```env
MONGO_URI=mongodb://127.0.0.1:27017/chatapp
```

## 3. Create the Environment File

Create a file named `.env` in this folder with these values:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/<database-name>?retryWrites=true&w=majority&appName=<app-name>
PORT=5000
```

Keep `.env` private. Only `.env.example` should be committed to GitHub.

## 4. Install Dependencies

From the `server` folder, run:

```bash
npm install
```

This installs the backend packages, including:
- `express`
- `socket.io`
- `mongoose`
- `multer`
- `dotenv`
- `nodemon`

## 5. Run the Server

Start the backend with:

```bash
npm run dev
```

The server will listen on the port in `.env` or default to `5000`.

## 6. What Happens On Startup
- The server connects to MongoDB using `MONGO_URI`
- It creates the chat message index if needed
- It removes any TTL index on the message collection so chat history is not auto-deleted
- It starts the Socket.io server for real-time messaging and calls

## 7. What Gets Stored In MongoDB
The `messages` collection stores chat history with fields such as:
- room
- author
- text
- file
- fileName
- isImage
- fileType
- seen
- seenAt
- time
- edited
- createdAt

## 8. What Should Not Be Pushed To GitHub
Do not commit these items:
- `.env`
- `node_modules/`
- `uploads/`

If they were already tracked, untrack them once with:

```bash
git rm --cached .env
git rm -r --cached node_modules
git rm -r --cached uploads
```

Then commit the cleanup.

## 9. Client Reminder
The frontend still needs the backend URL used by Socket.io and uploads. If you move the backend, update the client config files accordingly.

## 10. Troubleshooting
- If MongoDB connection fails, check the URI, username, password, database name, and network access rules.
- If messages disappear after some time, check Atlas for TTL indexes on the `messages` collection.
- If uploads fail, make sure the `uploads/` folder exists and is writable.
- If port 5000 is busy, change `PORT` in `.env`.
