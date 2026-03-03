const express = require("express");
const {
    accessChat,
    getChats,
    createGroupChat,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, accessChat);
router.get("/", protect, getChats);
router.post("/group", protect, createGroupChat);

module.exports = router;
