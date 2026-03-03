const crypto = require("crypto");

const ALGORITHM = "aes-256-ctr";
// Ensures a fixed length key from the .env secret
const SECRET_KEY = crypto
    .createHash("sha256")
    .update(process.env.ENCRYPTION_KEY || "charcha_backup_key_32chars_long")
    .digest();

const encrypt = (text) => {
    if (!text) return text;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
};

const decrypt = (hash) => {
    if (!hash || !hash.includes(":")) return hash;

    try {
        const [iv, content] = hash.split(":");
        const decipher = crypto.createDecipheriv(
            ALGORITHM,
            SECRET_KEY,
            Buffer.from(iv, "hex")
        );
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(content, "hex")),
            decipher.final(),
        ]);

        return decrypted.toString();
    } catch (err) {
        console.error("Decryption failed:", err.message);
        return "[Encrypted Message]";
    }
};

module.exports = { encrypt, decrypt };
