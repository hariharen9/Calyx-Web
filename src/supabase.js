import { createClient } from '@supabase/supabase-js';

// Storage keys for configuration
export const STORAGE_KEY_URL = 'calyx.supabase.url';
export const STORAGE_KEY_ANON = 'calyx.supabase.anon';
export const STORAGE_KEY_DISABLED = 'calyx.supabase.disabled';

/**
 * Normalizes a Supabase URL ensuring proper protocol and no trailing slash.
 */
export function normalizeSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  return url.replace(/\/+$/, '');
}

/**
 * Retrieves the current Supabase configuration.
 */
export function getSupabaseConfig() {
  const isDisabled = localStorage.getItem(STORAGE_KEY_DISABLED) === 'true';
  const customUrl = localStorage.getItem(STORAGE_KEY_URL);
  const customAnon = localStorage.getItem(STORAGE_KEY_ANON);

  let url = '';
  let anonKey = '';
  let source = 'none';

  if (customUrl || customAnon) {
    url = normalizeSupabaseUrl(customUrl || '');
    anonKey = (customAnon || '').trim();
    source = 'custom';
  } else if (!isDisabled) {
    const envUrl = import.meta.env?.VITE_SUPABASE_URL || '';
    const envAnon =
      import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      import.meta.env?.VITE_SUPABASE_ANON_KEY ||
      '';
    if (envUrl && envAnon) {
      url = normalizeSupabaseUrl(envUrl);
      anonKey = envAnon.trim();
      source = 'env';
    }
  }

  const isConfigured = !isDisabled && !!(url && anonKey);

  return {
    url,
    anonKey,
    isConfigured,
    isDisabled,
    source,
  };
}

let supabaseInstance = null;

/**
 * Saves custom Supabase credentials and reinitializes the client.
 */
export function saveSupabaseConfig(url, anonKey) {
  const cleanUrl = normalizeSupabaseUrl(url);
  const cleanKey = (anonKey || '').trim();

  if (cleanUrl) {
    localStorage.setItem(STORAGE_KEY_URL, cleanUrl);
  } else {
    localStorage.removeItem(STORAGE_KEY_URL);
  }

  if (cleanKey) {
    localStorage.setItem(STORAGE_KEY_ANON, cleanKey);
  } else {
    localStorage.removeItem(STORAGE_KEY_ANON);
  }

  // Clear disabled flag when explicitly saving config
  localStorage.removeItem(STORAGE_KEY_DISABLED);

  return initSupabase();
}

/**
 * Sets offline / disabled mode.
 */
export function setSupabaseDisabled(disabled) {
  if (disabled) {
    localStorage.setItem(STORAGE_KEY_DISABLED, 'true');
    supabaseInstance = null;
  } else {
    localStorage.removeItem(STORAGE_KEY_DISABLED);
    initSupabase();
  }
}

/**
 * Clears custom saved credentials and resets to defaults.
 */
export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEY_URL);
  localStorage.removeItem(STORAGE_KEY_ANON);
  localStorage.removeItem(STORAGE_KEY_DISABLED);
  return initSupabase();
}

/**
 * Real-world connectivity test for provided or active Supabase credentials.
 */
export async function testSupabaseConnection(rawUrl, rawKey) {
  const url = normalizeSupabaseUrl(rawUrl);
  const anonKey = (rawKey || '').trim();

  if (!url) {
    return { ok: false, error: 'Supabase project URL is required.' };
  }
  if (!anonKey) {
    return { ok: false, error: 'Supabase Anon / API key is required.' };
  }

  try {
    new URL(url);
  } catch (e) {
    return { ok: false, error: 'Invalid URL format. Example: https://yourproject.supabase.co' };
  }

  try {
    const testClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // Make an actual lightweight network request to Supabase auth settings endpoint
    const response = await fetch(`${url}/auth/v1/settings`, {
      method: 'GET',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    if (response.ok) {
      return { ok: true, message: 'Successfully connected to Supabase project!' };
    }

    if (response.status === 401 || response.status === 403) {
      return {
        ok: false,
        error: 'Invalid API key. Check that you are using the correct anon/public key.',
      };
    }

    if (response.status === 404) {
      return {
        ok: false,
        error: 'Supabase auth endpoint returned 404. Verify the project URL.',
      };
    }

    const text = await response.text().catch(() => '');
    return {
      ok: false,
      error: `Server responded with status ${response.status}: ${text || 'Unknown error'}`,
    };
  } catch (err) {
    let msg = err.message || 'Connection failed';
    if (msg.includes('fetch failed') || msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      msg = 'Network connection failed. Verify the project URL is active and reachable.';
    }
    return { ok: false, error: msg };
  }
}

/**
 * Initializes the singleton Supabase client.
 */
export function initSupabase() {
  const { url, anonKey, isConfigured } = getSupabaseConfig();

  if (!isConfigured) {
    supabaseInstance = null;
    return null;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return supabaseInstance;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    supabaseInstance = null;
    return null;
  }
}

/**
 * Returns the current active Supabase client or null.
 */
export function getSupabase() {
  if (!supabaseInstance) {
    initSupabase();
  }
  return supabaseInstance;
}

// ================= AUTHENTICATION HELPERS ================= //

/**
 * Returns the current authenticated user, or null if unauthenticated.
 */
export async function getCurrentUser() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { user }, error } = await sb.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch (err) {
    return null;
  }
}

