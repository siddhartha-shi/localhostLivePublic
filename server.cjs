// Import necessary modules
const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
var bodyParser = require("body-parser");

// Create an Express app
const app = express();
const server = http.createServer(app);

// Create a Socket.IO instance
const io = socketIO(server);

// let socketRef = null;
let responseRef = null;
let isSocketConnected = false;

// Define Socket.IO event handlers
io.on("connection", (socket) => {
  console.log("A client connected!: ", socket.id);
  isSocketConnected = true;
  // assign socket to global ref
  // socketRef = socket;

  socket.on("proxyResponse", (responseData) => {
    // console.log("A client received data.");
    if (responseRef && !responseRef.headersSent) {
      // Sending the response if it hasn't been sent yet
      responseRef.send(responseData.data);
      responseRef.end()
      responseRef = null;
    }
  });

  // Handle disconnection
  socket.on("proxyError", (error) => {
    if (responseRef && !responseRef.headersSent) {
      // Sending the response if it hasn't been sent yet
      responseRef.status(400)
      .send({error: 'localhost connection refused.', message: 'Please make sure that your localhost is live.'});
      responseRef.end();
      responseRef = null;
    }
    console.error("Error proxy data:", error);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    isSocketConnected = false;
    // socketRef = null;
    console.log("A client disconnected.");
  });
});

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(bodyParser.json());

// Custom middleware function to handle all requests
app.use((req, res, next) => {

  if (!isSocketConnected) {
     console.log("Socket not connected");
      res
        .status(200)
        .send({
          error: "Agent not connected.",
          message: "Please run your agent.",
        });
      return;
  }

  // assign res to global ref
  responseRef = res;
  
  io.emit("proxyRequest", {
    method: req.method,
    url: req.url,
    data: req.body,
    headers: req.headers,
  });
  // console.log({ method: req.method, url: req.url, data: req.body });

  // Maybe causing memory leacks.
  // socketRef.on("proxyResponse", (responseData) => {
  //   // console.log("A client received data.");
  //   if (!res?.headersSent) {
  //     // Sending the response if it hasn't been sent yet
  //     res?.send(responseData.data);
  //   }
  // });
});

// Start the server
// const PORT = process.env.PORT || 5001;
const PORT = process.env.YOUR_PORT || process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

server.on( "error", (err) => { 
  console.error(err);
  process.exit(1);
});
