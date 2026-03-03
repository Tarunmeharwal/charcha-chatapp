const User = require("../models/User");

const socketHandler = (io) => {
    // Track online users: { userId: socketId }
    const onlineUsers = new Map();

    io.on("connection", (socket) => {
        console.log("🔌 Socket connected:", socket.id);

        // User comes online
        socket.on("setup", async (userId) => {
            socket.userId = userId;
            onlineUsers.set(userId, socket.id);
            socket.join(userId); // Join personal room

            // Update online status in DB
            try {
                await User.findByIdAndUpdate(userId, { isOnline: true });
            } catch (err) {
                console.error("Error updating online status:", err);
            }

            // Broadcast online status to all users
            io.emit("user_online", userId);
            // Send list of all online users to newly connected user
            socket.emit("online_users", Array.from(onlineUsers.keys()));
        });

        // Join a chat room
        socket.on("join_chat", (chatId) => {
            socket.join(chatId);
        });

        // Leave a chat room
        socket.on("leave_chat", (chatId) => {
            socket.leave(chatId);
        });

        // New message
        socket.on("new_message", (newMessage) => {
            const chat = newMessage.chat;
            if (!chat || !chat.users) return;

            chat.users.forEach((user) => {
                if (user._id === newMessage.sender._id) return;
                socket.in(user._id).emit("message_received", newMessage);
            });
        });

        // Message updated (reaction/unsend)
        socket.on("message_updated", ({ chatId, message }) => {
            if (!chatId || !message) return;
            socket.in(chatId).emit("message_updated", message);
        });

        // Typing indicator
        socket.on("typing", ({ chatId, userId }) => {
            socket.in(chatId).emit("typing", { chatId, userId });
        });

        socket.on("stop_typing", ({ chatId, userId }) => {
            socket.in(chatId).emit("stop_typing", { chatId, userId });
        });

        // Read receipt
        socket.on("messages_read", ({ chatId, userId }) => {
            socket.in(chatId).emit("messages_read", { chatId, userId });
        });

        // Friend request notification
        socket.on("send_friend_request", ({ from, to }) => {
            socket.in(to).emit("new_friend_request", from);
        });

        socket.on("accept_friend_request", ({ from, to }) => {
            socket.in(to).emit("friend_request_accepted", from);
        });

        // Disconnect
        socket.on("disconnect", async () => {
            console.log("❌ Socket disconnected:", socket.id);

            if (socket.userId) {
                onlineUsers.delete(socket.userId);

                try {
                    await User.findByIdAndUpdate(socket.userId, {
                        isOnline: false,
                        lastSeen: new Date(),
                    });
                } catch (err) {
                    console.error("Error updating offline status:", err);
                }

                io.emit("user_offline", socket.userId);
            }
        });
    });
};

module.exports = socketHandler;
