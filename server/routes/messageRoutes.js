const express = require("express");
const {
    sendMessage,
    getMessages,
    markAsRead,
    reactToMessage,
    removeReaction,
    unsendMessage,
} = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, sendMessage);
router.get("/:chatId", protect, getMessages);
router.put("/read/:chatId", protect, markAsRead);
router.put("/reaction/:messageId", protect, reactToMessage);
router.delete("/reaction/:messageId", protect, removeReaction);
router.put("/unsend/:messageId", protect, unsendMessage);

module.exports = router;
