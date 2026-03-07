const express = require("express");
const multer = require("multer");
const {
    sendMessage,
    getMessages,
    markAsRead,
    reactToMessage,
    removeReaction,
    unsendMessage,
    deleteForMe,
    sendMediaMessage,
} = require("../controllers/messageController");
const { protect } = require("../middleware/auth");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

router.post("/", protect, sendMessage);
router.post("/media", protect, upload.single("media"), sendMediaMessage);
router.get("/:chatId", protect, getMessages);
router.put("/read/:chatId", protect, markAsRead);
router.put("/reaction/:messageId", protect, reactToMessage);
router.delete("/reaction/:messageId", protect, removeReaction);
router.delete("/unsend/:messageId", protect, unsendMessage);
router.delete("/:messageId/delete-for-me", protect, deleteForMe);

module.exports = router;
