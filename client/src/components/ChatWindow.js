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
} from "@/lib/api";
import { getSocket } from "@/lib/socket";
import EmojiPicker from "emoji-picker-react";
import { getAvatarSrc } from "@/lib/avatar";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏", "🔥", "👏", "🎉", "😡", "😎", "💯"];

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
        loadingMessages,
    } = useChat();

    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [activeMessageMenu, setActiveMessageMenu] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const longPressTimer = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        setActiveMessageMenu(null);
        setReplyingTo(null);
    }, [selectedChat?._id]);

    // Close menu when clicking anywhere else
    useEffect(() => {
        if (!activeMessageMenu) return;

        const handleClickOutside = (e) => {
            if (!e.target.closest(".message-action-menu") && !e.target.closest(".message-action-btn")) {
                setActiveMessageMenu(null);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [activeMessageMenu]);

    // Close emoji picker when clicking anywhere else
    useEffect(() => {
        if (!showEmojiPicker) return;

        const handleClickOutside = (e) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest(".emoji-btn")) {
                setShowEmojiPicker(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showEmojiPicker]);

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
            return `last seen ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }
        return "offline";
    };

    const handleSend = async () => {
        if (!inputValue.trim() || !selectedChat) return;

        const messageContent = inputValue.trim();
        setInputValue("");

        // Stop typing indicator
        const socket = getSocket();
        socket.emit("stop_typing", {
            chatId: selectedChat._id,
            userId: user._id,
        });

        try {
            const data = await sendMessageAPI({
                content: messageContent,
                chatId: selectedChat._id,
                replyTo: replyingTo?._id || null,
            });

            if (data._id) {
                setMessages((prev) =>
                    prev.some((msg) => msg._id === data._id) ? prev : [...prev, data]
                );
                setReplyingTo(null);
                // Emit via socket
                socket.emit("new_message", data);
            }
        } catch (error) {
            console.error("Error sending message:", error);
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
        if (message.isUnsent) return "This message was unsent";
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
            const updatedMessage = await unsendMessageAPI(messageId);
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
            console.error("Error unsending message:", error);
        } finally {
            setActiveMessageMenu(null);
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
        if (replyMessage.isUnsent) return "This message was unsent";
        return replyMessage.content || "Media message";
    };

    const onEmojiClick = (emojiData) => {
        setInputValue((prev) => prev + emojiData.emoji);
        // Do not close picker after click for better UX like WhatsApp
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                    </button>
                )}
                <div className="chat-avatar" style={{ width: 42, height: 42, fontSize: 18 }}>
                    <img
                        src={
                            selectedChat.isGroupChat
                                ? getAvatarSrc(getChatName())
                                : getAvatarSrc(getChatPartner(selectedChat))
                        }
                        alt={`${getChatName()} avatar`}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />
                    {!selectedChat.isGroupChat &&
                        onlineUsers.includes(getChatPartner(selectedChat)?._id) && (
                            <span className="online-dot"></span>
                        )}
                </div>
                <div className="chat-header-info">
                    <h4>{getChatName()}</h4>
                    <p style={{ color: getStatusText() === "online" || getStatusText() === "typing..." ? "var(--accent-green)" : undefined }}>
                        {getStatusText()}
                    </p>
                </div>
                <div className="chat-header-actions">
                    <button className="icon-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    </button>
                    <button className="icon-btn">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                    </button>
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
                                        {!isMobile && !msg.isUnsent && (
                                            <button
                                                className="message-action-btn"
                                                onClick={() =>
                                                    setActiveMessageMenu((prev) =>
                                                        prev === msg._id ? null : msg._id
                                                    )
                                                }
                                            >
                                                ⋯
                                            </button>
                                        )}
                                        <div
                                            className={`message-text ${msg.isUnsent ? "unsent" : ""}`}
                                        >
                                            {msg.replyTo && (
                                                <div className="message-reply-preview">
                                                    <span className="message-reply-sender">
                                                        {getDisplaySenderName(msg.replyTo.sender)}
                                                    </span>
                                                    <span className="message-reply-text">
                                                        {getReplyPreviewText(msg.replyTo)}
                                                    </span>
                                                </div>
                                            )}
                                            {getMessageText(msg)}
                                        </div>
                                        {getLatestReactionGroups(msg).length > 0 && (
                                            <div className="message-reactions">
                                                {getLatestReactionGroups(msg).map((reaction) => (
                                                    <span key={`${msg._id}-${reaction.emoji}`}>
                                                        {reaction.emoji} {reaction.count}
                                                    </span>
                                                ))}
                                                {!msg.isUnsent && (
                                                    <button
                                                        className="message-reaction-add-btn"
                                                        onClick={() => setActiveMessageMenu(msg._id)}
                                                        title="Add reaction"
                                                    >
                                                        +
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {activeMessageMenu === msg._id && (
                                            <div
                                                className={`message-action-menu ${index > messages.length - 4 ? "opens-up" : ""}`}
                                                onMouseLeave={() => setActiveMessageMenu(null)}
                                            >
                                                {!msg.isUnsent && (
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
                                                    </div>
                                                )}
                                                {!msg.isUnsent && (
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
                                                )}
                                                {!msg.isUnsent && hasMyReaction(msg) && (
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
                                                {!msg.isUnsent && (
                                                    <button className="message-menu-item">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                                        Message info
                                                    </button>
                                                )}
                                                {!msg.isUnsent &&
                                                    msg.sender._id === user._id && (
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
                                            </div>
                                        )}
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
                {showEmojiPicker && (
                    <div className="emoji-picker-container" ref={emojiPickerRef}>
                        <EmojiPicker
                            onEmojiClick={onEmojiClick}
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
                <div className="message-input-area">
                    <button
                        className={`emoji-btn ${showEmojiPicker ? "active" : ""}`}
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                    </button>
                    <input
                        className="message-input"
                        type="text"
                        placeholder="Type a message..."
                        value={inputValue}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                    />
                    <button className="send-btn" onClick={handleSend}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
}
