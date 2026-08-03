export interface Message {
  id: string;
  from_email: string;
  to_email: string;
  subject: string | null;
  body: string | null;
  thread_id: string | null;
  created_at: string;
}

export interface EmailSettings {
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  fromEmail: string;
  fromName: string;
  // Email Signature
  emailSignature?: string;
  signatureEnabled?: boolean;
  // Out of Office
  outOfOfficeEnabled?: boolean;
  outOfOfficeMessage?: string;
  outOfOfficeStartDate?: string;
  outOfOfficeEndDate?: string;
}

export async function fetchMessages(): Promise<Message[]> {
  const response = await fetch('/api/messages', {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch messages');
  }

  const result = await response.json();
  return result.messages;
}

export async function sendMessage(payload: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  const result = await response.json();
  return result.message;
}

export async function saveEmailSettings(settings: EmailSettings) {
  const response = await fetch('/api/email/settings/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save email settings');
  }

  return response.json();
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const response = await fetch('/api/email/settings', {
    method: 'GET',
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get email settings');
  }

  const result = await response.json();
  return {
    smtpHost: result.settings.smtp_host,
    smtpPort: result.settings.smtp_port.toString(),
    smtpUser: result.settings.smtp_user,
    smtpPass: result.settings.smtp_pass,
    fromEmail: result.settings.from_email,
    fromName: result.settings.from_name,
    // Email Signature
    emailSignature: result.settings.email_signature || '',
    signatureEnabled: result.settings.signature_enabled || false,
    // Out of Office
    outOfOfficeEnabled: result.settings.out_of_office_enabled || false,
    outOfOfficeMessage: result.settings.out_of_office_message || '',
    outOfOfficeStartDate: result.settings.out_of_office_start_date || '',
    outOfOfficeEndDate: result.settings.out_of_office_end_date || ''
  };
}
