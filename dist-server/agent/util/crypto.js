"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.AGENT_CRYPTO_SECRET || 'default-secret-key-change-in-production';
function encrypt(text) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipher(ALGORITHM, SECRET_KEY);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Simple format: iv:encrypted
    return iv.toString('hex') + ':' + encrypted;
}
function decrypt(encryptedData) {
    if (!encryptedData)
        return '';
    const parts = encryptedData.split(':');
    if (parts.length !== 2)
        return encryptedData; // Return as-is if not encrypted
    try {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto_1.default.createDecipher(ALGORITHM, SECRET_KEY);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    catch (error) {
        // If decryption fails, return original (might be plain text)
        return encryptedData;
    }
}
