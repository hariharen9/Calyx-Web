import { S, saveState, updateDeskBadges, buzz } from "../state/state.js";
import {
  getSupabase,
  getSupabaseConfig,
  saveSupabaseConfig,
  setSupabaseDisabled,
  clearSupabaseConfig,
  testSupabaseConnection,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  resetPasswordForEmail,
  pushStateToCloud,
  pullStateFromCloud,
} from "../supabase.js";
import { $, esc, todayKey } from "../utils/helpers.js";
import { ic } from "../utils/icons.js";
import { toast } from "../utils/toast.js";
import { openSheet, closeSheet, paintSheet, refreshAll } from "./overlays.js";

/**
 * Stateful controller for the Auth and Cloud Sync modal.
 */
export const AUTH_MODAL = {
  mode: "signin", // 'signin' | 'signup' | 'forgot' | 'config' | 'account' | 'confirm'
  email: "",
  password: "",
  confirmPassword: "",
  showPassword: false,
  loading: false,
  error: null,
  success: null,
  cfgUrl: "",
  cfgAnonKey: "",
  testLoading: false,
  testResult: null, // { ok: boolean, text: string } | null
  syncLoading: false,
};

/**
 * Opens the redesigned Auth Modal in the specified mode.
 */
export function openAuthModal(initialMode) {
  const cfg = getSupabaseConfig();
  AUTH_MODAL.cfgUrl = cfg.url || "";
  AUTH_MODAL.cfgAnonKey = cfg.anonKey || "";
  AUTH_MODAL.error = null;
  AUTH_MODAL.success = null;
  AUTH_MODAL.testResult = null;
  AUTH_MODAL.loading = false;
  AUTH_MODAL.testLoading = false;
  AUTH_MODAL.syncLoading = false;

  if (initialMode) {
    AUTH_MODAL.mode = initialMode;
  } else if (S.user) {
    AUTH_MODAL.mode = "account";
  } else if (!cfg.isConfigured) {
    AUTH_MODAL.mode = "config";
  } else {
    AUTH_MODAL.mode = "signin";
  }

  openSheet(authModalHtml);

  // Focus the first relevant input
  setTimeout(() => {
    const el = $("#auth-email") || $("#sb-url");
    if (el) el.focus({ preventScroll: true });
  }, 350);
}

/**
 * Switches the active mode inside the Auth Modal and re-renders.
 */
export function setAuthMode(mode) {
  AUTH_MODAL.mode = mode;
  AUTH_MODAL.error = null;
  AUTH_MODAL.success = null;
  AUTH_MODAL.testResult = null;
  buzz(6);
  paintSheet();

  setTimeout(() => {
    const el = $("#auth-email") || $("#sb-url");
    if (el) el.focus({ preventScroll: true });
  }, 100);
}

/**
 * Toggles password visibility.
 */
export function togglePasswordVisibility() {
  AUTH_MODAL.showPassword = !AUTH_MODAL.showPassword;
  paintSheet();
}

/**
 * Performs Sign In with validation and cloud state pulling.
 */
export async function doSignIn() {
  const emailInp = $("#auth-email");
  const passInp = $("#auth-pass");
  const email = emailInp ? emailInp.value.trim() : AUTH_MODAL.email;
  const password = passInp ? passInp.value : AUTH_MODAL.password;

  AUTH_MODAL.email = email;
  AUTH_MODAL.password = password;
  AUTH_MODAL.error = null;
  AUTH_MODAL.success = null;

  if (!email) {
    AUTH_MODAL.error = "Please enter your email address.";
    paintSheet();
    return;
  }
  if (!password) {
    AUTH_MODAL.error = "Please enter your password.";
    paintSheet();
    return;
  }

  AUTH_MODAL.loading = true;
  paintSheet();

  try {
    const { user } = await signInWithEmail(email, password);
    S.user = user;
    AUTH_MODAL.loading = false;
    AUTH_MODAL.password = "";
    AUTH_MODAL.success = "Signed in successfully!";
    toast(`Welcome back, ${user.email}`);

    // Pull cloud data
    try {
      const cloudData = await pullStateFromCloud();
      if (cloudData) {
        if (cloudData.items) S.items = cloudData.items;
        if (cloudData.logs) S.logs = cloudData.logs;
        if (cloudData.cds) S.cds = cloudData.cds;
        if (cloudData.pages) S.pages = cloudData.pages;
        if (cloudData.folders) S.folders = cloudData.folders;
        saveState();
      }
    } catch (e) {
      console.warn("Initial cloud pull error:", e);
    }

    refreshAll();
    closeSheet();
  } catch (err) {
    AUTH_MODAL.loading = false;
    AUTH_MODAL.error = err.message || "Failed to sign in.";
    paintSheet();
  }
}

