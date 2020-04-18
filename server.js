const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const session = require("express-session");
const mongodbstore = require("connect-mongodb-session")(session);
const db = require("./config/mongoose");

// Loading enviroment variables
dotenv.config({ path: "./config/config.env" });
const PORT = process.env.PORT;

// Connecting database
db();

const app = express();
const store = new mongodbstore({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});
//Static folder
app.use(express.static("public"));
app.use(cookieParser());
app.set("view engine", "ejs");
app.set("views", "./views");
app.use(
  session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(flash());

// Handling routes
app.use("/", require("./routes/index"));

// Starting the server
app.listen(PORT, (err) => {
  if (err) {
    console.log("Error starting server");
  } else console.log(`Server started on port ${PORT}`);
});
