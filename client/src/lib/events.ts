import { supabase } from './supabase';

export const listEvents = async () => {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true });
  if (error) throw error;
  return data;
};

export const createEvent = async (event: {
  title: string;
  start_time: string;
  end_time: string;
  location?: string;
  description?: string;
}) => {
  const { data, error } = await supabase
    .from('events')
    .insert(event)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateEvent = async (id: string, updates: any) => {
  const { data, error } = await supabase
    .from('events')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteEvent = async (id: string) => {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id);
  if (error) throw error;
};
