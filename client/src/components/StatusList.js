"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    getStatusesAPI,
    getMyStatusesAPI,
    createStatusAPI,
    viewStatusAPI,
    deleteStatusAPI,
} from "@/lib/api";
import { getAvatarSrc } from "@/lib/avatar";

const STATUS_COLORS = [
    "#075E54",
    "#128C7E",
    "#25D366",
    "#DCF8C6",
    "#34B7F1",
    "#6C5CE7",
    "#E17055",
    "#D63031",
    "#FDCB6E",
    "#00B894",
    "#E84393",
    "#2D3436",
];

export default function StatusList() {
    const { user } = useAuth();
    const [statuses, setStatuses] = useState([]);
    const [myStatuses, setMyStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showViewer, setShowViewer] = useState(null);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [showMyStatusDetails, setShowMyStatusDetails] = useState(false);
    const [showStatusOptions, setShowStatusOptions] = useState(false);
    const [showSeenList, setShowSeenList] = useState(false);

    // Create status state
    const [statusText, setStatusText] = useState("");
    const [selectedColor, setSelectedColor] = useState(STATUS_COLORS[0]);

    useEffect(() => {
        fetchAllStatuses();
    }, []);

    const fetchAllStatuses = async () => {
        try {
            const [statusData, myStatusData] = await Promise.all([
                getStatusesAPI(),
                getMyStatusesAPI(),
            ]);
            if (Array.isArray(statusData)) setStatuses(statusData);
            if (Array.isArray(myStatusData)) setMyStatuses(myStatusData);
        } catch (error) {
            console.error("Error fetching statuses:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateStatus = async () => {
        if (!statusText.trim()) return;

        try {
            const data = await createStatusAPI({
                content: statusText,
                type: "text",
                backgroundColor: selectedColor,
            });

            if (data._id) {
                setMyStatuses((prev) => [data, ...prev]);
                setShowCreateModal(false);
                setStatusText("");
                setSelectedColor(STATUS_COLORS[0]);
                fetchAllStatuses();
            }
        } catch (error) {
            console.error("Error creating status:", error);
        }
    };

    const handleViewStatus = async (statusGroup) => {
        setShowViewer(statusGroup);
        setViewerIndex(0);
        setShowStatusOptions(false);
        setShowSeenList(false);

        // Mark status as viewed
        for (const status of statusGroup.statuses) {
            if (statusGroup.user?._id !== user?._id) {
                await viewStatusAPI(status._id);
            }
        }
    };

    const handleDeleteStatus = async (statusId) => {
        try {
            const data = await deleteStatusAPI(statusId);
            if (data?.message) {
                setMyStatuses((prev) => prev.filter((status) => status._id !== statusId));
                if (showViewer?.user?._id === user?._id) {
                    const updatedStatuses = showViewer.statuses.filter(
                        (status) => status._id !== statusId
                    );
                    if (updatedStatuses.length === 0) {
                        setShowViewer(null);
                    } else {
                        setShowViewer({ ...showViewer, statuses: updatedStatuses });
                        setViewerIndex((prev) => Math.min(prev, updatedStatuses.length - 1));
                    }
                }
            }
        } catch (error) {
            console.error("Error deleting status:", error);
        }
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    const formatExpiresIn = (expiresAt) => {
        const now = Date.now();
        const expiry = new Date(expiresAt).getTime();
        const remainingMs = Math.max(0, expiry - now);
        const hours = Math.floor(remainingMs / (1000 * 60 * 60));
        const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        if (hours === 0) return `Expires in ${minutes}m`;
        return `Expires in ${hours}h ${minutes}m`;
    };

    // Auto advance status viewer
    useEffect(() => {
        if (!showViewer) return;

        const timer = setTimeout(() => {
            if (viewerIndex < showViewer.statuses.length - 1) {
                setViewerIndex((prev) => prev + 1);
            } else {
                setShowViewer(null);
            }
        }, 5000);

        return () => clearTimeout(timer);
    }, [showViewer, viewerIndex]);

    useEffect(() => {
        setShowStatusOptions(false);
        setShowSeenList(false);
    }, [viewerIndex]);

    const currentViewedStatus = showViewer?.statuses?.[viewerIndex];
    const currentViewers = currentViewedStatus?.viewedBy || [];

    if (loading) {
        return (
            <div className="loading-spinner">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <>
            <div className="status-list">
                {/* My Status */}
                <div
                    className="status-item"
                    onClick={() =>
                        myStatuses.length > 0
                            ? handleViewStatus({ user, statuses: myStatuses })
                            : setShowCreateModal(true)
                    }
                >
                    <div className={`status-avatar ${myStatuses.length > 0 ? "has-status" : ""}`}>
                        <img
                            src={getAvatarSrc(user)}
                            alt={`${user?.username || "User"} avatar`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                        />
                        {myStatuses.length === 0 && (
                            <span className="add-status-icon">+</span>
                        )}
                    </div>
                    <div className="status-info">
                        <h4>My Status</h4>
                        <p>
                            {myStatuses.length > 0
                                ? `${myStatuses.length} update${myStatuses.length > 1 ? "s" : ""}`
                                : "Tap to add status update"}
                        </p>
                    </div>
                </div>

                {/* Add Status Button */}
                <div style={{ padding: "8px 16px" }}>
                    <button
                        className="btn-primary"
                        style={{ width: "100%", padding: 12 }}
                        onClick={() => setShowCreateModal(true)}
                    >
                        + Add Status
                    </button>
                    {myStatuses.length > 0 && (
                        <button
                            className="btn-secondary"
                            style={{ width: "100%", marginTop: 8, padding: 12 }}
                            onClick={() => setShowMyStatusDetails(true)}
                        >
                            Manage my statuses
                        </button>
                    )}
                </div>

                {/* Recent Updates */}
                {statuses.filter((s) => s.user._id !== user._id).length > 0 && (
                    <>
                        <div className="status-section-title">Recent Updates</div>
                        {statuses
                            .filter((s) => s.user._id !== user._id)
                            .map((statusGroup) => (
                                <div
                                    key={statusGroup.user._id}
                                    className="status-item"
                                    onClick={() => handleViewStatus(statusGroup)}
                                >
                                    <div className="status-avatar has-status">
                                        <img
                                            src={getAvatarSrc(statusGroup.user)}
                                            alt={`${statusGroup.user.username} avatar`}
                                            loading="lazy"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="status-info">
                                        <h4>{statusGroup.user.username}</h4>
                                        <p>
                                            {statusGroup.statuses.length} update
                                            {statusGroup.statuses.length > 1 ? "s" : ""} •{" "}
                                            {formatTime(statusGroup.statuses[0].createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                    </>
                )}

                {statuses.filter((s) => s.user._id !== user._id).length === 0 &&
                    myStatuses.length === 0 && (
                        <div className="empty-state">
                            <span className="empty-icon">📷</span>
                            <h4>No status updates</h4>
                            <p>Add a status or wait for friends to post!</p>
                        </div>
                    )}
            </div>

            {/* Create Status Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create Status</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowCreateModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div
                                className="status-preview"
                                style={{ backgroundColor: selectedColor }}
                            >
                                <textarea
                                    className="status-text-input"
                                    placeholder="Type a status..."
                                    value={statusText}
                                    onChange={(e) => setStatusText(e.target.value)}
                                    maxLength={200}
                                    autoFocus
                                />
                            </div>

                            <p
                                style={{
                                    fontSize: 13,
                                    color: "var(--text-muted)",
                                    marginBottom: 12,
                                }}
                            >
                                Background Color
                            </p>
                            <div className="color-picker">
                                {STATUS_COLORS.map((color) => (
                                    <div
                                        key={color}
                                        className={`color-option ${selectedColor === color ? "selected" : ""}`}
                                        style={{ backgroundColor: color }}
                                        onClick={() => setSelectedColor(color)}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowCreateModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCreateStatus}
                                disabled={!statusText.trim()}
                            >
                                Post Status
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Viewer */}
            {showViewer && (
                <div
                    className="status-viewer-overlay"
                    onClick={() => setShowViewer(null)}
                >
                    {/* Progress bars */}
                    <div className="status-viewer-progress">
                        {showViewer.statuses.map((_, i) => (
                            <div key={i} className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width:
                                            i < viewerIndex
                                                ? "100%"
                                                : i === viewerIndex
                                                    ? "100%"
                                                    : "0%",
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Header */}
                    <div className="status-viewer-header">
                        <div
                            className="chat-avatar"
                            style={{ width: 36, height: 36, fontSize: 14 }}
                        >
                            <img
                                src={getAvatarSrc(showViewer.user)}
                                alt={`${showViewer.user?.username || "User"} avatar`}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        </div>
                        <div>
                            <p style={{ color: "#fff", fontSize: 14, fontWeight: 500 }}>
                                {showViewer.user?.username}
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                                {formatTime(showViewer.statuses[viewerIndex]?.createdAt)}
                            </p>
                            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                                {formatExpiresIn(showViewer.statuses[viewerIndex]?.expiresAt)}
                            </p>
                        </div>
                        {showViewer.user?._id === user?._id && (
                            <div style={{ marginLeft: "auto", position: "relative" }}>
                                <button
                                    className="status-options-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowStatusOptions((prev) => !prev);
                                    }}
                                >
                                    ⋮
                                </button>
                                {showStatusOptions && (
                                    <div className="status-options-menu">
                                        <button
                                            className="status-options-item delete"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteStatus(
                                                    showViewer.statuses[viewerIndex]._id
                                                );
                                                setShowStatusOptions(false);
                                            }}
                                        >
                                            Delete status
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            className="close-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowViewer(null);
                            }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div
                        className="status-viewer-content text-status"
                        style={{
                            backgroundColor:
                                showViewer.statuses[viewerIndex]?.backgroundColor || "#075E54",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {showViewer.statuses[viewerIndex]?.content}
                    </div>

                    {showViewer.user?._id === user?._id && (
                        <div
                            className="status-viewer-seen-panel"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                className="status-seen-toggle"
                                onClick={() => setShowSeenList((prev) => !prev)}
                            >
                                <span>👁 Seen by {currentViewers.length}</span>
                                <span>{showSeenList ? "▾" : "▴"}</span>
                            </button>
                            {showSeenList && (
                                <div className="status-seen-list">
                                    {currentViewers.length === 0 && (
                                        <p className="status-seen-empty">
                                            Nobody has seen this status yet.
                                        </p>
                                    )}
                                    {currentViewers.map((viewer) => (
                                        <div key={viewer._id} className="status-seen-item">
                                            {viewer.username}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showMyStatusDetails && (
                <div className="modal-overlay" onClick={() => setShowMyStatusDetails(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>My Status Details</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowMyStatusDetails(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            {myStatuses.length === 0 && <p>No active status updates.</p>}
                            {myStatuses.map((status) => (
                                <div
                                    key={status._id}
                                    style={{
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "var(--radius-sm)",
                                        padding: 12,
                                        marginBottom: 10,
                                    }}
                                >
                                    <p style={{ marginBottom: 6 }}>{status.content}</p>
                                    <p
                                        style={{
                                            fontSize: 12,
                                            color: "var(--text-secondary)",
                                            marginBottom: 8,
                                        }}
                                    >
                                        {formatTime(status.createdAt)} •{" "}
                                        {formatExpiresIn(status.expiresAt)} •{" "}
                                        Seen by {status.viewedBy?.length || 0}
                                    </p>
                                    {(status.viewedBy || []).length > 0 && (
                                        <p
                                            style={{
                                                fontSize: 13,
                                                color: "var(--text-secondary)",
                                                marginBottom: 8,
                                            }}
                                        >
                                            Seen by:{" "}
                                            {status.viewedBy
                                                .map((viewer) => viewer.username)
                                                .join(", ")}
                                        </p>
                                    )}
                                    <button
                                        className="btn-secondary"
                                        onClick={() => handleDeleteStatus(status._id)}
                                        style={{ fontSize: 12, padding: "6px 10px" }}
                                    >
                                        Delete this status
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
