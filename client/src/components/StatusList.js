"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    getStatusesAPI,
    getMyStatusesAPI,
    createStatusAPI,
    viewStatusAPI,
    deleteStatusAPI,
    createMediaStatusAPI,
} from "@/lib/api";
import { getAvatarSrc } from "@/lib/avatar";

const STATUS_COLORS = [
    "#075E54", "#128C7E", "#25D366", "#34B7F1",
    "#6C5CE7", "#E17055", "#D63031", "#FDCB6E",
    "#00B894", "#E84393", "#2D3436", "#0984E3",
];

export default function StatusList() {
    const { user } = useAuth();
    const [statuses, setStatuses] = useState([]);
    const [myStatuses, setMyStatuses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createType, setCreateType] = useState("text"); // "text" | "media"
    const [showViewer, setShowViewer] = useState(null);
    const [viewerIndex, setViewerIndex] = useState(0);
    const [showMyStatusDetails, setShowMyStatusDetails] = useState(false);
    const [showStatusOptions, setShowStatusOptions] = useState(false);
    const [showSeenList, setShowSeenList] = useState(false);
    const mediaInputRef = useRef(null);

    // Create status state
    const [statusText, setStatusText] = useState("");
    const [selectedColor, setSelectedColor] = useState(STATUS_COLORS[0]);
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [uploading, setUploading] = useState(false);

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

    const handleCreateTextStatus = async () => {
        if (!statusText.trim()) return;

        try {
            const data = await createStatusAPI({
                content: statusText,
                type: "text",
                backgroundColor: selectedColor,
            });

            if (data._id) {
                setMyStatuses((prev) => [data, ...prev]);
                closeCreateModal();
                fetchAllStatuses();
            }
        } catch (error) {
            console.error("Error creating status:", error);
        }
    };

    const handleCreateMediaStatus = async () => {
        if (!mediaFile) return;
        setUploading(true);

        try {
            const data = await createMediaStatusAPI(mediaFile, statusText);
            if (data._id) {
                setMyStatuses((prev) => [data, ...prev]);
                closeCreateModal();
                fetchAllStatuses();
            }
        } catch (error) {
            console.error("Error creating media status:", error);
            alert("Failed to upload media status. Make sure Cloudinary is configured.");
        } finally {
            setUploading(false);
        }
    };

    const closeCreateModal = () => {
        setShowCreateModal(false);
        setStatusText("");
        setSelectedColor(STATUS_COLORS[0]);
        setMediaFile(null);
        setMediaPreview(null);
        setCreateType("text");
    };

    const handleMediaSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
            alert("Please select an image or video file.");
            return;
        }

        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
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

        // Refresh to update seen status
        fetchAllStatuses();
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
        if (hours === 0) return `${minutes}m left`;
        return `${hours}h ${minutes}m left`;
    };

    // Check if current user has viewed all statuses in a group
    const hasSeenAllStatuses = (statusGroup) => {
        return statusGroup.statuses.every((status) =>
            status.viewedBy?.some(
                (viewer) => (viewer._id || viewer) === user?._id
            )
        );
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

    const otherStatuses = statuses.filter((s) => s.user._id !== user._id);

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
                <div style={{ padding: "8px 16px", display: "flex", gap: 8 }}>
                    <button
                        className="btn-primary"
                        style={{ flex: 1, padding: 10, fontSize: 13 }}
                        onClick={() => {
                            setCreateType("text");
                            setShowCreateModal(true);
                        }}
                    >
                        ✏️ Text
                    </button>
                    <button
                        className="btn-secondary"
                        style={{ flex: 1, padding: 10, fontSize: 13 }}
                        onClick={() => {
                            setCreateType("media");
                            setShowCreateModal(true);
                        }}
                    >
                        📷 Media
                    </button>
                    {myStatuses.length > 0 && (
                        <button
                            className="btn-secondary"
                            style={{ padding: "10px 14px", fontSize: 13 }}
                            onClick={() => setShowMyStatusDetails(true)}
                            title="Manage my statuses"
                        >
                            ⚙️
                        </button>
                    )}
                </div>

                {/* Recent Updates */}
                {otherStatuses.length > 0 && (
                    <>
                        <div className="status-section-title">Recent Updates</div>
                        {otherStatuses.map((statusGroup) => {
                            const allSeen = hasSeenAllStatuses(statusGroup);
                            return (
                                <div
                                    key={statusGroup.user._id}
                                    className="status-item"
                                    onClick={() => handleViewStatus(statusGroup)}
                                >
                                    <div className={`status-avatar has-status ${allSeen ? "seen" : ""}`}>
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
                            );
                        })}
                    </>
                )}

                {otherStatuses.length === 0 &&
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
                <div className="modal-overlay" onClick={closeCreateModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-header">
                            <h3>{createType === "text" ? "Text Status" : "Media Status"}</h3>
                            <button className="close-btn" onClick={closeCreateModal}>
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            {createType === "text" ? (
                                <>
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

                                    <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
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
                                </>
                            ) : (
                                <>
                                    <input
                                        ref={mediaInputRef}
                                        type="file"
                                        accept="image/*,video/*"
                                        onChange={handleMediaSelect}
                                        style={{ display: "none" }}
                                    />
                                    {!mediaPreview ? (
                                        <div
                                            style={{
                                                border: "2px dashed var(--border-color)",
                                                borderRadius: "var(--radius-md)",
                                                padding: 40,
                                                textAlign: "center",
                                                cursor: "pointer",
                                                marginBottom: 16,
                                            }}
                                            onClick={() => mediaInputRef.current?.click()}
                                        >
                                            <p style={{ fontSize: 40, marginBottom: 10 }}>📷</p>
                                            <p style={{ color: "var(--text-secondary)" }}>
                                                Click to select an image or video
                                            </p>
                                        </div>
                                    ) : (
                                        <div style={{ marginBottom: 16, textAlign: "center" }}>
                                            {mediaFile?.type?.startsWith("video/") ? (
                                                <video
                                                    src={mediaPreview}
                                                    controls
                                                    style={{
                                                        maxWidth: "100%",
                                                        maxHeight: 250,
                                                        borderRadius: "var(--radius-md)",
                                                    }}
                                                />
                                            ) : (
                                                <img
                                                    src={mediaPreview}
                                                    alt="Status preview"
                                                    style={{
                                                        maxWidth: "100%",
                                                        maxHeight: 250,
                                                        borderRadius: "var(--radius-md)",
                                                        objectFit: "cover",
                                                    }}
                                                />
                                            )}
                                            <button
                                                className="btn-secondary"
                                                style={{ marginTop: 8, fontSize: 12, padding: "4px 12px" }}
                                                onClick={() => {
                                                    setMediaFile(null);
                                                    setMediaPreview(null);
                                                }}
                                            >
                                                Change
                                            </button>
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        placeholder="Add a caption (optional)"
                                        value={statusText}
                                        onChange={(e) => setStatusText(e.target.value)}
                                        maxLength={200}
                                        style={{
                                            width: "100%",
                                            padding: 12,
                                            borderRadius: "var(--radius-sm)",
                                            border: "1px solid var(--border-color)",
                                            marginBottom: 8,
                                        }}
                                    />
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={closeCreateModal}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={createType === "text" ? handleCreateTextStatus : handleCreateMediaStatus}
                                disabled={
                                    createType === "text"
                                        ? !statusText.trim()
                                        : !mediaFile || uploading
                                }
                            >
                                {uploading ? "Uploading..." : "Post Status"}
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
                                {formatTime(showViewer.statuses[viewerIndex]?.createdAt)} • {formatExpiresIn(showViewer.statuses[viewerIndex]?.expiresAt)}
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
                        {showViewer.statuses[viewerIndex]?.type === "image" &&
                            showViewer.statuses[viewerIndex]?.mediaUrl ? (
                            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                                <img
                                    src={showViewer.statuses[viewerIndex].mediaUrl}
                                    alt="Status"
                                    style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 12 }}
                                />
                                {showViewer.statuses[viewerIndex].content && (
                                    <p style={{ color: "#fff", marginTop: 12, fontSize: 16, textAlign: "center" }}>
                                        {showViewer.statuses[viewerIndex].content}
                                    </p>
                                )}
                            </div>
                        ) : showViewer.statuses[viewerIndex]?.type === "video" &&
                            showViewer.statuses[viewerIndex]?.mediaUrl ? (
                            <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                                <video
                                    src={showViewer.statuses[viewerIndex].mediaUrl}
                                    controls
                                    autoPlay
                                    style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12 }}
                                />
                                {showViewer.statuses[viewerIndex].content && (
                                    <p style={{ color: "#fff", marginTop: 12, fontSize: 16, textAlign: "center" }}>
                                        {showViewer.statuses[viewerIndex].content}
                                    </p>
                                )}
                            </div>
                        ) : (
                            showViewer.statuses[viewerIndex]?.content
                        )}
                    </div>

                    {/* Navigation Buttons */}
                    <div style={{ position: "absolute", top: "50%", left: 0, right: 0, display: "flex", justifyContent: "space-between", padding: "0 12px", pointerEvents: "none" }}>
                        <button
                            style={{
                                pointerEvents: "auto",
                                background: "rgba(255,255,255,0.15)",
                                color: "#fff",
                                border: "none",
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                fontSize: 20,
                                cursor: "pointer",
                                visibility: viewerIndex > 0 ? "visible" : "hidden",
                                backdropFilter: "blur(4px)",
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewerIndex((prev) => Math.max(0, prev - 1));
                            }}
                        >
                            ‹
                        </button>
                        <button
                            style={{
                                pointerEvents: "auto",
                                background: "rgba(255,255,255,0.15)",
                                color: "#fff",
                                border: "none",
                                width: 40,
                                height: 40,
                                borderRadius: "50%",
                                fontSize: 20,
                                cursor: "pointer",
                                visibility: viewerIndex < showViewer.statuses.length - 1 ? "visible" : "hidden",
                                backdropFilter: "blur(4px)",
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewerIndex((prev) => Math.min(showViewer.statuses.length - 1, prev + 1));
                            }}
                        >
                            ›
                        </button>
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
                        <div className="modal-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
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
                                    {status.type === "text" && (
                                        <div
                                            style={{
                                                backgroundColor: status.backgroundColor || "#075E54",
                                                color: "#fff",
                                                padding: 16,
                                                borderRadius: "var(--radius-sm)",
                                                marginBottom: 8,
                                                fontSize: 14,
                                                textAlign: "center",
                                                minHeight: 50,
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                        >
                                            {status.content}
                                        </div>
                                    )}
                                    {(status.type === "image" || status.type === "video") && status.mediaUrl && (
                                        <div style={{ marginBottom: 8, textAlign: "center" }}>
                                            {status.type === "video" ? (
                                                <video src={status.mediaUrl} controls style={{ maxWidth: "100%", maxHeight: 120, borderRadius: "var(--radius-sm)" }} />
                                            ) : (
                                                <img src={status.mediaUrl} alt="Status" style={{ maxWidth: "100%", maxHeight: 120, objectFit: "cover", borderRadius: "var(--radius-sm)" }} />
                                            )}
                                        </div>
                                    )}
                                    <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, }}>
                                        {formatTime(status.createdAt)} • {formatExpiresIn(status.expiresAt)} • 👁 Seen by {status.viewedBy?.length || 0}
                                    </p>
                                    {(status.viewedBy || []).length > 0 && (
                                        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, }}>
                                            {status.viewedBy.map((viewer) => viewer.username).join(", ")}
                                        </p>
                                    )}
                                    <button
                                        className="btn-secondary"
                                        onClick={() => handleDeleteStatus(status._id)}
                                        style={{ fontSize: 12, padding: "6px 10px", color: "var(--danger)" }}
                                    >
                                        Delete
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
