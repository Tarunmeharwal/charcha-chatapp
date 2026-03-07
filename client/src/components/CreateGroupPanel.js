"use client";
import { useState, useEffect } from "react";
import { getFriendsAPI, createGroupChatAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useChat } from "@/context/ChatContext";
import { getAvatarSrc } from "@/lib/avatar";

export default function CreateGroupPanel({ onClose }) {
    const { user } = useAuth();
    const { setSelectedChat, fetchMessages, fetchChats } = useChat();
    const [friends, setFriends] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [groupName, setGroupName] = useState("");
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Select Users, 2: Group Info

    useEffect(() => {
        const fetchFriends = async () => {
            setLoading(true);
            try {
                const data = await getFriendsAPI();
                if (Array.isArray(data)) {
                    setFriends(data);
                }
            } catch (error) {
                console.error("Error fetching friends:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFriends();
    }, []);

    const toggleUserSelection = (userId) => {
        setSelectedUsers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            alert("Please enter a group name");
            return;
        }
        if (selectedUsers.length < 2) {
            alert("Please select at least 2 friends");
            return;
        }

        setLoading(true);
        try {
            const data = await createGroupChatAPI({
                name: groupName,
                users: selectedUsers,
            });

            if (data._id) {
                await fetchChats();
                setSelectedChat(data);
                onClose();
            }
        } catch (error) {
            console.error("Error creating group:", error);
            alert(error.response?.data?.message || "Failed to create group");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel-overlay">
            <div className="panel-header">
                <button className="back-btn" onClick={step === 2 ? () => setStep(1) : onClose}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h3>{step === 1 ? "Add Group Members" : "New Group"}</h3>
            </div>

            {step === 1 ? (
                <>
                    <div className="panel-search">
                        <div style={{ padding: "0 10px", fontSize: "14px", color: "var(--text-muted)" }}>
                            {selectedUsers.length} selected
                        </div>
                    </div>
                    <div className="panel-results">
                        {loading ? (
                            <div className="loading-spinner">
                                <div className="spinner"></div>
                            </div>
                        ) : friends.length === 0 ? (
                            <div className="empty-state">
                                <p>No friends to add to group.</p>
                            </div>
                        ) : (
                            friends.map((f) => (
                                <div
                                    key={f._id}
                                    className={`user-item ${selectedUsers.includes(f._id) ? "selected" : ""}`}
                                    onClick={() => toggleUserSelection(f._id)}
                                >
                                    <div className="chat-avatar" style={{ width: 45, height: 45, fontSize: 18 }}>
                                        <img
                                            src={getAvatarSrc(f)}
                                            alt={`${f.username} avatar`}
                                            loading="lazy"
                                        />
                                    </div>
                                    <div className="user-item-info">
                                        <h4>@{f.username}</h4>
                                        <p>{f.about || "Hey there! I am using Charcha"}</p>
                                    </div>
                                    <div className={`checkbox ${selectedUsers.includes(f._id) ? "checked" : ""}`}>
                                        {selectedUsers.includes(f._id) && "✓"}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {selectedUsers.length >= 2 && (
                        <div style={{ padding: 20, position: "absolute", bottom: 0, left: 0, right: 0, background: "var(--bg-secondary)", borderTop: "1px solid var(--border-color)" }}>
                            <button className="btn-primary" style={{ width: "100%" }} onClick={() => setStep(2)}>
                                Next
                            </button>
                        </div>
                    )}
                </>
            ) : (
                <div style={{ padding: 20 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", marginTop: 20 }}>
                        <div className="chat-avatar" style={{ width: 100, height: 100, fontSize: 40, border: "2px dashed var(--border-color)", background: "var(--bg-hover)" }}>
                            👥
                        </div>
                        <div style={{ width: "100%" }}>
                            <label style={{ display: "block", fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 500 }}>
                                Group Name
                            </label>
                            <input
                                type="text"
                                placeholder="Enter group name..."
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    borderRadius: "var(--radius-md)",
                                    border: "1px solid var(--border-color)",
                                    background: "var(--bg-secondary)",
                                    fontSize: "15px"
                                }}
                                autoFocus
                            />
                        </div>
                        <div style={{ width: "100%" }}>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, fontWeight: 500 }}>
                                Members: {selectedUsers.length}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                {friends.filter(f => selectedUsers.includes(f._id)).map(f => (
                                    <div key={f._id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: "var(--bg-hover)", fontSize: 12 }}>
                                        <img src={getAvatarSrc(f)} style={{ width: 20, height: 20, borderRadius: "50%" }} alt="" />
                                        {f.username}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <button
                            className="btn-primary"
                            style={{ width: "100%", marginTop: 20 }}
                            onClick={handleCreateGroup}
                            disabled={loading || !groupName.trim()}
                        >
                            {loading ? "Creating..." : "Create Group"}
                        </button>
                    </div>
                </div>
            )}

            <style jsx>{`
                .checkbox {
                    width: 20px;
                    height: 20px;
                    border: 2.5px solid var(--border-color);
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    color: white;
                    transition: all 0.2s;
                }
                .checkbox.checked {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                }
                .user-item {
                    transition: background 0.2s;
                }
                .user-item.selected {
                    background: var(--bg-hover);
                }
            `}</style>
        </div>
    );
}
