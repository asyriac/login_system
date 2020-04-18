// Import library
const mongoose = require("mongoose");

// Connecting to DB
const connectDB = async function () {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connection established to DB");
  } catch (err) {
    console.log(`Error establishing connection to db. ${err.message}`);
  }
};

module.exports = connectDB;
