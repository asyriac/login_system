const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Schema for user
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  activateAccountToken: String,
  isActivated: {
    type: Boolean,
    default: false,
  },
});

// Encrypt password
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  const answer = await bcrypt.compare(enteredPassword, this.password);
  return answer;
};

// Create and hash the password token
UserSchema.methods.getActivateAccountToken = function () {
  // Generate token
  const accountToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to activateAccountToken token field
  this.activateAccountToken = crypto.createHash("sha256").update(accountToken).digest("hex");

  return accountToken;
};

// Create and hash the password token
UserSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPassword token field
  this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");

  //  Expiry time
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
