const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc    Get current user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select("-password")
            .populate("friends", "username profilePic about isOnline lastSeen");
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
const logout = async (req, res) => {
    try {
        if (req.user) {
            const user = await User.findById(req.user._id);
            if (user) {
                user.isOnline = false;
                await user.save();
            }
        }
        res.cookie("charcha_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            expires: new Date(0),
        });
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Check if username is available
// @route   GET /api/auth/check-username/:username
const checkUsername = async (req, res) => {
    try {
        const username = req.params.username.toLowerCase();
        const user = await User.findOne({ username });
        if (user) {
            return res.status(200).json({ available: false, message: "Username already taken" });
        }
        res.status(200).json({ available: true, message: "Username is available" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Google Login
// @route   POST /api/auth/google
const googleLogin = async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token) {
            return res.status(400).json({ message: "Google access_token is required" });
        }

        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        if (!response.ok) {
            return res.status(400).json({ message: "Invalid Google access token" });
        }

        const payload = await response.json();
        const { sub: googleId, email, name, picture } = payload;

        let user = await User.findOne({ email: email.toLowerCase() });

        if (user) {
            // User exists, log them in
            user.isOnline = true;
            if (!user.googleId) {
                user.googleId = googleId;
                user.authProvider = 'google';
            }
            await user.save();
        } else {
            // Generate a unique username
            let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter}`;
                counter++;
            }

            user = await User.create({
                username,
                email: email.toLowerCase(),
                profilePic: picture,
                authProvider: 'google',
                googleId,
            });
        }

        const token = generateToken(user._id);

        res.cookie("charcha_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });

        res.status(200).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            profilePic: user.profilePic,
            profilePicPublicId: user.profilePicPublicId,
            about: user.about,
            token,
        });
    } catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({ message: "Google authentication failed" });
    }
};

module.exports = { getMe, logout, checkUsername, googleLogin };
