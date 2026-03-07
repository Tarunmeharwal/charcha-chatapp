const Status = require("../models/Status");
const User = require("../models/User");

// @desc    Create a status
// @route   POST /api/status
const createStatus = async (req, res) => {
    try {
        const { content, type, backgroundColor, mediaUrl } = req.body;

        const status = await Status.create({
            user: req.user._id,
            content: content || "",
            type: type || "text",
            backgroundColor: backgroundColor || "#075E54",
            mediaUrl: mediaUrl || "",
        });

        const populatedStatus = await status.populate(
            "user",
            "username profilePic"
        );
        await populatedStatus.populate("viewedBy", "username profilePic");

        res.status(201).json(populatedStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get statuses from friends
// @route   GET /api/status
const getStatuses = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        const friendIds = [...user.friends, req.user._id];

        const statuses = await Status.find({
            user: { $in: friendIds },
            expiresAt: { $gt: new Date() },
        })
            .populate("user", "username profilePic")
            .sort({ createdAt: -1 });

        // Group statuses by user
        const groupedStatuses = {};
        statuses.forEach((status) => {
            const userId = status.user._id.toString();
            if (!groupedStatuses[userId]) {
                groupedStatuses[userId] = {
                    user: status.user,
                    statuses: [],
                };
            }
            groupedStatuses[userId].statuses.push(status);
        });

        res.json(Object.values(groupedStatuses));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    View a status (mark as viewed)
// @route   PUT /api/status/view/:statusId
const viewStatus = async (req, res) => {
    try {
        const status = await Status.findById(req.params.statusId);

        if (!status) {
            return res.status(404).json({ message: "Status not found" });
        }

        const alreadyViewed = status.viewedBy.some(
            (viewerId) => viewerId.toString() === req.user._id.toString()
        );
        if (!alreadyViewed && status.user.toString() !== req.user._id.toString()) {
            status.viewedBy.push(req.user._id);
            await status.save();
        }

        const populatedStatus = await Status.findById(status._id)
            .populate("user", "username profilePic")
            .populate("viewedBy", "username profilePic");

        res.json(populatedStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my statuses
// @route   GET /api/status/me
const getMyStatuses = async (req, res) => {
    try {
        const statuses = await Status.find({
            user: req.user._id,
            expiresAt: { $gt: new Date() },
        })
            .populate("viewedBy", "username profilePic")
            .sort({ createdAt: -1 });

        res.json(statuses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete my status
// @route   DELETE /api/status/:statusId
const deleteStatus = async (req, res) => {
    try {
        const status = await Status.findById(req.params.statusId);

        if (!status) {
            return res.status(404).json({ message: "Status not found" });
        }

        if (status.user.toString() !== req.user._id.toString()) {
            return res
                .status(403)
                .json({ message: "Only owner can delete this status" });
        }

        await status.deleteOne();
        res.json({ message: "Status deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create a media status (image/video)
// @route   POST /api/status/media
const createMediaStatus = async (req, res) => {
    try {
        const { isCloudinaryConfigured, uploadStatusMedia } = require("../utils/cloudinary");

        if (!isCloudinaryConfigured()) {
            return res.status(400).json({ message: "Cloudinary not configured" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No media file provided" });
        }

        const isVideo = req.file.mimetype.startsWith("video/");
        const resourceType = isVideo ? "video" : "image";
        const statusType = isVideo ? "video" : "image";

        const result = await uploadStatusMedia(
            req.file.buffer,
            req.user._id,
            resourceType
        );

        const status = await Status.create({
            user: req.user._id,
            content: req.body.caption || "",
            type: statusType,
            mediaUrl: result.secure_url,
            backgroundColor: "#000000",
        });

        const populatedStatus = await status.populate(
            "user",
            "username profilePic"
        );
        await populatedStatus.populate("viewedBy", "username profilePic");

        res.status(201).json(populatedStatus);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createStatus,
    getStatuses,
    viewStatus,
    getMyStatuses,
    deleteStatus,
    createMediaStatus,
};
