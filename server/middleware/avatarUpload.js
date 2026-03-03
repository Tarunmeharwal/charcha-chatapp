const multer = require("multer");

const uploadAvatar = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype && file.mimetype.startsWith("image/")) {
            return cb(null, true);
        }
        return cb(new Error("Only image files are allowed"));
    },
});

module.exports = { uploadAvatar };
