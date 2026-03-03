const express = require("express");
const {
    createStatus,
    getStatuses,
    viewStatus,
    getMyStatuses,
    deleteStatus,
} = require("../controllers/statusController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.post("/", protect, createStatus);
router.get("/", protect, getStatuses);
router.get("/me", protect, getMyStatuses);
router.put("/view/:statusId", protect, viewStatus);
router.delete("/:statusId", protect, deleteStatus);

module.exports = router;
