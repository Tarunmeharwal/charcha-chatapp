"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { accessChatAPI } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import SearchPanel from "./SearchPanel";
import FriendRequestsPanel from "./FriendRequestsPanel";
import ProfilePanel from "./ProfilePanel";
import StatusList from "./StatusList";
import { getAvatarSrc } from "@/lib/avatar";

export default function Sidebar() {
    const { user, logout } = useAuth();
    const {
        chats,
        selectedChat,
        setSelectedChat,
        fetchMessages,
        getChatPartner,
        onlineUsers,
        typingUsers,
        notifications,
        removeNotification,
    } = useChat();

    const [activeTab, setActiveTab] = useState("chats");
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [showRequests, setShowRequests] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [liveFriendRequests, setLiveFriendRequests] = useState([]);

    const pendingFriendRequests =
        user?.friendRequests?.filter((request) => request.status === "pending") || [];
    const friendRequests = [...pendingFriendRequests, ...liveFriendRequests].filter(
        (request, index, list) =>
            index ===
            list.findIndex(
                (item) =>
                    (item.from?._id || item.from) === (request.from?._id || request.from)
            )
    );

    useEffect(() => {
        const socket = getSocket();
        socket.on("new_friend_request", (sender) => {
            setLiveFriendRequests((prev) => {
                // Check if already in list to avoid duplicates
                if (prev.some((request) => request.from?._id === sender._id)) return prev;
                return [
                    { from: sender, status: "pending", _id: Date.now().toString() },
                    ...prev,
                ];
            });
        });

        return () => {
            socket.off("new_friend_request");
        };
    }, []);

    const handleSelectChat = async (chat) => {
        setSelectedChat(chat);
        removeNotification(chat._id);

        const socket = getSocket();
        socket.emit("join_chat", chat._id);

        await fetchMessages(chat._id);
    };

    const formatTime = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        } else if (diffDays === 1) {
            return "Yesterday";
        } else if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: "short" });
        }
        return date.toLocaleDateString([], { month: "short", day: "numeric" });
    };

    const getChatName = (chat) => {
        if (chat.isGroupChat) return chat.chatName;
        const partner = getChatPartner(chat);
        return partner ? partner.username : "Unknown";
    };

    const getLastMessage = (chat) => {
        if (!chat.latestMessage) return "No messages yet";
        const msg = chat.latestMessage;
        if (msg.isUnsent) {
            return msg.sender?._id === user?._id
                ? "You unsent a message"
                : `${msg.sender?.username}: message was unsent`;
        }
        const senderName =
            msg.sender?._id === user?._id ? "You" : msg.sender?.username;
        return `${senderName}: ${msg.content}`;
    };

    const isOnline = (chat) => {
        if (chat.isGroupChat) return false;
        const partner = getChatPartner(chat);
        return partner ? onlineUsers.includes(partner._id) : false;
    };

    const hasNotification = (chatId) => {
        return notifications.some((n) => n.chat._id === chatId);
    };

    const filteredChats = chats.filter((chat) => {
        if (!searchQuery) return true;
        const name = getChatName(chat);
        return name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    return (
        <div className="sidebar" style={{ position: "relative" }}>
            {/* Header */}
            <div className="sidebar-header">
                <div className="sidebar-header-left">
                    <div
                        className="chat-avatar"
                        style={{ width: 40, height: 40, fontSize: 16, cursor: "pointer" }}
                        onClick={() => setShowProfile(true)}
                    >
                        <img
                            src={getAvatarSrc(user)}
                            alt={`${user?.username || "User"} avatar`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                    </div>
                    <h2>Charcha</h2>
                </div>
                <div className="sidebar-header-right">
                    <button
                        className="icon-btn"
                        title="Friend Requests"
                        onClick={() => setShowRequests(true)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
                        {friendRequests.length > 0 && (
                            <span className="badge">{friendRequests.length}</span>
                        )}
                    </button>
                    <button
                        className="icon-btn"
                        title="New Chat"
                        onClick={() => setShowSearch(true)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </button>
                    <div style={{ position: "relative" }}>
                        <button
                            className="icon-btn"
                            title="Menu"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></svg>
                        </button>
                        {showMenu && (
                            <div
                                style={{
                                    position: "absolute",
                                    top: 44,
                                    right: 0,
                                    background: "var(--bg-secondary)",
                                    borderRadius: "var(--radius-md)",
                                    boxShadow: "var(--shadow-lg)",
                                    border: "1px solid var(--border-color)",
                                    minWidth: 200,
                                    zIndex: 40,
                                    overflow: "hidden",
                                    padding: "6px",
                                }}
                            >
                                <button
                                    className="logout-btn"
                                    onClick={() => {
                                        setShowMenu(false);
                                        setShowProfile(true);
                                    }}
                                    style={{ borderRadius: "var(--radius-sm)" }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    My Profile
                                </button>
                                <button
                                    className="logout-btn"
                                    onClick={() => {
                                        setShowMenu(false);
                                        logout();
                                    }}
                                    style={{ borderRadius: "var(--radius-sm)", color: "var(--danger)" }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="sidebar-tabs">
                <button
                    className={`sidebar-tab ${activeTab === "chats" ? "active" : ""}`}
                    onClick={() => setActiveTab("chats")}
                >
                    All Chats
                </button>
                <button
                    className={`sidebar-tab ${activeTab === "status" ? "active" : ""}`}
                    onClick={() => setActiveTab("status")}
                >
                    Status
                </button>
            </div>

            {/* Search */}
            {activeTab === "chats" && (
                <div className="search-bar">
                    <div className="search-input-wrapper">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            type="text"
                            placeholder="Search or start new chat"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            )}

            {/* Content based on tab */}
            {activeTab === "chats" ? (
                <div className="chat-list">
                    {filteredChats.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">💬</span>
                            <h4>No chats yet</h4>
                            <p>Search for friends to start chatting!</p>
                        </div>
                    ) : (
                        filteredChats.map((chat) => (
                            <div
                                key={chat._id}
                                className={`chat-item ${selectedChat?._id === chat._id ? "active" : ""}`}
                                onClick={() => handleSelectChat(chat)}
                            >
                                <div className="chat-avatar">
                                    <img
                                        src={
                                            chat.isGroupChat
                                                ? getAvatarSrc(getChatName(chat))
                                                : getAvatarSrc(getChatPartner(chat))
                                        }
                                        alt={`${getChatName(chat)} avatar`}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                    />
                                    {isOnline(chat) && <span className="online-dot"></span>}
                                </div>
                                <div className="chat-info">
                                    <div className="chat-info-top">
                                        <h4>{getChatName(chat)}</h4>
                                        <span className="chat-time">
                                            {formatTime(
                                                chat.latestMessage?.createdAt || chat.updatedAt
                                            )}
                                        </span>
                                    </div>
                                    <div className="chat-info-bottom">
                                        <p>
                                            {typingUsers[chat._id]
                                                ? "typing..."
                                                : getLastMessage(chat)}
                                        </p>
                                        {hasNotification(chat._id) && (
                                            <span className="unread-badge">●</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <StatusList />
            )}

            {/* Panels */}
            {showSearch && <SearchPanel onClose={() => setShowSearch(false)} />}
            {showRequests && (
                <FriendRequestsPanel
                    onClose={() => setShowRequests(false)}
                    setFriendRequests={setLiveFriendRequests}
                />
            )}
            {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}

            {/* Click outside to close menu */}
            {showMenu && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        zIndex: 30,
                    }}
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
}
