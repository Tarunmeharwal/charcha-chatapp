"use client";
import { useState, useEffect } from "react";
import { searchUsersAPI, sendFriendRequestAPI, accessChatAPI, getSuggestionsAPI } from "@/lib/api";
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
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    const fetchFriends = async () => {
        try {
            const { getFriendsAPI } = await import("@/lib/api");
            const data = await getFriendsAPI();
            if (Array.isArray(data)) {
                // Deduplicate by _id to prevent duplicate key errors
                const uniqueFriends = data.filter((friend, index, self) =>
                    friend && friend._id && index === self.findIndex((f) => f && String(f._id) === String(friend._id))
                );
                setFriends(uniqueFriends);
            }
        } catch (error) {
            console.error("Error fetching friends:", error);
        }
    };

    const fetchSuggestions = async () => {
        setLoadingSuggestions(true);
        try {
            const data = await getSuggestionsAPI();
            if (Array.isArray(data)) {
                setSuggestions(data);
            }
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    useEffect(() => {
        fetchFriends();
        fetchSuggestions();
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
                // Deduplicate by _id to prevent duplicate key errors
                const uniqueResults = data.filter((user, index, self) =>
                    user && user._id && index === self.findIndex((u) => u && String(u._id) === String(user._id))
                );
                setResults(uniqueResults);
            }
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            const response = await sendFriendRequestAPI(userId);

            if (response.status === "accepted") {
                const updateStatus = (list) => list.map((u) => u._id === userId ? { ...u, relationship: "friends" } : u);
                setResults(updateStatus);
                setSuggestions(updateStatus);
                fetchFriends();
            } else {
                setSentRequests((prev) => [...prev, userId]);
            }

            const socket = getSocket();
            socket.emit("send_friend_request", { from: user, to: userId });
        } catch (error) {
            console.error("Error sending request:", error);
            alert(error.response?.data?.message || "Failed to send request");
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
                                <div key={`friend-${f._id}`} className="user-item" onClick={() => handleStartChat(f._id)}>
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

                {/* Search Results - Shown when searching */}
                {!loading && query.length >= 2 && (
                    <>
                        {results.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">🔍</span>
                                <h4>No users found</h4>
                                <p>Try a different username</p>
                            </div>
                        ) : (
                            results.map((u) => (
                                <div key={`search-${u._id}`} className="user-item">
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
                                    {u.relationship === "friends" ? (
                                        <button
                                            className="action-btn"
                                            onClick={() => handleStartChat(u._id)}
                                        >
                                            Chat
                                        </button>
                                    ) : u.relationship === "request_sent" || sentRequests.includes(String(u._id)) ? (
                                        <button className="action-btn sent" disabled>Sent ✓</button>
                                    ) : u.relationship === "request_received" ? (
                                        <button
                                            className="action-btn"
                                            onClick={() => handleSendRequest(u._id)}
                                            style={{ background: "var(--gradient-success)" }}
                                        >
                                            Accept
                                        </button>
                                    ) : (
                                        <button
                                            className="action-btn"
                                            onClick={() => handleSendRequest(u._id)}
                                        >
                                            Add +
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </>
                )}
                {!loading && !query && (
                    <div className="discovery-section" style={{ borderTop: "1px solid var(--border-color)", marginTop: 10 }}>
                        <div style={{
                            padding: "15px 20px 10px",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}>
                            <span style={{
                                fontSize: "12px",
                                color: "var(--text-muted)",
                                fontWeight: "700",
                                letterSpacing: "0.8px",
                                textTransform: "uppercase"
                            }}>
                                Discover People
                            </span>
                            <button
                                className="icon-btn"
                                onClick={fetchSuggestions}
                                disabled={loadingSuggestions}
                                title="Refresh Suggestions"
                                style={{ padding: 4 }}
                            >
                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={loadingSuggestions ? "spin" : ""}
                                >
                                    <path d="M21 2v6h-6" />
                                    <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                                    <path d="M3 22v-6h6" />
                                    <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                                </svg>
                            </button>
                        </div>

                        {loadingSuggestions && suggestions.length === 0 ? (
                            <div style={{ padding: "20px", textAlign: "center" }}>
                                <div className="spinner" style={{ width: 20, height: 20, margin: "0 auto" }}></div>
                            </div>
                        ) : (
                            <div className="suggestions-list">
                                {suggestions.map((u) => (
                                    <div key={`suggest-${u._id}`} className="user-item">
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

                                        {u.relationship === "friends" ? (
                                            <button
                                                className="action-btn"
                                                onClick={() => handleStartChat(u._id)}
                                            >
                                                Chat
                                            </button>
                                        ) : u.relationship === "request_sent" || sentRequests.includes(String(u._id)) ? (
                                            <button className="action-btn sent" disabled>Sent ✓</button>
                                        ) : u.relationship === "request_received" ? (
                                            <button
                                                className="action-btn"
                                                onClick={() => handleSendRequest(u._id)}
                                                style={{ background: "var(--gradient-success)" }}
                                            >
                                                Accept
                                            </button>
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
                                {suggestions.length > 0 && (
                                    <div style={{ padding: "10px 20px 30px", textAlign: "center" }}>
                                        <button
                                            onClick={fetchSuggestions}
                                            style={{
                                                background: "none",
                                                border: "1px solid var(--border-color)",
                                                color: "var(--text-secondary)",
                                                fontSize: "12px",
                                                padding: "6px 16px",
                                                borderRadius: "20px",
                                                cursor: "pointer",
                                                transition: "all 0.2s"
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = "var(--accent-primary)";
                                                e.currentTarget.style.color = "var(--text-primary)";
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = "var(--border-color)";
                                                e.currentTarget.style.color = "var(--text-secondary)";
                                            }}
                                        >
                                            Find More People
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
