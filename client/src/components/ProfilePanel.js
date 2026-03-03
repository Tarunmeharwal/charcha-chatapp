"use client";
import { useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    updateProfileAPI,
    uploadProfileAvatarAPI,
    removeProfileAvatarAPI,
} from "@/lib/api";
import { getAvatarLibrary, getAvatarSrc } from "@/lib/avatar";

const AVATAR_CROP_SIZE = 280;

const initialCropState = {
    open: false,
    src: "",
    imageWidth: 0,
    imageHeight: 0,
    baseScale: 1,
    zoom: 1,
    panX: 0,
    panY: 0,
};

export default function ProfilePanel({ onClose }) {
    const { user, setUser, logout } = useAuth();
    const [editingAbout, setEditingAbout] = useState(false);
    const [aboutText, setAboutText] = useState(user?.about || "");
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState("");
    const [avatarCategory, setAvatarCategory] = useState("all");
    const fileInputRef = useRef(null);
    const dragRef = useRef(null);
    const [cropState, setCropState] = useState(initialCropState);

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const clampPan = (next) => {
        const scale = next.baseScale * next.zoom;
        const maxPanX = Math.max((next.imageWidth * scale - AVATAR_CROP_SIZE) / 2, 0);
        const maxPanY = Math.max((next.imageHeight * scale - AVATAR_CROP_SIZE) / 2, 0);

        return {
            panX: clamp(next.panX, -maxPanX, maxPanX),
            panY: clamp(next.panY, -maxPanY, maxPanY),
        };
    };

    const closeCropModal = () => {
        setCropState((prev) => {
            if (prev.src) URL.revokeObjectURL(prev.src);
            return initialCropState;
        });
        dragRef.current = null;
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const uploadAvatarFile = async (file) => {
        setUploadingAvatar(true);
        setAvatarError("");
        try {
            const data = await uploadProfileAvatarAPI(file);
            if (data._id) {
                setUser((prev) => ({
                    ...prev,
                    profilePic: data.profilePic,
                    profilePicPublicId: data.profilePicPublicId,
                }));
            } else {
                setAvatarError(data?.message || "Failed to upload avatar.");
            }
        } catch (error) {
            setAvatarError("Failed to upload avatar.");
            console.error("Error uploading avatar:", error);
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleSaveAbout = async () => {
        try {
            const data = await updateProfileAPI({ about: aboutText.trim() });
            if (data._id) {
                setUser((prev) => ({ ...prev, about: data.about }));
                setEditingAbout(false);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    const handlePickAvatar = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setAvatarError("Please select a valid image file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setAvatarError("");
        const previewUrl = URL.createObjectURL(file);
        const image = new Image();

        image.onload = () => {
            setCropState((prev) => {
                if (prev.src) URL.revokeObjectURL(prev.src);
                return {
                    open: true,
                    src: previewUrl,
                    imageWidth: image.width,
                    imageHeight: image.height,
                    baseScale: Math.max(
                        AVATAR_CROP_SIZE / image.width,
                        AVATAR_CROP_SIZE / image.height
                    ),
                    zoom: 1,
                    panX: 0,
                    panY: 0,
                };
            });
        };

        image.onerror = () => {
            URL.revokeObjectURL(previewUrl);
            setAvatarError("Failed to read image. Please try another file.");
            if (fileInputRef.current) fileInputRef.current.value = "";
        };

        image.src = previewUrl;
    };

    const updateCropState = (updater) => {
        setCropState((prev) => {
            if (!prev.open) return prev;
            const next = updater(prev);
            const clamped = clampPan(next);
            return { ...next, ...clamped };
        });
    };

    const handleCropPointerDown = (e) => {
        if (!cropState.open) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        dragRef.current = {
            pointerId: e.pointerId,
            startX: e.clientX,
            startY: e.clientY,
            startPanX: cropState.panX,
            startPanY: cropState.panY,
        };
    };

    const handleCropPointerMove = (e) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== e.pointerId) return;

        const deltaX = e.clientX - drag.startX;
        const deltaY = e.clientY - drag.startY;
        updateCropState((prev) => ({
            ...prev,
            panX: drag.startPanX + deltaX,
            panY: drag.startPanY + deltaY,
        }));
    };

    const handleCropPointerUp = (e) => {
        if (dragRef.current?.pointerId === e.pointerId) {
            dragRef.current = null;
        }
    };

    const createCroppedAvatarBlob = async () => {
        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = cropState.src;
        });

        const scale = cropState.baseScale * cropState.zoom;
        const sourceSize = AVATAR_CROP_SIZE / scale;
        const sourceX =
            (-AVATAR_CROP_SIZE / 2 - cropState.panX) / scale +
            cropState.imageWidth / 2;
        const sourceY =
            (-AVATAR_CROP_SIZE / 2 - cropState.panY) / scale +
            cropState.imageHeight / 2;

        const safeSourceX = clamp(sourceX, 0, cropState.imageWidth - sourceSize);
        const safeSourceY = clamp(sourceY, 0, cropState.imageHeight - sourceSize);

        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas context not available");

        context.drawImage(
            image,
            safeSourceX,
            safeSourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to create cropped image."));
                        return;
                    }
                    resolve(blob);
                },
                "image/jpeg",
                0.92
            );
        });
    };

    const handleCropSave = async () => {
        try {
            const blob = await createCroppedAvatarBlob();
            const croppedFile = new File([blob], `avatar-${Date.now()}.jpg`, {
                type: "image/jpeg",
            });
            closeCropModal();
            await uploadAvatarFile(croppedFile);
        } catch (error) {
            setAvatarError("Failed to crop avatar.");
            console.error("Error cropping avatar:", error);
        }
    };

    const handleAvatarRemove = async () => {
        setUploadingAvatar(true);
        setAvatarError("");
        try {
            const data = await removeProfileAvatarAPI();
            if (data._id) {
                setUser((prev) => ({
                    ...prev,
                    profilePic: "",
                    profilePicPublicId: "",
                }));
            } else {
                setAvatarError(data?.message || "Failed to remove avatar.");
            }
        } catch (error) {
            setAvatarError("Failed to remove avatar.");
            console.error("Error removing avatar:", error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleChooseIllustration = async (avatarUrl) => {
        setUploadingAvatar(true);
        setAvatarError("");
        try {
            const data = await updateProfileAPI({ profilePic: avatarUrl });
            if (data?._id) {
                setUser((prev) => ({
                    ...prev,
                    profilePic: data.profilePic,
                    profilePicPublicId: data.profilePicPublicId || "",
                }));
            } else {
                setAvatarError(data?.message || "Failed to set avatar.");
            }
        } catch (error) {
            setAvatarError("Failed to set avatar.");
            console.error("Error setting illustration avatar:", error);
        } finally {
            setUploadingAvatar(false);
        }
    };

    const cropScale = cropState.baseScale * cropState.zoom;

    return (
        <div className="profile-panel">
            <div className="panel-header">
                <button className="back-btn" onClick={onClose}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                </button>
                <h3>Profile</h3>
            </div>

            {/* Avatar */}
            <div className="profile-avatar-large">
                <img
                    src={getAvatarSrc(user)}
                    alt={`${user?.username || "User"} avatar`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                />
            </div>
            <div className="profile-avatar-actions">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: "none" }}
                />
                <button
                    className="btn-primary"
                    onClick={handlePickAvatar}
                    disabled={uploadingAvatar}
                >
                    {uploadingAvatar
                        ? "Uploading..."
                        : user?.profilePic
                            ? "Change Avatar"
                            : "Upload Avatar"}
                </button>
                {user?.profilePic && (
                    <button
                        className="btn-secondary"
                        onClick={handleAvatarRemove}
                        disabled={uploadingAvatar}
                    >
                        Remove
                    </button>
                )}
            </div>
            {avatarError && (
                <p className="profile-avatar-error">{avatarError}</p>
            )}

            <div className="profile-section">
                <label>Avatar Library</label>
                <p style={{ marginBottom: 10, color: "var(--text-secondary)", fontWeight: 400 }}>
                    Pick from male/female illustrations or upload your own.
                </p>
                <div className="avatar-category-tabs">
                    <button
                        className={`btn-secondary ${avatarCategory === "all" ? "active" : ""}`}
                        onClick={() => setAvatarCategory("all")}
                        disabled={uploadingAvatar}
                    >
                        All
                    </button>
                    <button
                        className={`btn-secondary ${avatarCategory === "male" ? "active" : ""}`}
                        onClick={() => setAvatarCategory("male")}
                        disabled={uploadingAvatar}
                    >
                        Male
                    </button>
                    <button
                        className={`btn-secondary ${avatarCategory === "female" ? "active" : ""}`}
                        onClick={() => setAvatarCategory("female")}
                        disabled={uploadingAvatar}
                    >
                        Female
                    </button>
                </div>
                <div className="avatar-library-grid">
                    {getAvatarLibrary(avatarCategory).map((option) => (
                        <button
                            key={option.id}
                            className={`avatar-option ${user?.profilePic === option.url ? "selected" : ""}`}
                            onClick={() => handleChooseIllustration(option.url)}
                            disabled={uploadingAvatar}
                            title={`Use ${option.label} avatar`}
                        >
                            <img
                                src={option.url}
                                alt={`${option.label} avatar ${option.id}`}
                                loading="lazy"
                                referrerPolicy="no-referrer"
                            />
                        </button>
                    ))}
                </div>
            </div>

            {/* Username */}
            <div className="profile-section">
                <label>Your Username</label>
                <p>@{user?.username}</p>
            </div>

            {/* Email */}
            <div className="profile-section">
                <label>Email</label>
                <p>{user?.email}</p>
            </div>

            {/* About */}
            <div className="profile-section">
                <label>About</label>
                {editingAbout ? (
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <input
                            type="text"
                            value={aboutText}
                            onChange={(e) => setAboutText(e.target.value)}
                            maxLength={150}
                            autoFocus
                        />
                        <button className="btn-primary" onClick={handleSaveAbout}>
                            Save
                        </button>
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                setEditingAbout(false);
                                setAboutText(user?.about || "");
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <p
                        onClick={() => setEditingAbout(true)}
                        style={{ cursor: "pointer" }}
                    >
                        {user?.about || "Hey there! I am using Charcha"}{" "}
                        <span style={{ color: "var(--accent-primary)", fontSize: 14 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: "inline", verticalAlign: "middle" }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        </span>
                    </p>
                )}
            </div>

            {/* Logout */}
            <div style={{ padding: "20px 16px" }}>
                <button
                    className="logout-btn"
                    style={{
                        color: "var(--danger)",
                        fontSize: 15,
                        textAlign: "center",
                        justifyContent: "center",
                    }}
                    onClick={logout}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    Log Out
                </button>
            </div>

            {cropState.open && (
                <div className="profile-cropper-overlay">
                    <div className="profile-cropper-modal">
                        <h4>Crop Avatar</h4>
                        <p>Drag image and adjust zoom.</p>
                        <div
                            className="profile-cropper-viewport"
                            onPointerDown={handleCropPointerDown}
                            onPointerMove={handleCropPointerMove}
                            onPointerUp={handleCropPointerUp}
                            onPointerCancel={handleCropPointerUp}
                            onPointerLeave={handleCropPointerUp}
                        >
                            <img
                                src={cropState.src}
                                alt="Avatar crop preview"
                                className="profile-cropper-image"
                                draggable={false}
                                style={{
                                    width: `${cropState.imageWidth}px`,
                                    height: `${cropState.imageHeight}px`,
                                    transform: `translate(calc(-50% + ${cropState.panX}px), calc(-50% + ${cropState.panY}px)) scale(${cropScale})`,
                                }}
                            />
                            <div className="profile-cropper-ring" />
                        </div>

                        <label className="profile-cropper-zoom-label">Zoom</label>
                        <input
                            className="profile-cropper-zoom"
                            type="range"
                            min="1"
                            max="3"
                            step="0.01"
                            value={cropState.zoom}
                            onChange={(e) =>
                                updateCropState((prev) => ({
                                    ...prev,
                                    zoom: Number(e.target.value),
                                }))
                            }
                        />

                        <div className="profile-cropper-actions">
                            <button
                                className="btn-secondary"
                                onClick={closeCropModal}
                                disabled={uploadingAvatar}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleCropSave}
                                disabled={uploadingAvatar}
                            >
                                {uploadingAvatar ? "Saving..." : "Save Avatar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
