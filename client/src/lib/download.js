"use client";

/**
 * Downloads media from a URL.
 * If it's a Cloudinary URL, it tries to use the fl_attachment flag for direct download.
 * Otherwise, it fetches the resource as a blob to bypass cross-origin restrictions on the download attribute.
 * 
 * @param {string} url - The URL of the media to download
 * @param {string} filename - The desired filename for the download
 */
export const downloadMedia = async (url, filename) => {
    if (!url) return;

    try {
        let downloadUrl = url;

        // If it's a Cloudinary URL, we can use the fl_attachment flag
        if (url.includes("cloudinary.com")) {
            // Add fl_attachment after /upload/ or /video/upload/
            if (url.includes("/upload/")) {
                downloadUrl = url.replace("/upload/", "/upload/fl_attachment/");
            }
        }

        // Create a temporary link and trigger download
        // We still use the blob fetch for non-Cloudinary or as a fallback 
        // because "download" attribute only works for same-origin or with correct CORS headers

        const response = await fetch(url, {
            mode: 'cors',
            credentials: 'omit'
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;

        // Try to get extension from URL or blob type
        const extension = url.split('.').pop().split(/[?#]/)[0] || (blob.type.split('/')[1]) || 'file';
        link.download = filename || `charcha_media_${Date.now()}.${extension}`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Small delay before revoking to ensure download starts
        setTimeout(() => {
            window.URL.revokeObjectURL(blobUrl);
        }, 100);

    } catch (error) {
        console.error("Error downloading media:", error);

        // Fallback: try opening in new tab if blob fetch fails
        window.open(url, '_blank');
    }
};
