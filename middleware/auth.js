const User = require("../models/User");

exports.checkAuth = async (req, res, next) => {
  const user = await User.findById(req.session.userid);
  if (!user) {
    return res.redirect("/login");
  }
  next();
};