/**
 * Returns the current active session, or null.
 */
export async function getSession() {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { session }, error } = await sb.auth.getSession();
    if (error || !session) return null;
    return session;
  } catch (err) {
    return null;
  }
}

/**
 * Signs in using email and password.
 */
export async function signInWithEmail(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured. Please enter your project keys first.');

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Please enter a valid email address.');
  if (!password) throw new Error('Please enter your password.');

  const { data, error } = await sb.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) {
    let msg = error.message;
    if (msg.includes('Invalid login credentials')) {
      msg = 'Incorrect email or password. Please verify and try again.';
    } else if (msg.includes('Email not confirmed')) {
      msg = 'Email address has not been confirmed yet. Please check your inbox.';
    } else if (msg.includes('fetch failed') || msg.includes('Failed to fetch')) {
      msg = 'Unable to connect to Supabase server. Check your network or project URL.';
    }
    throw new Error(msg);
  }

  return data;
}

/**
 * Creates a new account with email and password.
 */
export async function signUpWithEmail(email, password) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured. Please enter your project keys first.');

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Please enter a valid email address.');
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters long.');
  }

  const { data, error } = await sb.auth.signUp({
    email: cleanEmail,
    password,
  });

  if (error) {
    let msg = error.message;
    if (msg.includes('User already registered')) {
      msg = 'An account with this email already exists. Try signing in instead.';
    } else if (msg.includes('fetch failed') || msg.includes('Failed to fetch')) {
      msg = 'Unable to connect to Supabase server. Check your network or project URL.';
    }
    throw new Error(msg);
  }

  // Check if email confirmation is required (session is null when email confirmation is active)
  const needsConfirmation = !data.session && !!data.user;

  return {
    user: data.user,
    session: data.session,
    needsConfirmation,
  };
}

/**
 * Sends a password reset email.
 */
export async function resetPasswordForEmail(email) {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured.');

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) throw new Error('Please enter your email address.');

  const { error } = await sb.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: window.location.origin,
  });

  if (error) throw new Error(error.message);
  return true;
}

/**
 * Signs out the current user.
 */
export async function signOutUser() {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.auth.signOut();
  } catch (err) {
    console.warn('Sign out warning:', err);
  }
}

/**
 * Subscribes to Supabase Auth state changes.
 */
export function onAuthStateChange(callback) {
  const sb = getSupabase();
  if (!sb) return () => {};

  const { data: { subscription } } = sb.auth.onAuthStateChange((event, session) => {
    if (callback) {
      callback(event, session?.user || null, session);
    }
  });

  return () => {
    subscription?.unsubscribe();
  };
}

// ================= DATABASE SYNC HELPERS ================= //

let lastLocalPushTime = 0;
export function getLastLocalPushTime() {
  return lastLocalPushTime;
}

/**
 * Pushes state snapshot to the user_data table.
 */
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
      items: state.items || [],
      logs: state.logs || [],
      cds: state.cds || [],
      pages: state.pages || [],
      folders: state.folders || [],
      prefs: state.prefs || {},
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

/**
 * Pulls latest state from the user_data table.
 */
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

/**
 * Realtime Postgres change subscription for live multi-device syncing.
 */
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
            filter: `user_id=eq.${user.id}`,
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
