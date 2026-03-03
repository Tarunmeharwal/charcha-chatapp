const User = require("../models/User");
const {
    isCloudinaryConfigured,
    buildOptimizedCloudinaryUrl,
    uploadAvatarToCloudinary,
    deleteFromCloudinary,
} = require("../utils/cloudinary");

// @desc    Search users by username
// @route   GET /api/users/search?q=query
const searchUsers = async (req, res) => {
    try {
        const keyword = req.query.q
            ? {
                $or: [
                    { username: { $regex: req.query.q, $options: "i" } },
                    { email: { $regex: req.query.q, $options: "i" } },
                ],
                _id: { $ne: req.user._id },
            }
            : { _id: { $ne: req.user._id } };

        const users = await User.find(keyword)
            .select("username email profilePic about isOnline lastSeen")
            .limit(20);

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Send friend request
// @route   POST /api/users/friend-request/:userId
const sendFriendRequest = async (req, res) => {
    try {
        const targetUser = await User.findById(req.params.userId);
        if (!targetUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if already friends
        if (req.user.friends.includes(req.params.userId)) {
            return res.status(400).json({ message: "Already friends" });
        }

        // Check if request already sent
        const existingRequest = targetUser.friendRequests.find(
            (r) => r.from.toString() === req.user._id.toString() && r.status === "pending"
        );
        if (existingRequest) {
            return res.status(400).json({ message: "Request already sent" });
        }

        targetUser.friendRequests.push({ from: req.user._id });
        await targetUser.save();

        res.json({ message: "Friend request sent" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Accept/Reject friend request
// @route   PUT /api/users/friend-request/:requestId
const respondFriendRequest = async (req, res) => {
    try {
        const { action } = req.body; // "accepted" or "rejected"
        const user = await User.findById(req.user._id);

        const request = user.friendRequests.id(req.params.requestId);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (action === "accepted") {
            // Add each other as friends
            user.friends.push(request.from);
            await User.findByIdAndUpdate(request.from, {
                $push: { friends: user._id },
            });
            request.status = "accepted";
        } else {
            request.status = "rejected";
        }

        await user.save();
        res.json({ message: `Friend request ${action}` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get friend requests
// @route   GET /api/users/friend-requests
const getFriendRequests = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate(
            "friendRequests.from",
            "username profilePic about"
        );

        const pendingRequests = user.friendRequests.filter(
            (r) => r.status === "pending"
        );

        res.json(pendingRequests);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all friends
// @route   GET /api/users/friends
const getFriends = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate(
            "friends",
            "username profilePic about isOnline lastSeen"
        );
        res.json(user.friends);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update profile
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
    try {
        const { about, profilePic } = req.body;
        const user = await User.findById(req.user._id);

        if (about !== undefined) user.about = about;
        if (profilePic !== undefined) {
            const isChangingPicture = profilePic !== user.profilePic;
            if (isChangingPicture && user.profilePicPublicId && isCloudinaryConfigured()) {
                try {
                    await deleteFromCloudinary(user.profilePicPublicId);
                } catch (cloudinaryError) {
                    console.error(
                        "Failed to delete previous Cloudinary avatar:",
                        cloudinaryError.message
                    );
                }
                user.profilePicPublicId = "";
            }
            user.profilePic = profilePic;
        }

        await user.save();
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            profilePicPublicId: user.profilePicPublicId,
            about: user.about,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Upload or replace profile avatar
// @route   POST /api/users/profile/avatar
const uploadProfileAvatar = async (req, res) => {
    try {
        if (!isCloudinaryConfigured()) {
            return res.status(500).json({
                message:
                    "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
            });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Please upload an image file" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const uploadResult = await uploadAvatarToCloudinary(
            req.file.buffer,
            user._id.toString()
        );

        user.profilePicPublicId = uploadResult.public_id;
        user.profilePic = buildOptimizedCloudinaryUrl(uploadResult.public_id, 320);
        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            profilePicPublicId: user.profilePicPublicId,
            about: user.about,
        });
    } catch (error) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res
                .status(400)
                .json({ message: "Image is too large. Max size is 5MB." });
        }
        res.status(500).json({ message: error.message });
    }
};

// @desc    Remove profile avatar
// @route   DELETE /api/users/profile/avatar
const deleteProfileAvatar = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (isCloudinaryConfigured() && user.profilePicPublicId) {
            await deleteFromCloudinary(user.profilePicPublicId);
        }

        user.profilePic = "";
        user.profilePicPublicId = "";
        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            profilePicPublicId: user.profilePicPublicId,
            about: user.about,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    searchUsers,
    sendFriendRequest,
    respondFriendRequest,
    getFriendRequests,
    getFriends,
    updateProfile,
    uploadProfileAvatar,
    deleteProfileAvatar,
};
