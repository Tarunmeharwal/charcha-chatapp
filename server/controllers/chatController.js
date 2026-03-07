const Chat = require("../models/Chat");
const User = require("../models/User");
const Message = require("../models/Message");

// @desc    Create or access a 1-on-1 chat
// @route   POST /api/chats
const accessChat = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "UserId required" });
        }

        // Check if chat already exists
        let chat = await Chat.find({
            isGroupChat: false,
            $and: [
                { users: { $elemMatch: { $eq: req.user._id } } },
                { users: { $elemMatch: { $eq: userId } } },
            ],
        })
            .populate("users", "-password")
            .populate({
                path: "latestMessage",
                populate: { path: "sender", select: "username profilePic" },
            });

        if (chat.length > 0) {
            return res.json(chat[0]);
        }

        // Create new chat
        const newChat = await Chat.create({
            chatName: "direct",
            isGroupChat: false,
            users: [req.user._id, userId],
        });

        const fullChat = await Chat.findById(newChat._id).populate(
            "users",
            "-password"
        );

        res.status(201).json(fullChat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all chats for current user
// @route   GET /api/chats
const getChats = async (req, res) => {
    try {
        const chats = await Chat.find({
            users: { $elemMatch: { $eq: req.user._id } },
        })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate({
                path: "latestMessage",
                populate: { path: "sender", select: "username profilePic" },
            })
            .sort({ updatedAt: -1 });

        res.json(chats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create group chat
// @route   POST /api/chats/group
const createGroupChat = async (req, res) => {
    try {
        const { users, name } = req.body;

        if (!users || !name) {
            return res.status(400).json({ message: "Please fill all fields" });
        }

        const parsedUsers = typeof users === "string" ? JSON.parse(users) : users;

        if (parsedUsers.length < 2) {
            return res
                .status(400)
                .json({ message: "At least 2 users required for group chat" });
        }

        parsedUsers.push(req.user._id);

        const groupChat = await Chat.create({
            chatName: name,
            users: parsedUsers,
            isGroupChat: true,
            groupAdmin: req.user._id,
        });

        const fullGroupChat = await Chat.findById(groupChat._id)
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(201).json(fullGroupChat);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Clear all messages in a chat
// @route   DELETE /api/chats/:chatId/clear
const clearChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Only participants can clear the chat
        if (!chat.users.some(u => u.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: "Not authorized" });
        }

        await Message.deleteMany({ chat: chat._id });
        chat.latestMessage = undefined;
        await chat.save();

        res.json({ message: "Chat cleared successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete a chat (removes the chat document and all messages)
// @route   DELETE /api/chats/:chatId
const deleteChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.chatId);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        if (!chat.users.some(u => u.toString() === req.user._id.toString())) {
            return res.status(403).json({ message: "Not authorized" });
        }

        // Delete all messages in the chat
        await Message.deleteMany({ chat: chat._id });
        // Delete the chat itself
        await chat.deleteOne();

        res.json({ message: "Chat deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { accessChat, getChats, createGroupChat, clearChat, deleteChat };
