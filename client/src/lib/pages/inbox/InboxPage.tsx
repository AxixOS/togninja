import React, { useEffect, useState, useRef } from 'react';
import { fetchMessages, sendMessage } from '../../lib/email';
import { listAttachments, uploadAttachment } from '../../lib/attachments';
import { marked } from 'marked';

interface Attachment {
  name: string;
  url: string;
  mime: string;
}

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments?: Attachment[];
  created_at: string;
}

const InboxPage: React.FC = () => {
  const [threads, setThreads] = useState<Message[][]>([]);
  const [activeThread, setActiveThread] = useState<Message[] | null>(null);
  const [reply, setReply] = useState('');
  const [uploading, setUploading] = useState(false);
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
    const id = setInterval(loadMessages, 30000); // 30‑sec polling
    return () => clearInterval(id);
  }, []);

  const loadMessages = async () => {
    const msgs = await fetchMessages();
    const grouped: Record<string, Message[]> = {};
    msgs.forEach((m: Message) => {
      const key = m.subject + m.from + m.to;
      grouped[key] = grouped[key] ? [...grouped[key], m] : [m];
    });
    setThreads(Object.values(grouped));
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    setUploading(true);
    const uploaded: Attachment[] = [];
    for (const file of files) {
      const a = await uploadAttachment(file);
      uploaded.push(a);
    }
    setReplyAttachments([...replyAttachments, ...uploaded]);
    setUploading(false);
  };

  const handleSend = async () => {
    await sendMessage({
      to: activeThread?.[0].from || '',
      subject: 'Re: ' + (activeThread?.[0].subject || ''),
      body: reply,
      attachments: replyAttachments,
    });
    setReply('');
    setReplyAttachments([]);
    loadMessages();
  };

  return (
    <div className="inbox-page">
      <aside className="thread-list">
        {threads.map((t, idx) => (
          <div
            key={idx}
            className={`thread-item ${activeThread === t ? 'active' : ''}`}
            onClick={() => setActiveThread(t)}
          >
            <strong>{t[0].subject}</strong>
            <span>{t.length} msg</span>
          </div>
        ))}
      </aside>
      <main className="thread-view">
        {activeThread ? (
          <>
            <div className="messages">
              {activeThread.map((m) => (
                <div key={m.id} className="message">
                  <div
                    className="body"
                    dangerouslySetInnerHTML={{ __html: marked.parse(m.body) }}
                  />
                  {m.attachments?.length && (
                    <div className="attachments">
                      {m.attachments.map((a) => (
                        <div key={a.url} className="attachment">
                          {a.mime.startsWith('image/') ? (
                            <img src={a.url} alt={a.name} />
                          ) : (
                            <a href={a.url} target="_blank" rel="noreferrer">
                              {a.name}
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div
              className="reply-box"
              ref={dropRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
              />
              {replyAttachments.length > 0 && (
                <div className="reply-attachments">
                  {replyAttachments.map((a) => (
                    <span key={a.url}>{a.name}</span>
                  ))}
                </div>
              )}
              <button disabled={uploading} onClick={handleSend}>
                {uploading ? 'Uploading…' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          <p>Select a thread to view messages.</p>
        )}
      </main>
      <style jsx>{`
        .inbox-page {
          display: flex;
          height: 100%;
        }
        .thread-list {
          width: 240px;
          border-right: 1px solid #e5e5e5;
          overflow-y: auto;
        }
        .thread-item {
          padding: 8px 12px;
          cursor: pointer;
        }
        .thread-item.active {
          background: #f0f0f0;
        }
        .thread-view {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }
        .message {
          margin-bottom: 24px;
        }
        .attachments img {
          max-width: 160px;
          margin-right: 8px;
          border-radius: 4px;
        }
        .reply-box {
          border-top: 1px solid #e5e5e5;
          padding: 12px;
        }
        textarea {
          width: 100%;
          min-height: 80px;
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
};

export default InboxPage;
