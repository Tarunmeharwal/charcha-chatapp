const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/encryption");


const messageSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            trim: true,
            required: false, // Changed from true to allow unsent messages to clear content
        },
        chat: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Chat",
            required: true,
        },
        replyTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
            default: null,
        },
        readBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        deletedBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        messageType: {
            type: String,
            enum: ["text", "image", "video", "file"],
            default: "text",
        },
        reactions: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                emoji: {
                    type: String,
                    required: true,
                    trim: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        isUnsent: {
            type: Boolean,
            default: false,
        },
        unsentAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Encrypt message content before saving
messageSchema.pre("save", async function (next) {
    if (!this.isModified("content")) return next();
    this.content = encrypt(this.content);
    next();
});

// Decrypt message content after saving (so the creator sees the plain text)
messageSchema.post("save", function (doc) {
    if (doc.content) {
        doc.content = decrypt(doc.content);
    }
});

// Decrypt message content when viewing/loading from DB
messageSchema.post("init", function (doc) {
    if (doc.content) {
        doc.content = decrypt(doc.content);
    }
});

module.exports = mongoose.model("Message", messageSchema);
