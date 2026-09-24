const express = require("express");
const { getMe, logout, checkUsername, googleLogin } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/google", googleLogin);
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.get("/check-username/:username", checkUsername);

module.exports = router;
