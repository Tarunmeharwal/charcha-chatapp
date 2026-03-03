"use client";
import { useState, useEffect } from "react";
import { searchUsersAPI, sendFriendRequestAPI, accessChatAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { getSocket } from "@/lib/socket";
import { getAvatarSrc } from "@/lib/avatar";

export default function SearchPanel({ onClose }) {
    const { user } = useAuth();
    const { setSelectedChat, fetchMessages, fetchChats } = useChat();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sentRequests, setSentRequests] = useState([]);
    const [friends, setFriends] = useState([]);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const { getFriendsAPI } = await import("@/lib/api");
                const data = await getFriendsAPI();
                if (Array.isArray(data)) {
                    setFriends(data);
                }
            } catch (error) {
                console.error("Error fetching friends:", error);
            }
        };
        fetchFriends();
    }, []);

    const handleSearch = async (e) => {
        const value = e.target.value;
        setQuery(value);

        if (value.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const data = await searchUsersAPI(value);
            if (Array.isArray(data)) {
                setResults(data);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            await sendFriendRequestAPI(userId);
            setSentRequests((prev) => [...prev, userId]);

            // Emit socket event for real-time notification
            const socket = getSocket();
            socket.emit("send_friend_request", {
                from: user,
                to: userId
            });
        } catch (error) {
            console.error("Error sending request:", error);
        }
    };

    const handleStartChat = async (userId) => {
        try {
            const chat = await accessChatAPI(userId);
            if (chat._id) {
                await fetchChats();
                setSelectedChat(chat);

                const socket = getSocket();
                socket.emit("join_chat", chat._id);

                await fetchMessages(chat._id);
                onClose();
            }
        } catch (error) {
            console.error("Error starting chat:", error);
        }
    };

    const isFriend = (userId) => {
        return user?.friends?.some(
            (f) => (typeof f === "string" ? f : f._id) === userId
        );
    };

    return (
        <div className="panel-overlay">
            <div className="panel-header">
                <button className="back-btn" onClick={onClose}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h3>New Chat</h3>
            </div>

            <div className="panel-search">
                <div className="search-input-wrapper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                        type="text"
                        placeholder="Search by username..."
                        value={query}
                        onChange={handleSearch}
                        autoFocus
                    />
                </div>
            </div>

            <div className="panel-results">
                {loading && (
                    <div className="loading-spinner">
                        <div className="spinner" style={{ width: 28, height: 28 }}></div>
                    </div>
                )}

                {/* Friends List - Shown when NOT searching */}
                {!loading && !query && (
                    <div className="friends-selection">
                        <div style={{
                            padding: "15px 20px",
                            fontSize: "12px",
                            color: "var(--text-muted)",
                            fontWeight: "700",
                            letterSpacing: "0.8px",
                            textTransform: "uppercase"
                        }}>
                            MY FRIENDS ({friends.length})
                        </div>
                        {friends.length === 0 ? (
                            <div className="empty-state" style={{ marginTop: 20 }}>
                                <p>You haven&apos;t added any friends yet.</p>
                                <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                                    Search for username or email above to add someone!
                                </p>
                            </div>
                        ) : (
                            friends.map((f) => (
                                <div key={f._id} className="user-item" onClick={() => handleStartChat(f._id)}>
                                    <div className="chat-avatar" style={{ width: 45, height: 45, fontSize: 18 }}>
                                        <img
                                            src={getAvatarSrc(f)}
                                            alt={`${f.username} avatar`}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="user-item-info">
                                        <h4>@{f.username}</h4>
                                        <p>{f.about || "Hey there! I am using Charcha"}</p>
                                    </div>
                                    <button className="action-btn">Chat</button>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {!loading && query.length >= 2 && results.length === 0 && (
                    <div className="empty-state">
                        <span className="empty-icon">🔍</span>
                        <h4>No users found</h4>
                        <p>Try a different username</p>
                    </div>
                )}

                {results.map((u) => (
                    <div key={u._id} className="user-item">
                        <div className="chat-avatar" style={{ width: 45, height: 45, fontSize: 18 }}>
                            <img
                                src={getAvatarSrc(u)}
                                alt={`${u.username} avatar`}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div className="user-item-info">
                            <h4>@{u.username}</h4>
                            <p>{u.about || "Hey there! I am using Charcha"}</p>
                        </div>
                        {isFriend(u._id) ? (
                            <button
                                className="action-btn"
                                onClick={() => handleStartChat(u._id)}
                            >
                                Chat
                            </button>
                        ) : sentRequests.includes(u._id) ? (
                            <button className="action-btn sent">Sent ✓</button>
                        ) : (
                            <button
                                className="action-btn"
                                onClick={() => handleSendRequest(u._id)}
                            >
                                Add +
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
