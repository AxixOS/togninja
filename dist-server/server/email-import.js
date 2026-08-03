"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importEmailsFromIMAP = importEmailsFromIMAP;
async function importEmailsFromIMAP(config) {
    const imap = (await import('imap')).default;
    const { simpleParser } = await import('mailparser');
    return new Promise((resolve, reject) => {
        const collectedEmails = [];
        console.log('Connecting to IMAP server...');
        const connection = new imap(config);
        let newEmails = 0;
        let totalEmails = 0;
        let processedEmails = 0;
        connection.once('ready', () => {
            console.log('IMAP connection ready');
            connection.openBox('INBOX', true, (err, box) => {
                if (err) {
                    console.error('Failed to open inbox:', err);
                    return reject(err);
                }
                console.log(`INBOX opened - ${box.messages.total} total messages`);
                totalEmails = box.messages.total;
                if (box.messages.total === 0) {
                    connection.end();
                    return resolve({ newEmails: 0, totalEmails: 0, processedEmails: 0 });
                }
                // Determine fetch strategy based on since parameter
                let fetchCriteria;
                if (config.since) {
                    // Fetch emails since last import date
                    const sinceDate = new Date(config.since);
                    fetchCriteria = ['SINCE', sinceDate];
                    console.log(`Fetching emails since ${sinceDate.toISOString()}`);
                }
                else {
                    // Fetch recent emails (last 10 only for live updates)
                    const recent = Math.max(1, box.messages.total - 9);
                    fetchCriteria = `${recent}:${box.messages.total}`;
                    console.log(`Fetching recent emails ${fetchCriteria}`);
                }
                const fetch = connection.fetch(fetchCriteria, {
                    bodies: '',
                    struct: true,
                    markSeen: false
                });
                const emailPromises = [];
                fetch.on('message', (msg, seqno) => {
                    const emailPromise = new Promise((emailResolve) => {
                        let buffer = '';
                        msg.on('body', (stream, info) => {
                            stream.on('data', (chunk) => {
                                buffer += chunk.toString('utf8');
                            });
                            stream.once('end', async () => {
                                try {
                                    const parsed = await simpleParser(buffer);
                                    // Return email data for processing in routes (no direct storage here)
                                    const emailData = {
                                        fromName: parsed.from?.text?.split('<')[0]?.trim() || 'Unknown',
                                        from: parsed.from?.value[0]?.address || parsed.from?.text || 'unknown@unknown.com',
                                        subject: parsed.subject || 'No Subject',
                                        body: parsed.text || parsed.html || 'No content',
                                        date: parsed.date || new Date(),
                                        isRead: false
                                    };
                                    // Skip sent items and system messages
                                    if (!emailData.subject.startsWith('[SENT]') &&
                                        !emailData.subject.includes('Auto-Reply') &&
                                        emailData.from !== (process.env.STUDIO_NOTIFY_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER)) {
                                        collectedEmails.push(emailData);
                                        newEmails++;
                                    }
                                    processedEmails++;
                                    emailResolve();
                                }
                                catch (error) {
                                    console.error('Error processing email:', error);
                                    emailResolve();
                                }
                            });
                        });
                        msg.once('attributes', (attrs) => {
                            // Can process email attributes if needed
                        });
                    });
                    emailPromises.push(emailPromise);
                });
                fetch.once('error', (err) => {
                    console.error('Fetch error:', err);
                    reject(err);
                });
                fetch.once('end', async () => {
                    console.log('Fetch completed, processing emails...');
                    try {
                        await Promise.all(emailPromises);
                        connection.end();
                        console.log(`Email import completed: ${newEmails} new emails, ${processedEmails} processed, ${totalEmails} total`);
                        resolve(collectedEmails);
                    }
                    catch (error) {
                        console.error('Error processing emails:', error);
                        connection.end();
                        reject(error);
                    }
                });
            });
        });
        connection.once('error', (err) => {
            console.error('IMAP connection error:', err);
            reject(err);
        });
        connection.once('end', () => {
            console.log('IMAP connection ended');
        });
        connection.connect();
    });
}
