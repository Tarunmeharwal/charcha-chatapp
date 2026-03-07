const Message = require("../models/Message");
const Chat = require("../models/Chat");

const populateMessageQuery = (query) =>
    query
        .populate("sender", "username profilePic")
        .populate("chat")
        .populate("reactions.user", "username profilePic")
        .populate({
            path: "replyTo",
            select: "content sender isUnsent createdAt",
            populate: { path: "sender", select: "username profilePic" },
        });

const populateMessageDoc = async (message) => {
    await message.populate("sender", "username profilePic");
    await message.populate("chat");
    await message.populate("reactions.user", "username profilePic");
    await message.populate({
        path: "replyTo",
        select: "content sender isUnsent createdAt",
        populate: { path: "sender", select: "username profilePic" },
    });
    return message;
};

const isUserInChat = async (chatId, userId) => {
    const chat = await Chat.findById(chatId).select("users");
    if (!chat) {
        return false;
    }
    return chat.users.some((id) => id.toString() === userId.toString());
};

// @desc    Send a message
// @route   POST /api/messages
const sendMessage = async (req, res) => {
    try {
        const { content, chatId, replyTo } = req.body;

        if (!content || !chatId) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const canSend = await isUserInChat(chatId, req.user._id);
        if (!canSend) {
            return res.status(403).json({ message: "Access denied" });
        }

        let replyToMessageId = null;
        if (replyTo) {
            const replyMessage = await Message.findById(replyTo).select("chat");
            if (!replyMessage) {
                return res.status(404).json({ message: "Reply message not found" });
            }
            if (replyMessage.chat.toString() !== chatId.toString()) {
                return res.status(400).json({ message: "Reply message must be from same chat" });
            }
            replyToMessageId = replyMessage._id;
        }

        let message = await Message.create({
            sender: req.user._id,
            content,
            chat: chatId,
            replyTo: replyToMessageId,
            readBy: [req.user._id],
        });

        message = await populateMessageDoc(message);
        message = await Message.populate(message, {
            path: "chat.users",
            select: "username profilePic",
        });

        // Update latest message in chat
        await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get messages for a chat
// @route   GET /api/messages/:chatId
const getMessages = async (req, res) => {
    try {
        const canAccess = await isUserInChat(req.params.chatId, req.user._id);
        if (!canAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        const messages = await populateMessageQuery(
            Message.find({
                chat: req.params.chatId,
                deletedBy: { $ne: req.user._id }
            }).sort({ createdAt: 1 })
        );

        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark messages as read
// @route   PUT /api/messages/read/:chatId
const markAsRead = async (req, res) => {
    try {
        const canAccess = await isUserInChat(req.params.chatId, req.user._id);
        if (!canAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        await Message.updateMany(
            {
                chat: req.params.chatId,
                readBy: { $ne: req.user._id },
            },
            { $push: { readBy: req.user._id } }
        );

        res.json({ message: "Messages marked as read" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add/update reaction on a message
// @route   PUT /api/messages/reaction/:messageId
const reactToMessage = async (req, res) => {
    try {
        const { emoji } = req.body;
        if (!emoji || typeof emoji !== "string") {
            return res.status(400).json({ message: "Emoji is required" });
        }

        const message = await Message.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }
        if (message.isUnsent) {
            return res.status(400).json({ message: "Cannot react to unsent message" });
        }

        const canAccess = await isUserInChat(message.chat, req.user._id);
        if (!canAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        const existingReactionIndex = message.reactions.findIndex(
            (reaction) => reaction.user.toString() === req.user._id.toString()
        );

        if (existingReactionIndex >= 0) {
            message.reactions[existingReactionIndex].emoji = emoji;
            message.reactions[existingReactionIndex].createdAt = new Date();
        } else {
            message.reactions.push({
                user: req.user._id,
                emoji,
            });
        }

        await message.save();

        const updatedMessage = await populateMessageQuery(
            Message.findById(req.params.messageId)
        );

        res.json(updatedMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove reaction from a message
// @route   DELETE /api/messages/reaction/:messageId
const removeReaction = async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const canAccess = await isUserInChat(message.chat, req.user._id);
        if (!canAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        message.reactions = message.reactions.filter(
            (reaction) => reaction.user.toString() !== req.user._id.toString()
        );
        await message.save();

        const updatedMessage = await populateMessageQuery(
            Message.findById(req.params.messageId)
        );

        res.json(updatedMessage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Unsend my message (Full Deletion)
// @route   DELETE /api/messages/unsend/:messageId
const unsendMessage = async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        if (message.sender.toString() !== req.user._id.toString()) {
            return res
                .status(403)
                .json({ message: "Only sender can unsend this message" });
        }

        const chatId = message.chat;
        await message.deleteOne();

        // If this was the latest message, find the new latest message for this chat
        const chat = await Chat.findById(chatId);
        if (chat && chat.latestMessage?.toString() === messageId) {
            const nextLatest = await Message.findOne({ chat: chatId })
                .sort({ createdAt: -1 });
            chat.latestMessage = nextLatest ? nextLatest._id : null;
            await chat.save();
        }

        res.json({ _id: messageId, chatId });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete message for me ONLY
// @route   DELETE /api/messages/:messageId/delete-for-me
const deleteForMe = async (req, res) => {
    try {
        const message = await Message.findById(req.params.messageId);
        if (!message) {
            return res.status(404).json({ message: "Message not found" });
        }

        const canAccess = await isUserInChat(message.chat, req.user._id);
        if (!canAccess) {
            return res.status(403).json({ message: "Access denied" });
        }

        // Add user to deletedBy if not already there
        if (!message.deletedBy.includes(req.user._id)) {
            message.deletedBy.push(req.user._id);
            await message.save();
        }

        res.json({ message: "Message deleted for you" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send a media message (image/video)
// @route   POST /api/messages/media
const sendMediaMessage = async (req, res) => {
    try {
        const { chatId, replyTo } = req.body;
        const { isCloudinaryConfigured, uploadStatusMedia } = require("../utils/cloudinary");

        if (!chatId) {
            return res.status(400).json({ message: "ChatId required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No media file provided" });
        }

        const canSend = await isUserInChat(chatId, req.user._id);
        if (!canSend) {
            return res.status(403).json({ message: "Access denied" });
        }

        if (!isCloudinaryConfigured()) {
            return res.status(400).json({ message: "Cloudinary not configured" });
        }

        const isVideo = req.file.mimetype.startsWith("video/");
        const resourceType = isVideo ? "video" : "image";
        const messageType = isVideo ? "video" : "image";

        const result = await uploadStatusMedia(
            req.file.buffer,
            req.user._id,
            resourceType
        );

        let message = await Message.create({
            sender: req.user._id,
            content: result.secure_url,
            chat: chatId,
            messageType,
            replyTo: replyTo || null,
            readBy: [req.user._id],
        });

        message = await populateMessageDoc(message);
        message = await Message.populate(message, {
            path: "chat.users",
            select: "username profilePic",
        });

        await Chat.findByIdAndUpdate(chatId, { latestMessage: message._id });

        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    sendMessage,
    getMessages,
    markAsRead,
    reactToMessage,
    removeReaction,
    unsendMessage,
    deleteForMe,
    sendMediaMessage,
};
