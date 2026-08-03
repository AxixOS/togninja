import { useEffect, useState, useRef } from "react";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Input } from "./input";
import { Label } from "./label";
import { SITE } from "../../config/site";

interface EmailComposerProps {
  recipient: string;
  subject?: string;
  onSend: (email: { to: string; subject: string; body: string }) => void;
  onCancel?: () => void;
}

export function EmailComposer({ recipient, subject = "", onSend, onCancel }: EmailComposerProps) {
  const [emailSubject, setEmailSubject] = useState(subject);
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Auto-save key based on recipient
  const draftKey = `email_draft_${recipient.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(draftKey);
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setEmailSubject(draft.subject || subject);
        setEmailBody(draft.body || "");
      } catch (error) {
        // If parsing fails, just use the raw value as body
        setEmailBody(savedDraft);
      }
    }
  }, [draftKey, subject]);

  // Auto-save draft every 1.5 seconds
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (emailBody.trim() || emailSubject.trim()) {
        localStorage.setItem(draftKey, JSON.stringify({
          subject: emailSubject,
          body: emailBody,
          timestamp: new Date().toISOString()
        }));
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [emailBody, emailSubject, draftKey]);

  // Keep alive ping DISABLED - not needed for local/production servers
  // Originally for Replit hosting which would sleep idle instances
  // useEffect(() => {
  //   const keepAlive = setInterval(() => {
  //     fetch('/api/health').catch(() => {}); // Silent ping
  //   }, 240000); // 4 minutes
  //   return () => clearInterval(keepAlive);
  // }, []);

  const handleSend = async () => {
    if (!emailBody.trim()) return;
    
    setIsSending(true);
    try {
      await onSend({
        to: recipient,
        subject: emailSubject || `Message from ${SITE.name}`,
        body: emailBody
      });
      
      // Clear draft after successful send
      localStorage.removeItem(draftKey);
      setEmailSubject("");
      setEmailBody("");
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleCancel = () => {
    // Keep draft when canceling
    if (onCancel) onCancel();
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compose Email</h3>
        <div className="text-sm text-gray-500">
          Auto-saving draft...
        </div>
      </div>
      
      <div>
        <Label htmlFor="to">To:</Label>
        <Input id="to" value={recipient} disabled className="bg-gray-50" />
      </div>
      
      <div>
        <Label htmlFor="subject">Subject:</Label>
        <Input 
          id="subject"
          value={emailSubject}
          onChange={(e) => setEmailSubject(e.target.value)}
          placeholder="Email subject..."
        />
      </div>
      
      <div>
        <Label htmlFor="body">Message:</Label>
        <Textarea
          id="body"
          value={emailBody}
          onChange={(e) => setEmailBody(e.target.value)}
          rows={12}
          placeholder="Type your email message..."
          className="min-h-[200px]"
        />
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSend} 
          disabled={!emailBody.trim() || isSending}
        >
          {isSending ? "Sending..." : "Send Email"}
        </Button>
      </div>
    </div>
  );
}