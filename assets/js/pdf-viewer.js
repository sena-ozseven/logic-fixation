const PDF_URL =
  "https://ia601504.us.archive.org/0/items/in.ernet.dli.2015.139500/2015.139500.Logic-Techniques-Of-Formal-Reasonong.pdf";
const STORAGE_KEY = "logic-techniques-solutions-by-page-v1";
const SYMBOLS = ["¬", "∧", "∨", "→", "↔", "∀", "∃", "⊢", "⊨", "⊥", "⊤", "□", "◇"];

let currentPage = 1;

// ── Storage ───────────────────────────────────────────────────────────────────

function readStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getEntries(page) {
  const storage = readStorage();
  const entries = storage[String(page)];
  return Array.isArray(entries) ? entries : [];
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function getPageFromUrl() {
  const p = new URLSearchParams(window.location.search).get("p");
  const n = parseInt(p, 10);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

function buildPageUrl(pageNum) {
  const url = new URL(window.location.href);
  url.searchParams.set("p", String(pageNum));
  return url.toString();
}

function buildPdfSrc(pageNum) {
  return `${PDF_URL}#page=${pageNum}&toolbar=0&navpanes=0&view=FitH`;
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function insertAtCursor(textarea, symbol) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  textarea.value =
    textarea.value.slice(0, start) + symbol + textarea.value.slice(end);
  const cursor = start + symbol.length;
  textarea.selectionStart = cursor;
  textarea.selectionEnd = cursor;
  textarea.focus();
}

function showStatus(message, isError) {
  const target = document.querySelector("[data-panel-status]");
  if (!target) return;
  target.textContent = message;
  target.style.color = isError ? "#b91c1c" : "#065f46";
}

function clearForm() {
  const fields = ["[data-sol-question]", "[data-sol-explanation]", "[data-sol-answer]", "[data-export-out]"];
  fields.forEach(function (sel) {
    const el = document.querySelector(sel);
    if (el) el.value = "";
  });
  showStatus("", false);
}

// ── Render panel ──────────────────────────────────────────────────────────────

function renderEntriesPanel(page) {
  const heading = document.querySelector("[data-entries-heading]");
  const list = document.querySelector("[data-entries-list]");
  const panelTitle = document.querySelector("[data-panel-title]");
  if (heading) heading.textContent = `Saved for Page ${page}`;
  if (panelTitle) panelTitle.textContent = `Solutions — Page ${page}`;

  if (!list) return;
  const entries = getEntries(page);
  if (!entries.length) {
    list.innerHTML = '<p class="muted">No entries for this page yet.</p>';
    return;
  }
  list.innerHTML = entries
    .map(
      (entry, i) => `
      <article class="card">
        <h4>Entry ${i + 1}</h4>
        <p><strong>Question:</strong> ${escapeHtml(entry.question)}</p>
        <p><strong>Explanation:</strong> ${escapeHtml(entry.explanation)}</p>
        <p><strong>Answer:</strong> ${escapeHtml(entry.answer)}</p>
        <div class="entry-actions">
          <button type="button" data-delete-entry="${i}">Delete</button>
        </div>
      </article>`
    )
    .join("");
}

// ── Navigation controls ───────────────────────────────────────────────────────

function updateNavControls(page) {
  const goInput = document.querySelector("[data-go-input]");
  const pageLabel = document.querySelector("[data-page-label]");
  const prevLink = document.querySelector("[data-nav-prev]");
  const nextLink = document.querySelector("[data-nav-next]");
  const jumpBack = document.querySelector("[data-nav-jump-back]");
  const jumpForward = document.querySelector("[data-nav-jump-forward]");

  if (goInput) goInput.value = String(page);
  if (pageLabel) pageLabel.textContent = `Page ${page}`;

  function applyLink(el, href, disabled) {
    if (!el) return;
    if (disabled) {
      el.removeAttribute("href");
      el.setAttribute("aria-disabled", "true");
      el.style.opacity = "0.35";
      el.style.pointerEvents = "none";
    } else {
      el.href = href;
      el.removeAttribute("aria-disabled");
      el.style.opacity = "";
      el.style.pointerEvents = "";
    }
  }

  applyLink(prevLink, buildPageUrl(page - 1), page <= 1);
  applyLink(nextLink, buildPageUrl(page + 1), false);
  applyLink(jumpBack, buildPageUrl(Math.max(1, page - 10)), page <= 1);
  applyLink(jumpForward, buildPageUrl(page + 10), false);
}

function refreshPdfFrame(page) {
  const frame = document.querySelector("[data-pdf-frame]");
  if (!frame) return;
  frame.src = buildPdfSrc(page);
}

// ── Core navigate ─────────────────────────────────────────────────────────────

function gotoPage(pageNum) {
  const target = Math.max(1, pageNum);
  currentPage = target;

  history.pushState({ page: target }, "", buildPageUrl(target));
  document.title = `Page ${target} — Logic: Techniques of Formal Reasoning`;

  refreshPdfFrame(target);
  clearForm();
  updateNavControls(target);
  renderEntriesPanel(target);
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function wireNavLinks() {
  const links = {
    "[data-nav-prev]": () => currentPage - 1,
    "[data-nav-next]": () => currentPage + 1,
    "[data-nav-jump-back]": () => Math.max(1, currentPage - 10),
    "[data-nav-jump-forward]": () => currentPage + 10,
  };

  Object.entries(links).forEach(function ([sel, getTarget]) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.addEventListener("click", function (event) {
      if (el.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      gotoPage(getTarget());
    });
  });
}

function wireGoForm() {
  const form = document.querySelector("[data-go-form]");
  if (!form) return;
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const input = form.querySelector("[data-go-input]");
    const target = parseInt(input.value, 10);
    if (Number.isInteger(target) && target >= 1) {
      gotoPage(target);
    }
  });
}

function wireSymbolKeyboard() {
  const grid = document.querySelector("[data-sym-grid]");
  if (!grid) return;
  grid.innerHTML = SYMBOLS.map(
    (s) => `<button type="button" class="symbol-btn" data-sym="${s}">${s}</button>`
  ).join("");

  grid.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-sym]");
    if (!btn) return;
    const symbol = btn.getAttribute("data-sym");
    const active = document.activeElement;
    const explanation = document.querySelector("[data-sol-explanation]");
    const answer = document.querySelector("[data-sol-answer]");
    insertAtCursor(active === explanation || active === answer ? active : answer, symbol);
  });
}

