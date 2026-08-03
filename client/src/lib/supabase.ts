// Supabase client removed - app now uses Neon database only
// Legacy authentication functions maintained for backward compatibility

// Mock client for backward compatibility with frontend components
export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase auth disabled - use Express sessions' } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: (callback: Function) => {
      // Mock auth state change - immediately call with no session
      callback('SIGNED_OUT', null);
      return { 
        data: { subscription: { unsubscribe: () => {} } },
        error: null 
      };
    }
  },
  from: (table: string) => ({
    select: (columns?: string) => ({
      eq: () => Promise.resolve({ data: [], error: null }),
      filter: () => Promise.resolve({ data: [], error: null }),
      order: () => Promise.resolve({ data: [], error: null }),
      limit: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (callback: Function) => callback({ data: [], error: null })
    }),
    insert: (data: any) => ({
      select: () => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null })
    }),
    update: (data: any) => ({
      eq: () => ({
        select: () => Promise.resolve({ data: [], error: null })
      })
    }),
    delete: () => ({
      eq: () => Promise.resolve({ data: null, error: null })
    }),
    upsert: (data: any) => ({
      select: () => Promise.resolve({ data: [], error: null })
    })
  }),
  storage: {
    from: (bucket: string) => ({
      upload: () => Promise.resolve({ data: null, error: { message: 'Supabase storage disabled - use local file storage' } }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: '' } }),
      list: () => Promise.resolve({ data: [], error: null }),
      remove: () => Promise.resolve({ data: null, error: null })
    })
  },
  functions: {
    invoke: (name: string, _options?: any) => Promise.resolve({ data: null, error: { message: `Supabase Edge Function '${name}' disabled - migrate to internal API` } })
  }
};

// Enhanced connection test with better error handling (legacy compatibility)
export const testSupabaseConnection = async () => {
  return { 
    success: false, 
    error: 'Supabase connection disabled - app uses Neon database only' 
  };
};

// Enhanced project status check with more detailed error handling
export const checkSupabaseProjectStatus = async () => {
  return { 
    active: false, 
    error: 'Supabase project status disabled - app uses Neon database only',
    statusCode: 0
  };
};

// Utility function to check if error is related to project being paused
export const isProjectPausedError = (error: any): boolean => {
  return false; // Always false since Supabase is disabled
};