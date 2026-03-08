"use client";
import { useState, useEffect, useCallback } from "react";
import { getFriendRequestsAPI, respondFriendRequestAPI } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { getSocket } from "@/lib/socket";
import { getAvatarSrc } from "@/lib/avatar";

export default function FriendRequestsPanel({ onClose, setFriendRequests }) {
    const { user, refreshUser } = useAuth();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = useCallback(async () => {
        try {
            const data = await getFriendRequestsAPI();
            if (Array.isArray(data)) {
                // Deduplicate by _id
                const uniqueRequests = data.filter((req, index, self) =>
                    req && req._id && index === self.findIndex((r) => r && String(r._id) === String(req._id))
                );
                setRequests(uniqueRequests);
                // Also update the sidebar count
                if (setFriendRequests) setFriendRequests(uniqueRequests);
            }
        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setLoading(false);
        }
    }, [setFriendRequests]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleRespond = async (requestId, action) => {
        try {
            const requestToHandle = requests.find(r => r._id === requestId);
            await respondFriendRequestAPI(requestId, action);

            // Update local state
            const updatedRequests = requests.filter((r) => r._id !== requestId);
            setRequests(updatedRequests);

            // Update sidebar state
            if (setFriendRequests) setFriendRequests(updatedRequests);

            // Emit socket event if accepted
            if (action === "accepted" && requestToHandle) {
                const socket = getSocket();
                socket.emit("accept_friend_request", {
                    to: requestToHandle.from._id,
                    from: user
                });
            }

            // Refresh user profile in AuthContext (to update friends list)
            await refreshUser();
        } catch (error) {
            console.error("Error responding to request:", error);
        }
    };

    return (
        <div className="panel-overlay">
            <div className="panel-header">
                <button className="back-btn" onClick={onClose}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h3>Friend Requests</h3>
            </div>

            <div className="panel-results">
                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="empty-state">
                        <span className="empty-icon">👥</span>
                        <h4>No pending requests</h4>
                        <p>When someone sends you a friend request, it will appear here</p>
                    </div>
                ) : (
                    requests.map((req) => (
                        <div key={req._id} className="friend-request-item">
                            <div className="chat-avatar" style={{ width: 45, height: 45, fontSize: 18 }}>
                                <img
                                    src={getAvatarSrc(req.from)}
                                    alt={`${req.from?.username || "User"} avatar`}
                                    loading="lazy"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <div className="user-item-info" style={{ flex: 1 }}>
                                <h4>@{req.from?.username}</h4>
                                <p>{req.from?.about || "Hey there! I am using Charcha"}</p>
                            </div>
                            <div className="friend-request-actions">
                                <button
                                    className="accept-btn"
                                    onClick={() => handleRespond(req._id, "accepted")}
                                >
                                    Accept
                                </button>
                                <button
                                    className="reject-btn"
                                    onClick={() => handleRespond(req._id, "rejected")}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
