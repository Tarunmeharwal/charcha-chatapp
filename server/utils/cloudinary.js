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

const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        invalidate: true,
    });
};

module.exports = {
    cloudinary,
    isCloudinaryConfigured,
    buildOptimizedCloudinaryUrl,
    uploadAvatarToCloudinary,
    deleteFromCloudinary,
};
