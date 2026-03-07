const express = require("express");
const {
    accessChat,
    getChats,
    createGroupChat,
    clearChat,
    deleteChat,
} = require("../controllers/chatController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, accessChat);
router.get("/", protect, getChats);
router.post("/group", protect, createGroupChat);
router.delete("/:chatId/clear", protect, clearChat);
router.delete("/:chatId", protect, deleteChat);

module.exports = router;
