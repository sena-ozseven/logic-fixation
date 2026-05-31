// ── Auth state ────────────────────────────────────────────────────────────────
// window.authState is readable by other scripts (pdf-viewer.js, admin panel).
window.authState = { session: null, profile: null };

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtmlAuth(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function fetchProfile(userId) {
  const { data } = await db
    .from("profiles")
    .select("id, username, role")
    .eq("id", userId)
    .single();
  return data;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function injectAuthModal() {
  const modal = document.createElement("div");
  modal.id = "auth-modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "Sign in or create account");
  modal.hidden = true;
  modal.innerHTML = `
    <div class="auth-backdrop" id="auth-backdrop"></div>
    <div class="auth-dialog">
      <button class="auth-close" id="auth-close" aria-label="Close">×</button>

      <div class="auth-tabs">
        <button class="auth-tab active" data-auth-tab="signin">Sign in</button>
        <button class="auth-tab" data-auth-tab="signup">Create account</button>
      </div>

      <form id="auth-signin-form" data-auth-form="signin">
        <label for="auth-email-in">Email</label>
        <input id="auth-email-in" type="email" required autocomplete="email" />
        <label for="auth-pass-in">Password</label>
        <input id="auth-pass-in" type="password" required autocomplete="current-password" />
        <button type="submit" class="btn-primary" style="width:100%;margin-top:0.75rem;">Sign in</button>
      </form>

      <form id="auth-signup-form" data-auth-form="signup" hidden>
        <label for="auth-username">Username</label>
        <input id="auth-username" type="text" required minlength="2" autocomplete="username" />
        <label for="auth-email-up">Email</label>
        <input id="auth-email-up" type="email" required autocomplete="email" />
        <label for="auth-pass-up">Password (min 6 characters)</label>
        <input id="auth-pass-up" type="password" required minlength="6" autocomplete="new-password" />
        <button type="submit" class="btn-primary" style="width:100%;margin-top:0.75rem;">Create account</button>
      </form>

      <p class="auth-status" id="auth-status" aria-live="polite"></p>
    </div>
  `;
  document.body.appendChild(modal);

  // Tab switching
  modal.querySelectorAll("[data-auth-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      const target = tab.getAttribute("data-auth-tab");
      modal.querySelectorAll("[data-auth-tab]").forEach(function (t) {
        t.classList.toggle("active", t.getAttribute("data-auth-tab") === target);
      });
      modal.querySelectorAll("[data-auth-form]").forEach(function (f) {
        f.hidden = f.getAttribute("data-auth-form") !== target;
      });
      setAuthStatus("", false);
    });
  });

  // Close
  document.getElementById("auth-close").addEventListener("click", closeAuthModal);
  document.getElementById("auth-backdrop").addEventListener("click", closeAuthModal);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAuthModal();
  });

  // Sign in
  document.getElementById("auth-signin-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const email    = document.getElementById("auth-email-in").value.trim();
    const password = document.getElementById("auth-pass-in").value;
    setAuthStatus("Signing in…", false);
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error) { setAuthStatus(error.message, true); return; }
    closeAuthModal();
  });

  // Sign up
  document.getElementById("auth-signup-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    const username = document.getElementById("auth-username").value.trim();
    const email    = document.getElementById("auth-email-up").value.trim();
    const password = document.getElementById("auth-pass-up").value;
    setAuthStatus("Creating account…", false);
    const { error } = await db.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (error) { setAuthStatus(error.message, true); return; }
    setAuthStatus("Account created! Check your email to confirm your address.", false);
  });
}

function setAuthStatus(msg, isError) {
  const el = document.getElementById("auth-status");
  if (!el) return;
  el.textContent = msg;
  el.style.color = isError ? "#b91c1c" : "#065f46";
}

function openAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) { modal.hidden = false; }
}

function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.hidden = true;
  setAuthStatus("", false);
}

// ── Header auth slot ──────────────────────────────────────────────────────────

function updateHeaderAuth(session, profile) {
  const slot = document.querySelector("[data-auth-slot]");
  if (!slot) return;

  if (!session) {
    slot.innerHTML = `<button class="btn-auth" id="header-login-btn">Sign in</button>`;
    document.getElementById("header-login-btn").addEventListener("click", openAuthModal);
    return;
  }

  const name    = escapeHtmlAuth(profile?.username || session.user.email);
  const isAdmin = profile?.role === "admin";
  slot.innerHTML = `
    <span class="auth-user-name">
      ${name}${isAdmin ? ' <span class="auth-admin-badge">admin</span>' : ""}
    </span>
    <button class="btn-auth btn-auth-out" id="header-logout-btn">Sign out</button>
  `;
  document.getElementById("header-logout-btn").addEventListener("click", async function () {
    await db.auth.signOut();
  });
}

// ── Auth state listener ───────────────────────────────────────────────────────

db.auth.onAuthStateChange(async function (event, session) {
  window.authState.session = session;
  let profile = null;
  if (session) {
    profile = await fetchProfile(session.user.id);
    window.authState.profile = profile;
  } else {
    window.authState.profile = null;
  }
  updateHeaderAuth(session, profile);
  document.dispatchEvent(new CustomEvent("authstatechange"));
});

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async function () {
  injectAuthModal();

  // Restore session on hard reload (onAuthStateChange may fire before header exists)
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    const profile = await fetchProfile(session.user.id);
    window.authState = { session, profile };
    updateHeaderAuth(session, profile);
  } else {
    updateHeaderAuth(null, null);
  }
});
