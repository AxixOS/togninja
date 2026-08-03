import postmark from "postmark";

let pm: postmark.ServerClient | null = null;

if (process.env.POSTMARK_TOKEN) {
  pm = new postmark.ServerClient(process.env.POSTMARK_TOKEN);
}

export const sendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }) => {
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