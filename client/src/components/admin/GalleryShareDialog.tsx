// Share a gallery: copy the link, download a QR code, or send it by email.
//
// The share UI used to exist in exactly one place — inside the create/edit wizard, opening
// only as a side effect of pressing "Share Gallery" on the LAST step. To re-send a link to
// a client, a studio had to reopen the wizard, click through every step and re-save the
// gallery. Closing the modal navigated away, so it could not be reopened without another
// full save. There was no share action on the gallery list at all.
//
// This is the same job as a standalone dialog, so it can hang off a row menu.
import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Link as LinkIcon, QrCode, Mail, X, CheckCircle, Download, AlertCircle } from 'lucide-react';
import { galleryPublicUrl } from '../../lib/galleryUrl';
import { sendGalleryEmail } from '../../lib/gallery-api';

interface Props {
  gallery: { id: string; title: string; slug?: string };
  onClose: () => void;
}

const GalleryShareDialog: React.FC<Props> = ({ gallery, onClose }) => {
  const url = galleryPublicUrl(gallery.slug, { absolute: true });

  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    // Rendered locally rather than through a QR web service: a gallery URL is a
    // capability, and posting it to a third party to have it drawn would hand that
    // capability away.
    QRCode.toDataURL(url, { width: 512, margin: 2 })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused outside a secure context. Swallowing that would
      // leave the studio believing they had copied a link they had not.
      window.prompt('Copy the gallery link:', url);
    }
  };

  const downloadQr = () => {
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = `${(gallery.slug || 'gallery')}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const send = async () => {
    if (!email.trim()) { setError('Enter an email address.'); return; }
    setSending(true);
    setError(null);
    setSent(null);
    try {
      await sendGalleryEmail({
        galleryId: gallery.id,
        slug: gallery.slug,
        to: email.trim(),
        message: message.trim() || undefined,
        galleryUrl: url || undefined,
      });
      setSent(`Sent to ${email.trim()}.`);
      setEmail('');
      setMessage('');
    } catch (err) {
      // The route now reports honestly when SMTP is not configured, so this message is
      // worth showing verbatim rather than replacing with a generic failure.
      setError((err as Error).message || 'Could not send the email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Share gallery</h2>
            <p className="text-sm text-gray-500 truncate">{gallery.title}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!url ? (
          <div className="p-6 flex items-start gap-3 text-amber-800 bg-amber-50">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <p className="text-sm">This gallery has no public address yet. Save it first.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                <LinkIcon className="w-4 h-4" /> Link
              </div>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700"
                />
                <button
                  onClick={copy}
                  className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    copied ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                >
                  {copied ? <><CheckCircle className="w-4 h-4 inline mr-1" />Copied</> : 'Copy'}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                <QrCode className="w-4 h-4" /> QR code
              </div>
              {qr ? (
                <div className="flex items-center gap-4">
                  <img src={qr} alt="Gallery QR code" className="w-32 h-32 border border-gray-200 rounded-lg" />
                  <button
                    onClick={downloadQr}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700"
                  >
                    <Download className="w-4 h-4" /> Download PNG
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Generating…</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                <Mail className="w-4 h-4" /> Email it
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note (optional)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
              />
              <button
                onClick={send}
                disabled={sending}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium"
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
              {sent && <p className="mt-2 text-sm text-green-700">{sent}</p>}
              {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GalleryShareDialog;
