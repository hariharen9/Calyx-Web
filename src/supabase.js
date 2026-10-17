import { createClient } from '@supabase/supabase-js';

// Default to environment variables, with fallback to localStorage for in-app configuration
const STORAGE_KEY_URL = 'calyx.supabase.url';
const STORAGE_KEY_ANON = 'calyx.supabase.anon';

export function getSupabaseConfig() {
  const url = localStorage.getItem(STORAGE_KEY_URL) || import.meta.env.VITE_SUPABASE_URL || '';
  const anonKey =
    localStorage.getItem(STORAGE_KEY_ANON) ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    '';
  return { url, anonKey };
}

export function saveSupabaseConfig(url, anonKey) {
  if (url) localStorage.setItem(STORAGE_KEY_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEY_URL);

  if (anonKey) localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  else localStorage.removeItem(STORAGE_KEY_ANON);

  initSupabase();
}

let supabaseInstance = null;

export function initSupabase() {
  const { url, anonKey } = getSupabaseConfig();
  if (url && anonKey) {
    try {
      supabaseInstance = createClient(url, anonKey);
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      supabaseInstance = null;
    }
  } else {
    supabaseInstance = null;
  }
  return supabaseInstance;
}

export function getSupabase() {
  if (!supabaseInstance) {
    initSupabase();
  }
  return supabaseInstance;
}

// Auth helpers
export async function getCurrentUser() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

export async function signInWithEmail(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOutUser() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

// Database Cloud Sync Helpers
let lastLocalPushTime = 0;
export function getLastLocalPushTime() {
  return lastLocalPushTime;
}

export async function pushStateToCloud(state) {
  const sb = getSupabase();
  if (!sb) return { synced: false, reason: 'unconfigured' };
  const user = await getCurrentUser();
  if (!user) return { synced: false, reason: 'unauthenticated' };

  try {
    const nowIso = new Date().toISOString();
    lastLocalPushTime = Date.now();
    const payload = {
      user_id: user.id,
      updated_at: nowIso,
      items: state.items,
      logs: state.logs,
      cds: state.cds,
      pages: state.pages,
      folders: state.folders,
      prefs: state.prefs
    };

    const { error } = await sb
      .from('user_data')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) throw error;
    return { synced: true, timestamp: nowIso };
  } catch (err) {
    console.error('Error pushing state to Supabase:', err);
    return { synced: false, error: err.message };
  }
}

export async function pullStateFromCloud() {
  const sb = getSupabase();
  if (!sb) return null;
  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const { data, error } = await sb
      .from('user_data')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (err) {
    console.error('Error pulling state from Supabase:', err);
    return null;
  }
}

let activeRealtimeChannel = null;

export function subscribeToStateChanges(onUpdate) {
  const sb = getSupabase();
  if (!sb) return () => {};

  if (activeRealtimeChannel) {
    try {
      sb.removeChannel(activeRealtimeChannel);
    } catch (e) {}
    activeRealtimeChannel = null;
  }

  getCurrentUser().then((user) => {
    if (!user || !sb) return;

    try {
      activeRealtimeChannel = sb
        .channel(`user-sync-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_data',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            // Ignore echoes of our own pushes within 2.5 seconds
            if (Date.now() - lastLocalPushTime < 2500) return;
            if (payload && payload.new && onUpdate) {
              onUpdate(payload.new);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime sync connected to Calyx cloud');
          }
        });
    } catch (err) {
      console.warn('Realtime subscription not supported or failed:', err);
    }
  });

  return () => {
    if (activeRealtimeChannel && sb) {
      try {
        sb.removeChannel(activeRealtimeChannel);
      } catch (e) {}
      activeRealtimeChannel = null;
    }
  };
}