function wireSaveEntry() {
  const btn = document.querySelector("[data-save-entry]");
  if (!btn) return;
  btn.addEventListener("click", function () {
    const q = document.querySelector("[data-sol-question]")?.value.trim();
    const e = document.querySelector("[data-sol-explanation]")?.value.trim();
    const a = document.querySelector("[data-sol-answer]")?.value.trim();
    if (!q || !e || !a) {
      showStatus("Question, explanation, and answer are all required.", true);
      return;
    }
    const storage = readStorage();
    const key = String(currentPage);
    const entries = Array.isArray(storage[key]) ? storage[key] : [];
    entries.push({ question: q, explanation: e, answer: a });
    storage[key] = entries;
    writeStorage(storage);
    clearForm();
    renderEntriesPanel(currentPage);
    showStatus(`Entry saved for page ${currentPage}.`, false);
  });
}

function wireDeleteEntry() {
  const list = document.querySelector("[data-entries-list]");
  if (!list) return;
  list.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-delete-entry]");
    if (!btn) return;
    const index = parseInt(btn.getAttribute("data-delete-entry"), 10);
    const storage = readStorage();
    const key = String(currentPage);
    const entries = Array.isArray(storage[key]) ? storage[key] : [];
    if (!Number.isInteger(index) || index < 0 || index >= entries.length) return;
    entries.splice(index, 1);
    storage[key] = entries;
    writeStorage(storage);
    renderEntriesPanel(currentPage);
    showStatus(`Deleted entry ${index + 1} on page ${currentPage}.`, false);
  });
}

function wireExport() {
  const btn = document.querySelector("[data-export-page]");
  const out = document.querySelector("[data-export-out]");
  if (!btn || !out) return;
  btn.addEventListener("click", function () {
    out.value = JSON.stringify(
      { page: currentPage, source: "Logic: Techniques of Formal Reasoning", entries: getEntries(currentPage) },
      null,
      2
    );
    showStatus("JSON exported below.", false);
  });
}

function wirePopState() {
  window.addEventListener("popstate", function (event) {
    const page = event.state?.page ?? getPageFromUrl();
    currentPage = page;
    refreshPdfFrame(page);
    clearForm();
    updateNavControls(page);
    renderEntriesPanel(page);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  if (!document.querySelector("[data-pdf-frame]")) return;

  wireNavLinks();
  wireGoForm();
  wireSymbolKeyboard();
  wireSaveEntry();
  wireDeleteEntry();
  wireExport();
  wirePopState();

  currentPage = getPageFromUrl();
  history.replaceState({ page: currentPage }, "", buildPageUrl(currentPage));
  document.title = `Page ${currentPage} — Logic: Techniques of Formal Reasoning`;

  refreshPdfFrame(currentPage);
  updateNavControls(currentPage);
  renderEntriesPanel(currentPage);
});
