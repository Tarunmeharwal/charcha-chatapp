"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import {
    sendMessageAPI,
    markAsReadAPI,
    reactToMessageAPI,
    removeReactionAPI,
    unsendMessageAPI,
    deleteForMeAPI,
    clearChatAPI,
    deleteChatAPI,
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import EmojiPicker from "emoji-picker-react";
import { getAvatarSrc } from "@/lib/avatar";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function ChatWindow({ isMobile }) {
    const { user } = useAuth();
    const {
        selectedChat,
        setSelectedChat,
        messages,
        setMessages,
        getChatPartner,
        onlineUsers,
        typingUsers,
        fetchMessages,
        fetchChats,
        loadingMessages,
    } = useChat();

    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [activeMessageMenu, setActiveMessageMenu] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [showChatDropdown, setShowChatDropdown] = useState(false);
    const [showDpViewer, setShowDpViewer] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [activeEmojiPickerMsgId, setActiveEmojiPickerMsgId] = useState(null);
    const socket = getSocket();
    const longPressTimer = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const dropdownRef = useRef(null);
    const fileInputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        setActiveMessageMenu(null);
        setReplyingTo(null);
        setShowChatDropdown(false);

        if (selectedChat?._id) {
            socket.emit("join_chat", selectedChat._id);
            return () => {
                socket.emit("leave_chat", selectedChat._id);
            };
        }
    }, [selectedChat?._id]);

    // Close menu/picker when clicking anywhere else
    useEffect(() => {
        const handleClickOutside = (e) => {
            // Message menu
            if (activeMessageMenu && !e.target.closest(".message-action-menu") && !e.target.closest(".message-action-btn")) {
                setActiveMessageMenu(null);
            }
            // Emoji pickers
            if ((showEmojiPicker || activeEmojiPickerMsgId) &&
                emojiPickerRef.current &&
                !emojiPickerRef.current.contains(e.target) &&
                !e.target.closest(".emoji-btn") &&
                !e.target.closest(".plus-btn")) {
                setShowEmojiPicker(false);
                setActiveEmojiPickerMsgId(null);
            }
            // Chat dropdown
            if (showChatDropdown && dropdownRef.current && !dropdownRef.current.contains(e.target) && !e.target.closest(".chat-header-actions")) {
                setShowChatDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [activeMessageMenu, showEmojiPicker, activeEmojiPickerMsgId, showChatDropdown]);

    // Mark messages as read when opening chat
    useEffect(() => {
        if (selectedChat) {
            markAsReadAPI(selectedChat._id);
        }
    }, [selectedChat, messages]);

    const getChatName = () => {
        if (!selectedChat) return "";
        if (selectedChat.isGroupChat) return selectedChat.chatName;
        const partner = getChatPartner(selectedChat);
        return partner?.username || "Unknown";
    };

    const getStatusText = () => {
        if (!selectedChat) return "";
        if (selectedChat.isGroupChat) {
            return selectedChat.users.map((u) => u.username).join(", ");
        }
        const partner = getChatPartner(selectedChat);
        if (!partner) return "";

        if (typingUsers[selectedChat._id]) return "typing...";
        if (onlineUsers.includes(partner._id)) return "online";

        if (partner.lastSeen) {
            const date = new Date(partner.lastSeen);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);

            if (diffMins < 1) return "last seen just now";
            if (diffMins < 60) return `last seen ${diffMins}m ago`;
            if (diffHours < 24) return `last seen ${diffHours}h ago`;
            return `last seen ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }
        return "offline";
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            alert("File size exceeds 50MB");
            return;
        }

        setSelectedFile(file);
        if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
            const reader = new FileReader();
            reader.onloadend = () => setFilePreview(reader.result);
            reader.readAsDataURL(file);
        } else {
            setFilePreview(null);
        }
    };

    const handleSend = async () => {
        if ((!inputValue.trim() && !selectedFile) || !selectedChat) return;

        const socket = getSocket();
        const messageContent = inputValue.trim();
        setInputValue("");
        setShowEmojiPicker(false);

        // Stop typing
        setIsTyping(false);
        socket.emit("stop_typing", {
            chatId: selectedChat._id,
            userId: user._id,
        });

        try {
            let data;
            if (selectedFile) {
                setUploadingMedia(true);
                const formData = new FormData();
                formData.append("media", selectedFile);
                formData.append("chatId", selectedChat._id);
                if (replyingTo) formData.append("replyTo", replyingTo._id);
                if (messageContent) formData.append("caption", messageContent);

                const { sendMediaMessageAPI } = await import("@/lib/api");
                data = await sendMediaMessageAPI(formData);
                setSelectedFile(null);
                setFilePreview(null);
                setUploadingMedia(false);
            } else {
                data = await sendMessageAPI({
                    content: messageContent,
                    chatId: selectedChat._id,
                    replyTo: replyingTo?._id || null,
                });
            }

            if (data?._id) {
                setMessages((prev) =>
                    prev.some((msg) => msg._id === data._id) ? prev : [...prev, data]
                );
                setReplyingTo(null);
                socket.emit("new_message", data);
            }
        } catch (error) {
            console.error("Error sending message:", error);
            setUploadingMedia(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e) => {
        if (!selectedChat) return;
        setInputValue(e.target.value);

        // Typing indicator
        const socket = getSocket();
        if (!isTyping) {
            setIsTyping(true);
            socket.emit("typing", {
                chatId: selectedChat._id,
                userId: user._id,
            });
        }

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit("stop_typing", {
                chatId: selectedChat._id,
                userId: user._id,
            });
        }, 2000);
    };

    const formatMessageTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDateDivider = (dateStr) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return "Today";
        if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
        return date.toLocaleDateString([], {
            weekday: "long",
            month: "short",
            day: "numeric",
        });
    };

    const shouldShowDateDivider = (index) => {
        if (index === 0) return true;
        const current = new Date(messages[index].createdAt).toDateString();
        const previous = new Date(messages[index - 1].createdAt).toDateString();
        return current !== previous;
    };

    const getReadStatus = (message) => {
        if (message.sender._id !== user._id) return null;
        if (message.readBy && message.readBy.length > 1) return "read";
        return "sent";
    };

    const getMessageText = (message) => {
        // Defensive check: if it's a media link but type is 'text'
        const isCloudinary = message.content && typeof message.content === 'string' && message.content.includes("cloudinary.com");
        if (isCloudinary && message.messageType === "text") {
            return message.content.includes("/video/") ? "🎥 Video" : "📷 Photo";
        }

        return message.content;
    };

    const handleReaction = async (messageId, emoji) => {
        try {
            const updatedMessage = await reactToMessageAPI(messageId, emoji);
            if (updatedMessage?._id) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg._id === updatedMessage._id ? updatedMessage : msg
                    )
                );
                const socket = getSocket();
                socket.emit("message_updated", {
                    chatId: selectedChat._id,
                    message: updatedMessage,
                });
            }
        } catch (error) {
            console.error("Error reacting to message:", error);
        } finally {
            setActiveMessageMenu(null);
            setActiveEmojiPickerMsgId(null);
        }
    };

    const handleRemoveReaction = async (messageId) => {
        try {
            const updatedMessage = await removeReactionAPI(messageId);
            if (updatedMessage?._id) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg._id === updatedMessage._id ? updatedMessage : msg
                    )
                );
                const socket = getSocket();
                socket.emit("message_updated", {
                    chatId: selectedChat._id,
                    message: updatedMessage,
                });
            }
        } catch (error) {
            console.error("Error removing reaction:", error);
        } finally {
            setActiveMessageMenu(null);
        }
    };

    const handleCopyMessage = (text) => {
        navigator.clipboard.writeText(text);
        setActiveMessageMenu(null);
    };

    const handleUnsendMessage = async (messageId) => {
        try {
            const result = await unsendMessageAPI(messageId);
            if (result?._id) {
                setMessages((prev) => prev.filter((msg) => msg._id !== result._id));
                const socket = getSocket();
                socket.emit("message_deleted", {
                    chatId: selectedChat._id,
                    messageId: result._id,
                });
                fetchChats(); // Update side panels
            }
        } catch (error) {
            console.error("Error unsending message:", error);
        } finally {
            setActiveMessageMenu(null);
        }
    };

    const handleDeleteForMe = async (messageId) => {
        try {
            await deleteForMeAPI(messageId);
            setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
        } catch (error) {
            console.error("Error deleting message for me:", error);
        } finally {
            setActiveMessageMenu(null);
        }
    };

    // ===== Chat dropdown menu handlers =====
    const handleClearChat = async () => {
        if (!selectedChat) return;
        if (!confirm("Are you sure you want to clear all messages in this chat? This cannot be undone.")) return;

        try {
            await clearChatAPI(selectedChat._id);
            setMessages([]);
            setShowChatDropdown(false);
            fetchChats();
        } catch (error) {
            console.error("Error clearing chat:", error);
        }
    };

    const handleDeleteChat = async () => {
        if (!selectedChat) return;
        if (!confirm("Are you sure you want to delete this chat? All messages will be lost.")) return;

        try {
            await deleteChatAPI(selectedChat._id);
            setSelectedChat(null);
            setShowChatDropdown(false);
            fetchChats();
        } catch (error) {
            console.error("Error deleting chat:", error);
        }
    };

    const handleViewProfile = () => {
        setShowChatDropdown(false);
        const partner = getChatPartner(selectedChat);
        if (partner) {
            setShowDpViewer(getAvatarSrc(partner));
        }
    };

    const getLatestReactionGroups = (message) => {
        if (!message.reactions || message.reactions.length === 0) return [];

        const grouped = {};
        message.reactions.forEach((reaction) => {
            if (!grouped[reaction.emoji]) {
                grouped[reaction.emoji] = { count: 0, latestAt: 0 };
            }
            grouped[reaction.emoji].count += 1;
            const reactionTime = new Date(reaction.createdAt || 0).getTime();
            if (reactionTime > grouped[reaction.emoji].latestAt) {
                grouped[reaction.emoji].latestAt = reactionTime;
            }
        });

        return Object.entries(grouped)
            .sort((a, b) => b[1].latestAt - a[1].latestAt)
            .slice(0, 5)
            .map(([emoji, data]) => ({ emoji, count: data.count }));
    };

    const hasMyReaction = (message) =>
        message.reactions?.some((reaction) => reaction.user?._id === user._id);

    const getDisplaySenderName = (messageSender) => {
        if (!messageSender) return "Unknown";
        if (messageSender._id?.toString?.() === user._id?.toString?.()) return "You";
        return messageSender.username || "Unknown";
    };

    const getReplyPreviewText = (replyMessage) => {
        if (!replyMessage) return "Message unavailable";
        return replyMessage.content || "Media message";
    };

    const onEmojiClick = (emojiData) => {
        setInputValue((prev) => prev + emojiData.emoji);
    };

    const handleMessagePressStart = (msgId) => {
        if (!isMobile) return;
        longPressTimer.current = setTimeout(() => {
            setActiveMessageMenu(msgId);
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500);
    };

    const handleMessagePressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    // Empty state
    if (!selectedChat) {
        return (
            <div className="chat-window-empty">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <h3>Welcome to Charcha</h3>
                <p>
                    Select a conversation from the sidebar or start a new chat
                    to begin messaging your friends.
                </p>
            </div>
        );
    }

    return (
        <div className="chat-window">
            {/* Chat Header */}
            <div className="chat-header">
                {isMobile && (
                    <button
                        className="icon-btn back-mobile-btn"
                        onClick={() => setSelectedChat(null)}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    </button>
                )}

                <div
                    className="chat-avatar"
                    style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, fontSize: isMobile ? 16 : 18, cursor: "pointer" }}
                    onClick={() => {
                        const partner = getChatPartner(selectedChat);
                        if (partner) setShowDpViewer(getAvatarSrc(partner));
                    }}
                >
                    <img
                        src={
                            selectedChat.isGroupChat
                                ? getAvatarSrc(getChatName())
                                : getAvatarSrc(getChatPartner(selectedChat))
                        }
                        alt="avatar"
                        loading="lazy"
                    />
                    {!selectedChat.isGroupChat &&
                        onlineUsers.includes(getChatPartner(selectedChat)?._id) && (
                            <span className="online-dot"></span>
                        )}
                </div>

                <div className="chat-header-info" style={{ cursor: "pointer" }}>
                    <h4>{getChatName()}</h4>
                    <p className={
                        getStatusText() === "online" || getStatusText() === "typing..."
                            ? "online"
                            : "last-seen"
                    }>
                        {getStatusText()}
                    </p>
                </div>

                <div className="chat-header-actions" ref={dropdownRef}>
                    <button
                        className="icon-btn"
                        title="More options"
                        onClick={() => setShowChatDropdown((prev) => !prev)}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                    </button>

                    {showChatDropdown && (
                        <div className="chat-dropdown-menu">
                            {!selectedChat.isGroupChat && (
                                <button className="chat-dropdown-item" onClick={handleViewProfile}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    View Profile
                                </button>
                            )}
                            <button
                                className="chat-dropdown-item"
                                onClick={() => {
                                    setShowChatDropdown(false);
                                    setShowEmojiPicker(false);
                                    setActiveMessageMenu(null);
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                Search in Chat
                            </button>
                            <button className="chat-dropdown-item" onClick={handleClearChat}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v6m0 0l3-3m-3 3L9 5" /><path d="M5 12H2l3 3-3 3h3" /><path d="M19 12h3l-3 3 3 3h-3" /><path d="M12 22v-6m0 0l3 3m-3-3l-3 3" /></svg>
                                Clear Chat
                            </button>
                            <button className="chat-dropdown-item danger" onClick={handleDeleteChat}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                Delete Chat
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="messages-area">
                {loadingMessages ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <div key={msg._id || index}>
                                {shouldShowDateDivider(index) && (
                                    <div className="message-date-divider">
                                        <span>{formatDateDivider(msg.createdAt)}</span>
                                    </div>
                                )}
                                <div
                                    className={`message-wrapper ${msg.sender._id === user._id ? "sent" : "received"
                                        }`}
                                >
                                    <div
                                        className="message-bubble"
                                        onContextMenu={(e) => {
                                            if (isMobile) {
                                                e.preventDefault();
                                                setActiveMessageMenu(msg._id);
                                            }
                                        }}
                                        onTouchStart={() => handleMessagePressStart(msg._id)}
                                        onTouchEnd={handleMessagePressEnd}
                                        onMouseDown={() => handleMessagePressStart(msg._id)}
                                        onMouseUp={handleMessagePressEnd}
                                    >
                                        {!isMobile && (
                                            <button
                                                className={`message-action-btn ${activeMessageMenu === msg._id ? "active" : ""}`}
                                                onClick={() =>
                                                    setActiveMessageMenu((prev) =>
                                                        prev === msg._id ? null : msg._id
                                                    )
                                                }
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                            </button>
                                        )}
                                        {getLatestReactionGroups(msg).length > 0 && (
                                            <div className="message-reactions">
                                                {getLatestReactionGroups(msg).map((reaction) => (
                                                    <span key={`${msg._id}-${reaction.emoji}`}>
                                                        {reaction.emoji} {reaction.count}
                                                    </span>
                                                ))}
                                                <button
                                                    className="message-reaction-add-btn"
                                                    onClick={() => setActiveMessageMenu(msg._id)}
                                                    title="Add reaction"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        )}
                                        {activeMessageMenu === msg._id && (
                                            <div
                                                className={`message-action-menu ${index > messages.length - 4 ? "opens-up" : ""}`}
                                                onMouseLeave={() => setActiveMessageMenu(null)}
                                            >
                                                <div className="reaction-picker">
                                                    {QUICK_EMOJIS.map((emoji) => (
                                                        <button
                                                            key={`${msg._id}-${emoji}`}
                                                            className="reaction-btn"
                                                            onClick={() =>
                                                                handleReaction(msg._id, emoji)
                                                            }
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                    <button
                                                        className="reaction-btn plus-btn"
                                                        onClick={() => {
                                                            setActiveEmojiPickerMsgId(msg._id);
                                                        }}
                                                        title="More reactions"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <>
                                                    <button
                                                        className="message-menu-item"
                                                        onClick={() => {
                                                            setReplyingTo(msg);
                                                            setActiveMessageMenu(null);
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                                                        Reply
                                                    </button>
                                                    <button className="message-menu-item" onClick={() => handleCopyMessage(msg.content)}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                                                        Copy
                                                    </button>
                                                </>
                                                {hasMyReaction(msg) && (
                                                    <button
                                                        className="message-menu-item"
                                                        onClick={() =>
                                                            handleRemoveReaction(msg._id)
                                                        }
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                                                        Remove my reaction
                                                    </button>
                                                )}
                                                {msg.sender._id === user._id && (
                                                    <button
                                                        className="message-menu-item danger"
                                                        onClick={() =>
                                                            handleUnsendMessage(msg._id)
                                                        }
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                                        Unsend message
                                                    </button>
                                                )}
                                                <button
                                                    className="message-menu-item danger"
                                                    onClick={() => handleDeleteForMe(msg._id)}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                                    Delete for me
                                                </button>
                                            </div>
                                        )}
                                        {msg.replyTo && (
                                            <div className="message-reply-preview">
                                                <div className="reply-bar" />
                                                <div className="reply-content">
                                                    <span className="reply-sender">
                                                        {msg.replyTo.sender._id === user._id ? "You" : msg.replyTo.sender.username}
                                                    </span>
                                                    <p className="reply-text">
                                                        {getMessageText(msg.replyTo)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="message-content">
                                            {(() => {
                                                const isCloudinary = msg.content && typeof msg.content === 'string' && msg.content.includes("cloudinary.com");
                                                const finalType = msg.messageType || (isCloudinary ? (msg.content.includes("/video/") ? "video" : "image") : "text");

                                                if (finalType === "image") {
                                                    return (
                                                        <div className="message-media-container" onClick={() => setShowDpViewer(msg.content)}>
                                                            <img src={msg.content} alt="Media" className="message-media" />
                                                        </div>
                                                    );
                                                } else if (finalType === "video") {
                                                    return (
                                                        <div className="message-media-container">
                                                            <video src={msg.content} controls className="message-media" />
                                                        </div>
                                                    );
                                                } else {
                                                    return <p>{getMessageText(msg)}</p>;
                                                }
                                            })()}
                                        </div>
                                        <div className="message-meta">
                                            <span className="message-time">
                                                {formatMessageTime(msg.createdAt)}
                                            </span>
                                            {msg.sender._id === user._id && (
                                                <span
                                                    className={`message-ticks ${getReadStatus(msg) === "read" ? "read" : ""
                                                        }`}
                                                >
                                                    {getReadStatus(msg) === "read" ? "✓✓" : "✓"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Typing Indicator */}
            {typingUsers[selectedChat._id] && (
                <div className="typing-indicator">typing...</div>
            )}

            {/* Message Input */}
            <div className="message-input-wrapper">
                {(showEmojiPicker || activeEmojiPickerMsgId) && (
                    <div className="emoji-picker-container" ref={emojiPickerRef}>
                        <EmojiPicker
                            onEmojiClick={(emojiData) => {
                                if (activeEmojiPickerMsgId) {
                                    handleReaction(activeEmojiPickerMsgId, emojiData.emoji);
                                    setActiveEmojiPickerMsgId(null);
                                } else {
                                    setInputValue((prev) => prev + emojiData.emoji);
                                }
                            }}
                            width="100%"
                            height={400}
                            searchPlaceholder="Search emojis..."
                        />
                    </div>
                )}
                {replyingTo && (
                    <div className="replying-banner">
                        <div className="replying-banner-content">
                            <span className="replying-banner-title">
                                Replying to {getDisplaySenderName(replyingTo.sender)}
                            </span>
                            <span className="replying-banner-text">
                                {getReplyPreviewText(replyingTo)}
                            </span>
                        </div>
                        <button
                            className="replying-banner-close"
                            onClick={() => setReplyingTo(null)}
                            aria-label="Cancel reply"
                        >
                            ×
                        </button>
                    </div>
                )}
                {selectedFile && (
                    <div className="file-preview-banner">
                        <div className="file-preview-content">
                            {filePreview ? (
                                selectedFile.type.startsWith("video/") ? (
                                    <video src={filePreview} className="file-preview-image" />
                                ) : (
                                    <img src={filePreview} alt="Preview" className="file-preview-image" />
                                )
                            ) : (
                                <div className="file-preview-generic">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>
                                    <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                                </div>
                            )}
                        </div>
                        <button
                            className="file-preview-close"
                            onClick={() => {
                                setSelectedFile(null);
                                setFilePreview(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                        >
                            ×
                        </button>
                    </div>
                )}
                <div className="message-input-area">
                    <button
                        className={`emoji-btn ${showEmojiPicker ? "active" : ""}`}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        onChange={handleFileSelect}
                        accept="image/*,video/*"
                    />
                    <button
                        className="attach-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                    </button>
                    <input
                        className="message-input"
                        type="text"
                        placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={uploadingMedia}
                    />
                    <button className="send-btn" onClick={handleSend} disabled={uploadingMedia}>
                        {uploadingMedia ? (
                            <div className="spinner" style={{ width: 18, height: 18 }}></div>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* DP Viewer Overlay */}
            {showDpViewer && (
                <div className="dp-viewer-overlay" onClick={() => setShowDpViewer(null)}>
                    <button className="dp-viewer-close" onClick={() => setShowDpViewer(null)}>✕</button>
                    <img src={showDpViewer} alt="Profile" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}