/**
 * Performs Sign Up and handles verification / auto-session.
 */
export async function doSignUp() {
  const emailInp = $("#auth-email");
  const passInp = $("#auth-pass");
  const confirmInp = $("#auth-confirm-pass");
  const email = emailInp ? emailInp.value.trim() : AUTH_MODAL.email;
  const password = passInp ? passInp.value : AUTH_MODAL.password;
  const confirm = confirmInp ? confirmInp.value : AUTH_MODAL.confirmPassword;

  AUTH_MODAL.email = email;
  AUTH_MODAL.password = password;
  AUTH_MODAL.confirmPassword = confirm;
  AUTH_MODAL.error = null;
  AUTH_MODAL.success = null;

  if (!email) {
    AUTH_MODAL.error = "Please enter your email address.";
    paintSheet();
    return;
  }
  if (!password || password.length < 6) {
    AUTH_MODAL.error = "Password must be at least 6 characters long.";
    paintSheet();
    return;
  }
  if (confirm !== undefined && password !== confirm) {
    AUTH_MODAL.error = "Passwords do not match.";
    paintSheet();
    return;
  }

  AUTH_MODAL.loading = true;
  paintSheet();

  try {
    const result = await signUpWithEmail(email, password);
    AUTH_MODAL.loading = false;

    if (result.needsConfirmation) {
      AUTH_MODAL.mode = "confirm";
      AUTH_MODAL.password = "";
      AUTH_MODAL.confirmPassword = "";
      paintSheet();
    } else {
      S.user = result.user;
      AUTH_MODAL.password = "";
      AUTH_MODAL.confirmPassword = "";
      toast("Account created and synced!");
      pushStateToCloud(S).catch(() => {});
      refreshAll();
      closeSheet();
    }
  } catch (err) {
    AUTH_MODAL.loading = false;
    AUTH_MODAL.error = err.message || "Failed to create account.";
    paintSheet();
  }
}

/**
 * Performs Password Reset request.
 */
export async function doForgotPass() {
  const emailInp = $("#auth-email");
  const email = emailInp ? emailInp.value.trim() : AUTH_MODAL.email;
  AUTH_MODAL.email = email;
  AUTH_MODAL.error = null;
  AUTH_MODAL.success = null;

  if (!email) {
    AUTH_MODAL.error = "Please enter your email address.";
    paintSheet();
    return;
  }

  AUTH_MODAL.loading = true;
  paintSheet();

  try {
    await resetPasswordForEmail(email);
    AUTH_MODAL.loading = false;
    AUTH_MODAL.success = `Password reset instructions sent to ${email}. Check your inbox.`;
    paintSheet();
  } catch (err) {
    AUTH_MODAL.loading = false;
    AUTH_MODAL.error = err.message || "Failed to send reset link.";
    paintSheet();
  }
}

/**
 * Tests connection to the provided Supabase project credentials.
 */
export async function doTestConnection() {
  const urlInp = $("#sb-url");
  const keyInp = $("#sb-key");
  const url = urlInp ? urlInp.value.trim() : AUTH_MODAL.cfgUrl;
  const anonKey = keyInp ? keyInp.value.trim() : AUTH_MODAL.cfgAnonKey;

  AUTH_MODAL.cfgUrl = url;
  AUTH_MODAL.cfgAnonKey = anonKey;
  AUTH_MODAL.testLoading = true;
  AUTH_MODAL.testResult = null;
  AUTH_MODAL.error = null;
  paintSheet();

  const res = await testSupabaseConnection(url, anonKey);
  AUTH_MODAL.testLoading = false;
  AUTH_MODAL.testResult = {
    ok: res.ok,
    text: res.ok ? res.message : res.error,
  };
  paintSheet();
}

