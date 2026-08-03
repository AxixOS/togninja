"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const postmark_1 = __importDefault(require("postmark"));
let pm = null;
if (process.env.POSTMARK_TOKEN) {
    pm = new postmark_1.default.ServerClient(process.env.POSTMARK_TOKEN);
}
const sendEmail = async ({ to, subject, html }) => {
    if (!pm) {
        console.warn("Postmark not configured - email not sent:", { to, subject });
        return;
    }
    await pm.sendEmail({
        From: process.env.STUDIO_DEFAULT_EMAIL_FROM || "noreply@example.com",
        To: to,
        Subject: subject,
        HtmlBody: html
    });
};
exports.sendEmail = sendEmail;
