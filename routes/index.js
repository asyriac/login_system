const express = require("express");
const router = express.Router();

const { get_login, post_login, get_signup, post_signup, get_home, signout, get_resetPassword, post_resetPassword, get_forgotPassword, post_forgotPassword, get_forgotResetPassword, post_forgotResetPassword, get_activateAccount } = require("../controllers/index");
const { checkAuth } = require("../middleware/auth");

router.get("/login", get_login);
router.post("/login", post_login);
router.get("/sign-up", get_signup);
router.post("/sign-up", post_signup);
router.get("/home", checkAuth, get_home);
router.get("/sign-out", signout);
router.get("/reset-password", checkAuth, get_resetPassword);
router.post("/reset-password", checkAuth, post_resetPassword);
router.get("/forgot-password", get_forgotPassword);
router.post("/forgot-password", post_forgotPassword);
router.get("/resetpassword/:resettoken", get_forgotResetPassword);
router.post("/resetpassword/:resettoken", post_forgotResetPassword);
router.get("/activate/:activatetoken", get_activateAccount);

module.exports = router;
