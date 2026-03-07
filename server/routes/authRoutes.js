const express = require("express");
const { signup, login, getMe, logout, checkUsername } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.get("/check-username/:username", checkUsername);

module.exports = router;
