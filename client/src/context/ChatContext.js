"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getChatsAPI, getMessagesAPI } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "./AuthContext";

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export function ChatProvider({ children }) {
    const { user } = useAuth();
    const [chats, setChats] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [typingUsers, setTypingUsers] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);

    const dedupeMessages = useCallback((items) => {
        const seen = new Set();
        return items.filter((msg) => {
            if (!msg) return false;
            const key =
                msg._id ||
                `${msg.createdAt || ""}-${msg.sender?._id || ""}-${msg.content || ""}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, []);

    // Fetch all chats
    const fetchChats = useCallback(async () => {
        if (!user) return;
        setLoadingChats(true);
        try {
            const data = await getChatsAPI();
            if (Array.isArray(data)) {
                // Deduplicate by _id
                const uniqueChats = data.filter((chat, index, self) =>
                    chat && chat._id && index === self.findIndex((c) => c && String(c._id) === String(chat._id))
                );
                setChats(uniqueChats);
            }
        } catch (error) {
            console.error("Error fetching chats:", error);
        } finally {
            setLoadingChats(false);
        }
    }, [user]);

    // Fetch messages for a chat
    const fetchMessages = useCallback(async (chatId) => {
        setLoadingMessages(true);
        try {
            const data = await getMessagesAPI(chatId);
            if (Array.isArray(data)) {
                setMessages(dedupeMessages(data));
            }
        } catch (error) {
            console.error("Error fetching messages:", error);
        } finally {
            setLoadingMessages(false);
        }
    }, [dedupeMessages]);

    // Socket event listeners
    useEffect(() => {
        if (!user) return;

        const socket = getSocket();

        // Online/offline tracking
        socket.on("online_users", (users) => {
            setOnlineUsers(users);
        });

        socket.on("user_online", (userId) => {
            setOnlineUsers((prev) => [...new Set([...prev, userId])]);
        });

        socket.on("user_offline", ({ userId, lastSeen }) => {
            const uid = typeof userId === "object" ? userId.userId : userId;
            setOnlineUsers((prev) => prev.filter((id) => id !== uid));

            // Update lastSeen in chat list and selected chat
            const updateLastSeen = (prevChats) =>
                prevChats.map((chat) => {
                    const partnerIdx = chat.users.findIndex((u) => u._id === uid);
                    if (partnerIdx !== -1) {
                        const newUsers = [...chat.users];
                        newUsers[partnerIdx] = { ...newUsers[partnerIdx], lastSeen };
                        return { ...chat, users: newUsers };
                    }
                    return chat;
                });

            setChats(updateLastSeen);
            setSelectedChat((current) => {
                if (!current) return null;
                const partnerIdx = current.users.findIndex((u) => u._id === uid);
                if (partnerIdx !== -1) {
                    const newUsers = [...current.users];
                    newUsers[partnerIdx] = { ...newUsers[partnerIdx], lastSeen };
                    return { ...current, users: newUsers };
                }
                return current;
            });
        });

        // Real-time message
        socket.on("message_received", (newMessage) => {
            // If the message is for the currently open chat, add it
            setSelectedChat((currentChat) => {
                if (currentChat && currentChat._id === newMessage.chat._id) {
                    setMessages((prev) => dedupeMessages([...prev, newMessage]));
                } else {
                    // Add notification — keep all to show count
                    setNotifications((prev) => {
                        // Prevent duplicates by message ID
                        if (prev.some((n) => n._id === newMessage._id)) return prev;
                        return [newMessage, ...prev];
                    });
                }
                return currentChat;
            });

            // Update chat list with latest message
            setChats((prev) => {
                const updatedChats = prev.map((chat) => {
                    if (chat._id === newMessage.chat._id) {
                        return { ...chat, latestMessage: newMessage };
                    }
                    return chat;
                });
                // Move the chat with new message to top
                const chatIndex = updatedChats.findIndex(
                    (c) => c._id === newMessage.chat._id
                );
                if (chatIndex > 0) {
                    const [chat] = updatedChats.splice(chatIndex, 1);
                    updatedChats.unshift(chat);
                }
                return updatedChats;
            });
        });

        socket.on("message_updated", (updatedMessage) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg._id === updatedMessage._id ? updatedMessage : msg
                )
            );

            setChats((prev) =>
                prev.map((chat) =>
                    chat._id === updatedMessage.chat?._id
                        ? { ...chat, latestMessage: updatedMessage }
                        : chat
                )
            );
        });

        socket.on("message_deleted", ({ chatId, messageId }) => {
            setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
            fetchChats(); // Refresh to get new latestMessage if needed
        });

        // Typing indicators
        socket.on("typing", ({ chatId, userId }) => {
            setTypingUsers((prev) => ({ ...prev, [chatId]: userId }));
        });

        socket.on("stop_typing", ({ chatId }) => {
            setTypingUsers((prev) => {
                const updated = { ...prev };
                delete updated[chatId];
                return updated;
            });
        });

        socket.on("friend_request_accepted", () => {
            // Refresh chats and user profile
            fetchChats();
        });

        return () => {
            socket.off("online_users");
            socket.off("user_online");
            socket.off("user_offline");
            socket.off("message_received");
            socket.off("message_updated");
            socket.off("message_deleted");
            socket.off("typing");
            socket.off("stop_typing");
            socket.off("friend_request_accepted");
        };
    }, [user, fetchChats, dedupeMessages]);

    // Fetch chats when user logs in
    useEffect(() => {
        if (user) {
            fetchChats();
        }
    }, [user, fetchChats]);

    // Helper to get other user in 1-on-1 chat
    const getChatPartner = (chat) => {
        if (!chat || !user) return null;
        if (chat.isGroupChat) return null;
        return chat.users.find((u) => u._id !== user._id);
    };

    // Remove notification for a chat
    const removeNotification = (chatId) => {
        setNotifications((prev) => prev.filter((n) => n.chat._id !== chatId));
    };

    return (
        <ChatContext.Provider
            value={{
                chats,
                setChats,
                selectedChat,
                setSelectedChat,
                messages,
                setMessages,
                onlineUsers,
                typingUsers,
                notifications,
                removeNotification,
                loadingChats,
                loadingMessages,
                fetchChats,
                fetchMessages,
                getChatPartner,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
}