/**
 * Saves project configuration and switches to signin mode.
 */
export async function doSaveConfig() {
  const urlInp = $("#sb-url");
  const keyInp = $("#sb-key");
  const url = urlInp ? urlInp.value.trim() : AUTH_MODAL.cfgUrl;
  const anonKey = keyInp ? keyInp.value.trim() : AUTH_MODAL.cfgAnonKey;

  AUTH_MODAL.cfgUrl = url;
  AUTH_MODAL.cfgAnonKey = anonKey;
  AUTH_MODAL.error = null;

  if (!url || !anonKey) {
    AUTH_MODAL.error = "Both Project URL and Anon API key are required.";
    paintSheet();
    return;
  }

  AUTH_MODAL.loading = true;
  paintSheet();

  const test = await testSupabaseConnection(url, anonKey);
  if (!test.ok) {
    AUTH_MODAL.loading = false;
    AUTH_MODAL.error = test.error;
    AUTH_MODAL.testResult = { ok: false, text: test.error };
    paintSheet();
    return;
  }

  saveSupabaseConfig(url, anonKey);
  AUTH_MODAL.loading = false;
  toast("Supabase project connected!");
  setAuthMode("signin");
}

/**
 * Clears custom credentials and sets offline/local-only mode.
 */
export function doUseOffline() {
  setSupabaseDisabled(true);
  S.user = null;
  updateDeskBadges();
  refreshAll();
  closeSheet();
  toast("Using Calyx in Local (Offline) mode");
}

/**
 * Clears custom configuration and restores defaults.
 */
export function doResetConfig() {
  clearSupabaseConfig();
  const cfg = getSupabaseConfig();
  AUTH_MODAL.cfgUrl = cfg.url || "";
  AUTH_MODAL.cfgAnonKey = cfg.anonKey || "";
  AUTH_MODAL.testResult = null;
  AUTH_MODAL.error = null;
  AUTH_MODAL.success = "Reset to default environment configuration.";
  paintSheet();
}

/**
 * Signs out the current user.
 */
export async function doSignOut() {
  await signOutUser();
  S.user = null;
  updateDeskBadges();
  refreshAll();
  closeSheet();
  toast("Signed out successfully");
}

/**
 * Triggers immediate manual sync with the cloud.
 */
export async function doSyncNow() {
  AUTH_MODAL.syncLoading = true;
  AUTH_MODAL.error = null;
  AUTH_MODAL.success = null;
  paintSheet();

  const res = await pushStateToCloud(S);
  AUTH_MODAL.syncLoading = false;

  if (res.synced) {
    AUTH_MODAL.success = "Synced with cloud at " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    toast("Synced to cloud successfully!");
  } else {
    AUTH_MODAL.error = "Sync failed: " + (res.error || res.reason);
    toast("Sync failed: " + (res.error || res.reason));
  }
  paintSheet();
}

// ================= HTML RENDERING ================= //

/**
 * Main render function for the Auth Modal sheet.
 */
