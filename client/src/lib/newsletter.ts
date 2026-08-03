import { supabase } from './supabase';

export interface NewsletterSubscriber {
  id: string;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed';
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface NewsletterTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  html_content?: string;
  created_at: string;
  updated_at: string;
}

export interface NewsletterCampaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  html_content?: string;
  template_id?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_at?: string;
  sent_at?: string;
  recipient_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

// Newsletter Subscribers
export const getNewsletterSubscribers = async () => {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NewsletterSubscriber[];
};

export const addNewsletterSubscriber = async (subscriber: Omit<NewsletterSubscriber, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .insert([{
      ...subscriber,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data as NewsletterSubscriber;
};

export const updateNewsletterSubscriber = async (id: string, updates: Partial<NewsletterSubscriber>) => {
  const { data, error } = await supabase
    .from('newsletter_subscribers')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsletterSubscriber;
};

export const deleteNewsletterSubscriber = async (id: string) => {
  const { error } = await supabase
    .from('newsletter_subscribers')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Newsletter Templates
export const getNewsletterTemplates = async () => {
  const { data, error } = await supabase
    .from('newsletter_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NewsletterTemplate[];
};

export const createNewsletterTemplate = async (template: Omit<NewsletterTemplate, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('newsletter_templates')
    .insert([{
      ...template,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data as NewsletterTemplate;
};

export const updateNewsletterTemplate = async (id: string, updates: Partial<NewsletterTemplate>) => {
  const { data, error } = await supabase
    .from('newsletter_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsletterTemplate;
};

export const deleteNewsletterTemplate = async (id: string) => {
  const { error } = await supabase
    .from('newsletter_templates')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Newsletter Campaigns
export const getNewsletterCampaigns = async () => {
  const { data, error } = await supabase
    .from('newsletter_campaigns')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as NewsletterCampaign[];
};

export const createNewsletterCampaign = async (campaign: Omit<NewsletterCampaign, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('newsletter_campaigns')
    .insert([{
      ...campaign,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return data as NewsletterCampaign;
};

export const updateNewsletterCampaign = async (id: string, updates: Partial<NewsletterCampaign>) => {
  const { data, error } = await supabase
    .from('newsletter_campaigns')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as NewsletterCampaign;
};

export const deleteNewsletterCampaign = async (id: string) => {
  const { error } = await supabase
    .from('newsletter_campaigns')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Send Newsletter Campaign
export const sendNewsletterCampaign = async (campaignId: string) => {
  try {
    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError) throw campaignError;
    if (!campaign) throw new Error('Campaign not found');

    // Get active subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('status', 'active');

    if (subscribersError) throw subscribersError;
    if (!subscribers?.length) throw new Error('No active subscribers found');

    // Update campaign status
    await updateNewsletterCampaign(campaignId, {
      status: 'sending',
      recipient_count: subscribers.length
    });

    // Here you would integrate with your email service (SendGrid, Mailgun, etc.)
    // For now, we'll simulate sending
    // console.log removed

    // Update campaign as sent
    await updateNewsletterCampaign(campaignId, {
      status: 'sent',
      sent_at: new Date().toISOString()
    });

    return { success: true, recipientCount: subscribers.length };
  } catch (error) {
    // Update campaign as failed
    await updateNewsletterCampaign(campaignId, {
      status: 'failed'
    });
    throw error;
  }
};

// Newsletter Subscription (Public API)
export const subscribeToNewsletter = async (email: string, name?: string) => {
  // Check if already subscribed
  const { data: existing } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('email', email)
    .single();

  if (existing) {
    if (existing.status === 'unsubscribed') {
      // Resubscribe
      return await updateNewsletterSubscriber(existing.id, {
        status: 'active',
        name: name || existing.name
      });
    }
    return existing; // Already subscribed
  }

  // New subscription
  return await addNewsletterSubscriber({
    email,
    name,
    status: 'active',
    tags: []
  });
};

export const unsubscribeFromNewsletter = async (email: string) => {
  const { data: subscriber } = await supabase
    .from('newsletter_subscribers')
    .select('*')
    .eq('email', email)
    .single();

  if (subscriber) {
    return await updateNewsletterSubscriber(subscriber.id, {
      status: 'unsubscribed'
    });
  }

  throw new Error('Subscriber not found');
};
