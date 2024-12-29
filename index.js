const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
const Session = require("./models/sessionModel");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.error("MongoDB connection error:", error));

// Middleware to parse JSON requests
app.use(express.json());
app.use(cors({ origin: "*" }));
app.use("/auth", authRoutes);

// Middleware to authenticate WebSocket connections
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (!token) {
    return next(new Error("Authentication error: Token is required"));
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error("Authentication error: Invalid token"));
    }
    socket.user = decoded;
    next();
  });
});

// WebSocket Events for Real-Time Updates
io.on("connection", (socket) => {
  console.log("A user connected:", socket.user.username);

  let userSessionId = null;

  // Broadcast drawing data to all clients
  socket.on("draw", (data) => {
    if (userSessionId) {
      io.to(userSessionId).emit("draw", data);
    }
  });

  // Broadcast color change to all clients
  socket.on("colorChange", (color) => {
    if (userSessionId) {
      io.to(userSessionId).emit("colorChange", color);
    }
  });

  // Broadcast erase event to all clients
  socket.on("erase", (data) => {
    if (userSessionId) {
      io.to(userSessionId).emit("erase", data);
    }
  });

  // User joins a session
  socket.on("joinSession", (sessionId) => {
    Session.findById(sessionId)
      .then((sessionData) => {
        if (!sessionData) {
          return socket.emit("sessionState", { error: "Session not found" });
        }

        userSessionId = sessionId;

        socket.join(sessionId);
        socket.emit("sessionState", sessionData);

        socket.broadcast.to(sessionId).emit("userJoined", socket.user.username);
      })
      .catch((err) =>
        socket.emit("sessionState", { error: "Error retrieving session" })
      );
  });

  // Broadcast when a user leaves a session
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.user.username);

    if (userSessionId) {
      io.to(userSessionId).emit("userLeft", socket.user.username);
      socket.leave(userSessionId);
    }
  });
});

// Start the server
const port = process.env.PORT || 5000;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