export function authModalHtml() {
  const cfg = getSupabaseConfig();
  const mode = AUTH_MODAL.mode;

  let alertBox = "";
  if (AUTH_MODAL.error) {
    alertBox = `
      <div class="auth-alert err" role="alert">
        ${ic("x", 16)}
        <span>${esc(AUTH_MODAL.error)}</span>
      </div>`;
  } else if (AUTH_MODAL.success) {
    alertBox = `
      <div class="auth-alert ok" role="status">
        ${ic("check", 16)}
        <span>${esc(AUTH_MODAL.success)}</span>
      </div>`;
  }

  // Header badge
  let statusBadge = "";
  if (S.user) {
    statusBadge = `<span class="auth-status-badge online"><i class="dot"></i> Connected</span>`;
  } else if (cfg.isConfigured) {
    statusBadge = `<span class="auth-status-badge ready"><i class="dot"></i> Cloud Ready</span>`;
  } else {
    statusBadge = `<span class="auth-status-badge offline"><i class="dot"></i> Local Only</span>`;
  }

  // Navigation tab bar
  let tabBar = "";
  if (!S.user && mode !== "confirm") {
    tabBar = `
      <div class="auth-tabs">
        <button class="auth-tab ${mode === "signin" ? "on" : ""}" data-act="auth-tab" data-mode="signin">Sign In</button>
        <button class="auth-tab ${mode === "signup" ? "on" : ""}" data-act="auth-tab" data-mode="signup">Create Account</button>
        <button class="auth-tab ${mode === "config" ? "on" : ""}" data-act="auth-tab" data-mode="config">${ic("settings", 14)} Project</button>
      </div>`;
  } else if (S.user) {
    tabBar = `
      <div class="auth-tabs">
        <button class="auth-tab ${mode === "account" ? "on" : ""}" data-act="auth-tab" data-mode="account">My Account</button>
        <button class="auth-tab ${mode === "config" ? "on" : ""}" data-act="auth-tab" data-mode="config">${ic("settings", 14)} Project Keys</button>
      </div>`;
  }

  let body = "";

  if (mode === "signin") {
    body = `
      <div class="auth-desc">Sign in with your email to sync items, tasks, logs, and pages across all your devices.</div>
      ${alertBox}
      <form class="auth-form" onsubmit="event.preventDefault();" autocomplete="on">
        <div class="fld">
          <label for="auth-email">Email Address</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">${ic("search", 16)}</span>
            <input class="inp" type="email" id="auth-email" placeholder="you@domain.com" autocomplete="email" value="${esc(AUTH_MODAL.email)}" required enterkeyhint="next">
          </div>
        </div>

        <div class="fld">
          <div class="auth-label-row">
            <label for="auth-pass">Password</label>
            <button type="button" class="auth-link-btn" data-act="auth-tab" data-mode="forgot">Forgot password?</button>
          </div>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">${ic("clock", 16)}</span>
            <input class="inp" type="${AUTH_MODAL.showPassword ? "text" : "password"}" id="auth-pass" placeholder="Enter your password" autocomplete="current-password" value="${esc(AUTH_MODAL.password)}" required enterkeyhint="done">
            <button type="button" class="auth-eye-btn" data-act="auth-togglepass" aria-label="Toggle password visibility">
              ${AUTH_MODAL.showPassword ? ic("spark", 16) : ic("more", 16)}
            </button>
          </div>
        </div>

        <div class="auth-actions">
          <button type="button" class="btn press ${AUTH_MODAL.loading ? "loading" : ""}" data-act="auth-signin" id="auth-submit-btn">
            ${AUTH_MODAL.loading ? `<span class="auth-spinner"></span> Signing in...` : `${ic("check", 18)} Sign In`}
          </button>
        </div>
      </form>

      <div class="auth-foot">
        <span>Don't have an account? <button class="auth-inline-btn" data-act="auth-tab" data-mode="signup">Create account</button></span>
      </div>`;
  } else if (mode === "signup") {
    body = `
      <div class="auth-desc">Create your Calyx account. Your data remains private and protected with Row-Level Security.</div>
      ${alertBox}
      <form class="auth-form" onsubmit="event.preventDefault();" autocomplete="on">
        <div class="fld">
          <label for="auth-email">Email Address</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">${ic("search", 16)}</span>
            <input class="inp" type="email" id="auth-email" placeholder="you@domain.com" autocomplete="email" value="${esc(AUTH_MODAL.email)}" required enterkeyhint="next">
          </div>
        </div>

        <div class="fld">
          <label for="auth-pass">Password (minimum 6 characters)</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">${ic("clock", 16)}</span>
            <input class="inp" type="${AUTH_MODAL.showPassword ? "text" : "password"}" id="auth-pass" placeholder="Choose a password" autocomplete="new-password" value="${esc(AUTH_MODAL.password)}" required enterkeyhint="next">
            <button type="button" class="auth-eye-btn" data-act="auth-togglepass" aria-label="Toggle password visibility">
              ${AUTH_MODAL.showPassword ? ic("spark", 16) : ic("more", 16)}
            </button>
          </div>
        </div>

        <div class="fld">
          <label for="auth-confirm-pass">Confirm Password</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">${ic("clock", 16)}</span>
            <input class="inp" type="${AUTH_MODAL.showPassword ? "text" : "password"}" id="auth-confirm-pass" placeholder="Confirm your password" autocomplete="new-password" value="${esc(AUTH_MODAL.confirmPassword)}" required enterkeyhint="done">
          </div>
        </div>

        <div class="auth-actions">
          <button type="button" class="btn press ${AUTH_MODAL.loading ? "loading" : ""}" data-act="auth-signup" id="auth-submit-btn">
            ${AUTH_MODAL.loading ? `<span class="auth-spinner"></span> Creating account...` : `${ic("plus", 18)} Create Account`}
          </button>
        </div>
      </form>

      <div class="auth-foot">
        <span>Already have an account? <button class="auth-inline-btn" data-act="auth-tab" data-mode="signin">Sign in</button></span>
      </div>`;
  } else if (mode === "confirm") {
    body = `
      <div class="auth-confirm-box card">
        <div class="auth-confirm-icon">${ic("spark", 36)}</div>
        <h3 class="disp">Check Your Email</h3>
        <p>A confirmation email was sent to <b>${esc(AUTH_MODAL.email)}</b>.</p>
        <p class="auth-confirm-sub">Click the verification link inside the email to activate your account, then come back here to sign in.</p>
        <button class="btn press" data-act="auth-tab" data-mode="signin" style="margin-top:16px;">
          ${ic("check", 18)} Go to Sign In
        </button>
      </div>`;
  } else if (mode === "forgot") {
    body = `
      <div class="auth-desc">Enter your account email to receive a password recovery link.</div>
      ${alertBox}
      <form class="auth-form" onsubmit="event.preventDefault();">
        <div class="fld">
          <label for="auth-email">Email Address</label>
          <div class="auth-input-wrap">
            <span class="auth-input-icon">${ic("search", 16)}</span>
            <input class="inp" type="email" id="auth-email" placeholder="you@domain.com" autocomplete="email" value="${esc(AUTH_MODAL.email)}" required enterkeyhint="done">
          </div>
        </div>

        <div class="auth-actions">
          <button type="button" class="btn press ${AUTH_MODAL.loading ? "loading" : ""}" data-act="auth-forgot">
            ${AUTH_MODAL.loading ? `<span class="auth-spinner"></span> Sending link...` : `${ic("spark", 18)} Send Reset Link`}
          </button>
          <button type="button" class="btn sec press" data-act="auth-tab" data-mode="signin">Back to Sign In</button>
        </div>
      </form>`;
  } else if (mode === "config") {
    let testBox = "";
    if (AUTH_MODAL.testResult) {
      testBox = `
        <div class="auth-test-result ${AUTH_MODAL.testResult.ok ? "ok" : "err"}">
          ${AUTH_MODAL.testResult.ok ? ic("check", 16) : ic("x", 16)}
          <span>${esc(AUTH_MODAL.testResult.text)}</span>
        </div>`;
    }

    body = `
      <div class="auth-desc">Configure your Supabase Project URL and Anon API key to enable cloud database and realtime sync.</div>
      ${alertBox}
      ${testBox}
      <form class="auth-form" onsubmit="event.preventDefault();">
        <div class="fld">
          <label for="sb-url">Supabase Project URL</label>
          <input class="inp" id="sb-url" placeholder="https://yourproject.supabase.co" value="${esc(AUTH_MODAL.cfgUrl)}" autocomplete="off" spellcheck="false">
          <small class="auth-field-hint">Found in Supabase Dashboard → Settings → API → Project URL</small>
        </div>

        <div class="fld">
          <label for="sb-key">Supabase Anon Key</label>
          <input class="inp" id="sb-key" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." value="${esc(AUTH_MODAL.cfgAnonKey)}" autocomplete="off" spellcheck="false">
          <small class="auth-field-hint">Found in Supabase Dashboard → Settings → API → Project API Keys (anon public)</small>
        </div>

        <div class="auth-actions-group">
          <div style="display:flex;gap:10px;margin-bottom:10px;">
            <button type="button" class="btn sec press ${AUTH_MODAL.testLoading ? "loading" : ""}" data-act="auth-testcfg" style="flex:1">
              ${AUTH_MODAL.testLoading ? `<span class="auth-spinner"></span> Testing...` : `${ic("spark", 16)} Test Connection`}
            </button>
            <button type="button" class="btn press ${AUTH_MODAL.loading ? "loading" : ""}" data-act="auth-savecfg" style="flex:1">
              ${AUTH_MODAL.loading ? `<span class="auth-spinner"></span> Saving...` : `${ic("check", 16)} Save & Connect`}
            </button>
          </div>
          <div style="display:flex;gap:10px;">
            <button type="button" class="btn sec sm press" data-act="auth-resetcfg" style="flex:1">
              Reset to Defaults
            </button>
            <button type="button" class="btn sec sm press" data-act="auth-offline" style="flex:1">
              Use Offline Only
            </button>
          </div>
        </div>
      </form>
      <div class="auth-foot" style="margin-top:16px;">
        <span style="font-size:12px;color:var(--muted);line-height:1.5;">Database table required: Run <code>supabase_schema.sql</code> in your Supabase SQL Editor to initialize <code>public.user_data</code> and RLS policies.</span>
      </div>`;
  } else if (mode === "account") {
    body = `
      <div class="auth-account-card card">
        <div class="auth-account-header">
          <div class="auth-account-avatar">
            ${(S.user?.email || "U")[0].toUpperCase()}
          </div>
          <div class="auth-account-info">
            <h3 class="disp">${esc(S.user?.email || "User")}</h3>
            <span class="auth-uid num">ID: ${esc(S.user?.id ? S.user.id.slice(0, 14) + "..." : "unknown")}</span>
          </div>
        </div>

        <div class="auth-meta-list">
          <div class="auth-meta-row">
            <span>Sync Status</span>
            <span style="color:var(--k2);font-weight:700;">Active · Realtime</span>
          </div>
          <div class="auth-meta-row">
            <span>Cloud Items</span>
            <span class="num">${(S.items || []).length} items, ${(S.pages || []).length} pages</span>
          </div>
          <div class="auth-meta-row">
            <span>Supabase Host</span>
            <span class="num" style="max-width:55%;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;">${esc(cfg.url || "default")}</span>
          </div>
        </div>
      </div>

      ${alertBox}

      <div class="auth-actions-group" style="margin-top:14px;">
        <button type="button" class="btn press ${AUTH_MODAL.syncLoading ? "loading" : ""}" data-act="auth-syncnow" style="margin-bottom:10px;">
          ${AUTH_MODAL.syncLoading ? `<span class="auth-spinner"></span> Syncing...` : `${ic("spark", 18)} Sync Now`}
        </button>
        <div style="display:flex;gap:10px;">
          <button type="button" class="btn sec press" data-act="auth-tab" data-mode="config" style="flex:1">
            ${ic("settings", 16)} Edit Keys
          </button>
          <button type="button" class="btn dng press" data-act="auth-signout" style="flex:1">
            ${ic("x", 16)} Sign Out
          </button>
        </div>
      </div>`;
  }

  return `
    <div class="auth-modal-wrap">
      <div class="shead">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
          <div>
            <h2 class="disp">Calyx Cloud</h2>
            <small>Fast, private, multi-device synchronization</small>
          </div>
          ${statusBadge}
        </div>
      </div>
      ${tabBar}
      <div class="auth-body">
        ${body}
      </div>
    </div>`;
}
