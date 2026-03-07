const express = require("express");
const multer = require("multer");
const {
    createStatus,
    getStatuses,
    viewStatus,
    getMyStatuses,
    deleteStatus,
    createMediaStatus,
} = require("../controllers/statusController");
const { protect } = require("../middleware/auth");

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max for videos
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image and video files are allowed"), false);
        }
    },
});

router.post("/", protect, createStatus);
router.post("/media", protect, upload.single("media"), createMediaStatus);
router.get("/", protect, getStatuses);
router.get("/me", protect, getMyStatuses);
router.put("/view/:statusId", protect, viewStatus);
router.delete("/:statusId", protect, deleteStatus);

module.exports = router;
