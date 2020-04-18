const User = require("../models/User");
const crypto = require("crypto");
const request = require("request");
const activate_email_worker = require("../workers/activate_email_worker");
const reset_email_worker = require("../workers/reset_email_worker");
const queue = require("../config/kue");

// @desc    Login page
// @route   GET /login
module.exports.get_login = (req, res) => {
  if (req.session.userid) {
    return res.redirect("/home");
  }
  return res.render("login", {
    title: "Sign Up",
    errorMessage: req.flash("error"),
  });
};

// @desc    Login page
// @route   POST /login
module.exports.post_login = async (req, res) => {
  try {
    // Validate captcha
    if (req.body["g-recaptcha-response"] === undefined || req.body["g-recaptcha-response"] === "" || req.body["g-recaptcha-response"] === null) {
      req.flash("error", "Please select captcha");
      return res.redirect("back");
    }
    const verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + process.env.SECRET_KEY + "&response=" + req.body["g-recaptcha-response"] + "&remoteip=" + req.connection.remoteAddress;

    request(verificationUrl, function (error, resp, body) {
      body = JSON.parse(body);
      if (body.success !== undefined && !body.success) {
        req.flash("error", "Failed to validate captcha");
        return res.redirect("back");
      }
    });

    const { email, password } = req.body;
    const user = await User.find({ email });

    if (user.length === 0) {
      req.flash("error", "Invalid credentials.");
      return res.redirect("/login");
    }

    const isMatch = await user[0].matchPassword(password);
    if (!isMatch) {
      req.flash("error", "Invalid credentials.");
      return res.redirect("/login");
    }
    // Checking if user is activated
    const isActivated = await user[0].isActivated;
    if (!isActivated) {
      req.flash("error", "Account has not been activated");
      return res.redirect("/login");
    }

    req.session.userid = user[0].id;
    return res.redirect("/home");
  } catch (err) {
    console.log(err);
  }
};

// @desc    Sigup page
// @route   GET /sign-up
module.exports.get_signup = (req, res) => {
  if (req.session.userid) {
    return res.redirect("/home");
  }
  return res.render("signup", {
    title: "Sign Up",
    errorMessage: req.flash("error"),
  });
};

// @desc    Sigup page
// @route   POST /sign-up
module.exports.post_signup = async (req, res) => {
  if (req.body["g-recaptcha-response"] === undefined || req.body["g-recaptcha-response"] === "" || req.body["g-recaptcha-response"] === null) {
    req.flash("error", "Please select captcha");
    return res.redirect("back");
  }
  const verificationUrl = "https://www.google.com/recaptcha/api/siteverify?secret=" + process.env.SECRET_KEY + "&response=" + req.body["g-recaptcha-response"] + "&remoteip=" + req.connection.remoteAddress;

  request(verificationUrl, function (error, resp, body) {
    body = JSON.parse(body);
    if (body.success !== undefined && !body.success) {
      req.flash("error", "Failed to validate captcha");
      return res.redirect("back");
    }
  });
  const { username, email, password, cpassword } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    if (password !== cpassword) {
      req.flash("error", "Passwords do not match");
      return res.redirect("back");
    }
    const user = await User.create({ username, email, password });
    const activationToken = user.getActivateAccountToken();
    await user.save();
    const activateUrl = `${req.protocol}://${req.headers.host}/activate/${activationToken}`;
    const message = `Click on the below link to activate your account. ${activateUrl}`;

    // Add mail to queue
    queue
      .create("activate-email", {
        email: user.email,
        subject: "Activate account",
        message,
      })
      .save();
    req.flash("error", "Activate your account");
    return res.redirect("/login");
  } else {
    req.flash("error", "Username already exists");
    return res.redirect("back");
  }
};

// @desc    Home page
// @route   GET /home
module.exports.get_home = async (req, res) => {
  const user = await User.findById(req.session.userid);
  return res.render("home", {
    title: "Home",
    username: user.username,
  });
};

// @desc    Signout page
// @route   POST /sign-out
module.exports.signout = (req, res) => {
  req.session.destroy();
  return res.redirect("/login");
};

// @desc    Reset password after login page
// @route   GET /reset-password
module.exports.get_resetPassword = async (req, res) => {
  const user = await User.findById(req.session.userid);
  return res.render("reset", {
    title: "Reset password",
    username: user.username,
    errorMessage: req.flash("error"),
  });
};

// @desc    Reset password after login page
// @route   POST /reset-password
module.exports.post_resetPassword = async (req, res) => {
  const { password, cpassword } = req.body;
  if (password !== cpassword) {
    req.flash("error", "Passwords do not match");
    return res.redirect("back");
  }
  const user = await User.findById(req.session.userid);
  user.password = password;
  await user.save();
  return res.redirect("/home");
};

// @desc   Forgot password page
// @route   GET /forgot-password
module.exports.get_forgotPassword = async (req, res) => {
  return res.render("forgot", {
    title: "Reset password",
    errorMessage: req.flash("error"),
  });
};

// @desc   Forgot password page
// @route   POST /forgot-password
module.exports.post_forgotPassword = async (req, res) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    req.flash("error", "User with email does not exist.");
    return res.redirect("back");
  }

  const resetToken = user.getResetPasswordToken();
  await user.save();

  const resetUrl = `${req.protocol}://${req.headers.host}/resetpassword/${resetToken}`;
  const message = `Someone has requested a link to change your password. You can do this through the link below. ${resetUrl}`;

  // Add to queue reset email
  queue
    .create("reset-email", {
      email: user.email,
      subject: "Activate account",
      message,
    })
    .save();
  req.flash("error", "Reset link sent to email.");
  return res.redirect("/login");
};

// @desc   Reset password without login page
// @route   GET /resetpassword/:resettoken
module.exports.get_forgotResetPassword = async (req, res) => {
  return res.render("forgot_reset", {
    title: "Reset password",
    errorMessage: req.flash("error"),
    link: req.params.resettoken,
  });
};

// @desc   Reset password without login page
// @route   POST /resetpassword/:resettoken
module.exports.post_forgotResetPassword = async (req, res) => {
  const resetPasswordToken = crypto.createHash("sha256").update(req.params.resettoken).digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    return res.redirect("/login");
  }

  const { password, cpassword } = req.body;
  if (password !== cpassword) {
    return res.redirect("back");
  }

  // Updatae the password and remove reset password fields
  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  req.flash("error", "Password reset successfully. Please login.");
  return res.redirect("/login");
};

// @desc   Activate account page
// @route  GET /activate/:activatetoken
module.exports.get_activateAccount = async (req, res) => {
  const activateAccountToken = crypto.createHash("sha256").update(req.params.activatetoken).digest("hex");
  const user = await User.findOne({
    activateAccountToken,
  });
  if (!user) {
    req.flash("error", "Invalid link.");
    return res.redirect("/login");
  }
  user.isActivated = true;
  user.activateAccountToken = undefined;
  await user.save();
  req.flash("error", "Account activated. Please login.");
  return res.redirect("/login");
};
