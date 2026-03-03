const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            default: "",
        },
        mediaUrl: {
            type: String,
            default: "",
        },
        type: {
            type: String,
            enum: ["text", "image"],
            default: "text",
        },
        backgroundColor: {
            type: String,
            default: "#075E54",
        },
        viewedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            index: { expires: 0 },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Status", statusSchema);
