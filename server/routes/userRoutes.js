const express = require("express");
const {
    searchUsers,
    sendFriendRequest,
    respondFriendRequest,
    getFriendRequests,
    getFriends,
    updateProfile,
    uploadProfileAvatar,
    deleteProfileAvatar,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { uploadAvatar } = require("../middleware/avatarUpload");

const router = express.Router();

router.get("/search", protect, searchUsers);
router.get("/friends", protect, getFriends);
router.get("/friend-requests", protect, getFriendRequests);
router.post("/friend-request/:userId", protect, sendFriendRequest);
router.put("/friend-request/:requestId", protect, respondFriendRequest);
router.put("/profile", protect, updateProfile);
router.post(
    "/profile/avatar",
    protect,
    uploadAvatar.single("avatar"),
    uploadProfileAvatar
);
router.delete("/profile/avatar", protect, deleteProfileAvatar);

module.exports = router;
