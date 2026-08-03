import { trackLead } from './tracking';

interface ContactFormData {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

interface WaitlistFormData extends ContactFormData {
  preferredDate: string;
}

export async function submitContactForm(formData: ContactFormData & { sourcePath?: string }) {
  try {
    // Use the local backend API endpoint
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        sourcePath: formData.sourcePath || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || 'Failed to submit contact form');
    }

    trackLead('contact_form');
    return await response.json();
  } catch (error) {
    console.error('Contact form submission error:', error);
    throw new Error('Failed to submit contact form. Please try again later.');
  }
}

export async function submitWaitlistForm(formData: WaitlistFormData & { sourcePath?: string }) {
  try {
    // Use the waitlist/appointment request endpoint
    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...formData,
        sourcePath: formData.sourcePath || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || 'Failed to submit appointment request');
    }

    trackLead('waitlist_appointment');
    return await response.json();
  } catch (error) {
    console.error('Waitlist form submission error:', error);
    throw new Error('Failed to submit appointment request. Please try again later.');
  }
}

export async function submitNewsletterForm(email: string, opts?: { consent?: boolean; sourcePath?: string }) {
  try {
    // Use the newsletter signup endpoint
    const response = await fetch('/api/newsletter/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email,
        consent: opts?.consent ?? true,
        sourcePath: opts?.sourcePath || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || 'Failed to submit newsletter signup');
    }

    trackLead('newsletter_voucher');
    const result = await response.json();
    return { success: true, data: result, message: result.message || 'Newsletter signup successful!' };
  } catch (error) {
    console.error('Newsletter form submission error:', error);
    throw new Error('Failed to process newsletter signup. Please try again later.');
  }
}