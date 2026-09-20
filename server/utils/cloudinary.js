const cloudinary = require("cloudinary").v2;

const isCloudinaryConfigured = () => {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
};

if (isCloudinaryConfigured()) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
    });
}

const buildOptimizedCloudinaryUrl = (publicId, width = 320) => {
    return cloudinary.url(publicId, {
        secure: true,
        transformation: [
            {
                width,
                height: width,
                crop: "fill",
                gravity: "face:auto",
                quality: "auto:eco",
                fetch_format: "auto",
            },
        ],
    });
};

const uploadAvatarToCloudinary = (fileBuffer, userId) => {
    const publicId = `charcha/avatars/user_${userId}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: publicId,
                overwrite: true,
                invalidate: true,
                resource_type: "image",
                transformation: [
                    {
                        width: 1024,
                        height: 1024,
                        crop: "limit",
                        quality: "auto:eco",
                        fetch_format: "auto",
                    },
                ],
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }
                return resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });
};

const deleteFromCloudinary = async (publicId, type = "image") => {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
        resource_type: type,
        invalidate: true,
    });
};

const deleteStatusMediaFromCloudinary = async (mediaUrl, type) => {
    if (!mediaUrl) return;
    try {
        const parts = mediaUrl.split("/");
        const filename = parts[parts.length - 1];
        const publicId = `charcha/status/${filename.split(".")[0]}`;
        const resourceType = type === "video" ? "video" : "image";
        
        await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
        });
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
    }
};

const uploadStatusMedia = (fileBuffer, userId, resourceType = "image") => {
    const publicId = `charcha/status/${userId}_${Date.now()}`;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: publicId,
                resource_type: resourceType,
                transformation: resourceType === "image" ? [
                    {
                        width: 1080,
                        height: 1920,
                        crop: "limit",
                        quality: "auto:eco",
                        fetch_format: "auto",
                    },
                ] : undefined,
            },
            (error, result) => {
                if (error) return reject(error);
                return resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });
};

const uploadMessageMedia = (fileBuffer, userId, resourceType = "image") => {
    const publicId = `charcha/messages/${userId}_${Date.now()}`;

    return new Promise((resolve, reject) => {
        const imageTransformation = [
            {
                width: 1280,
                height: 1280,
                crop: "limit",
                quality: "auto:eco", // Eco quality for high compression
                fetch_format: "auto",
            },
        ];

        const videoTransformation = [
            {
                width: 720, // Downscale to 720p
                crop: "limit",
                quality: "auto:eco", // Auto compression
                fetch_format: "mp4",
            },
        ];

        const uploadStream = cloudinary.uploader.upload_stream(
            {
                public_id: publicId,
                resource_type: resourceType,
                transformation: resourceType === "image" ? imageTransformation : videoTransformation,
            },
            (error, result) => {
                if (error) return reject(error);
                return resolve(result);
            }
        );

        uploadStream.end(fileBuffer);
    });
};

module.exports = {
    cloudinary,
    isCloudinaryConfigured,
    buildOptimizedCloudinaryUrl,
    uploadAvatarToCloudinary,
    deleteFromCloudinary,
    deleteStatusMediaFromCloudinary,
    uploadStatusMedia,
    uploadMessageMedia,
};
