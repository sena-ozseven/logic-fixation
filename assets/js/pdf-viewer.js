const TOTAL_PAGES = 354;
const PAGES_BASE = "/content/textbooks/logic-techniques-of-formal-reasoning/pages/";
const STORAGE_KEY = "logic-techniques-solutions-by-page-v1";

const SYMBOLS = [
  { sym: "¬", tip: "Negation" },
  { sym: "∧", tip: "Conjunction (and)" },
  { sym: "∨", tip: "Disjunction (or)" },
  { sym: "→", tip: "Conditional (if…then)" },
  { sym: "↔", tip: "Biconditional (iff)" },
  { sym: "∀", tip: "Universal quantifier" },
  { sym: "∃", tip: "Existential quantifier" },
  { sym: "⊢", tip: "Turnstile (proves)" },
  { sym: "⊨", tip: "Semantic consequence" },
  { sym: "⊥", tip: "Contradiction / False" },
  { sym: "⊤", tip: "Tautology / True" },
  { sym: "□", tip: "Necessity (modal)" },
  { sym: "◇", tip: "Possibility (modal)" },
];

let currentPage = 1;

// ── Page image URL ────────────────────────────────────────────────────────────

function buildImageSrc(pageNum) {
  const padded = String(pageNum).padStart(3, "0");
  return `${PAGES_BASE}page-${padded}.jpg`;
}

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
  return Number.isInteger(n) && n >= 1 && n <= TOTAL_PAGES ? n : 1;
}

function buildPageUrl(pageNum) {
  const url = new URL(window.location.href);
  url.searchParams.set("p", String(pageNum));
  return url.toString();
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
  ["[data-sol-question]", "[data-sol-explanation]", "[data-sol-answer]"].forEach(
    function (sel) {
      const el = document.querySelector(sel);
      if (el) el.value = "";
    }
  );
  const exportOut = document.querySelector("[data-export-out]");
  if (exportOut) exportOut.value = "";
  closeNewEntryForm();
  showStatus("", false);
}

// ── Render panel ──────────────────────────────────────────────────────────────

function renderEntriesPanel(page) {
  const heading = document.querySelector("[data-entries-heading]");
  const list = document.querySelector("[data-entries-list]");
  const panelTitle = document.querySelector("[data-panel-title]");
  const pageLabel = document.querySelector("[data-page-label]");

  if (heading) heading.textContent = `Saved — Page ${page}`;
  if (panelTitle) panelTitle.textContent = `Solutions — Page ${page}`;
  if (pageLabel) pageLabel.textContent = `Page ${page} of ${TOTAL_PAGES}`;

  if (!list) return;
  const entries = getEntries(page);

  if (!entries.length) {
    list.innerHTML =
      '<p class="muted" style="font-size:0.825rem;">No entries for this page yet.</p>';
    return;
  }

  list.innerHTML = entries
    .map(function (entry, i) {
      const preview =
        entry.question.length > 48
          ? entry.question.slice(0, 48) + "…"
          : entry.question;
      return `
        <div class="entry-item" data-entry-item="${i}">
          <div class="entry-summary" data-entry-toggle="${i}">
            <span class="entry-summary-text">Q: ${escapeHtml(preview)}</span>
            <span class="entry-toggle-icon">▸</span>
          </div>
          <div class="entry-detail" id="entry-detail-${i}">
            <p><strong>Question:</strong> ${escapeHtml(entry.question)}</p>
            <p><strong>Explanation:</strong> ${escapeHtml(entry.explanation)}</p>
            <p><strong>Answer:</strong> ${escapeHtml(entry.answer)}</p>
            <button type="button" class="entry-delete-btn" data-delete-entry="${i}">Delete entry</button>
          </div>
        </div>`;
    })
    .join("");
}

// ── Navigation controls ───────────────────────────────────────────────────────

function updateNavControls(page) {
  const goInput = document.querySelector("[data-go-input]");
  const prevLink = document.querySelector("[data-nav-prev]");
  const nextLink = document.querySelector("[data-nav-next]");
  const jumpBack = document.querySelector("[data-nav-jump-back]");
  const jumpForward = document.querySelector("[data-nav-jump-forward]");

  if (goInput) goInput.value = String(page);

  function applyLink(el, href, disabled) {
    if (!el) return;
    if (disabled) {
      el.removeAttribute("href");
      el.setAttribute("aria-disabled", "true");
    } else {
      el.href = href;
      el.removeAttribute("aria-disabled");
    }
  }

  applyLink(prevLink, buildPageUrl(page - 1), page <= 1);
  applyLink(nextLink, buildPageUrl(page + 1), page >= TOTAL_PAGES);
  applyLink(jumpBack, buildPageUrl(Math.max(1, page - 10)), page <= 1);
  applyLink(jumpForward, buildPageUrl(Math.min(TOTAL_PAGES, page + 10)), page >= TOTAL_PAGES);
}

function refreshPageImage(page) {
  const img = document.querySelector("[data-page-img]");
  if (!img) return;
  img.src = buildImageSrc(page);
  img.alt = `Page ${page} of ${TOTAL_PAGES} — Logic: Techniques of Formal Reasoning`;

  // Preload next page
  if (page < TOTAL_PAGES) {
    const preload = new Image();
    preload.src = buildImageSrc(page + 1);
  }
}

// ── Core navigate ─────────────────────────────────────────────────────────────

function gotoPage(pageNum) {
  const target = Math.max(1, Math.min(TOTAL_PAGES, pageNum));
  currentPage = target;

  history.pushState({ page: target }, "", buildPageUrl(target));
  document.title = `Page ${target} of ${TOTAL_PAGES} — Logic: Techniques of Formal Reasoning`;

  refreshPageImage(target);
  clearForm();
  updateNavControls(target);
  renderEntriesPanel(target);

  // Scroll to top of page image on navigation
  const imgEl = document.querySelector("[data-page-img]");
  if (imgEl) imgEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function wireNavLinks() {
  const defs = {
    "[data-nav-prev]": () => currentPage - 1,
    "[data-nav-next]": () => currentPage + 1,
    "[data-nav-jump-back]": () => Math.max(1, currentPage - 10),
    "[data-nav-jump-forward]": () => Math.min(TOTAL_PAGES, currentPage + 10),
  };
  Object.entries(defs).forEach(function ([sel, getTarget]) {
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
    if (Number.isInteger(target) && target >= 1 && target <= TOTAL_PAGES) {
      gotoPage(target);
    }
  });
}

function wireSymbolKeyboard() {
  const grid = document.querySelector("[data-sym-grid]");
  if (!grid) return;

  grid.innerHTML = SYMBOLS.map(function ({ sym, tip }) {
    return `<button type="button" class="symbol-btn" data-sym="${sym}" data-tip="${tip}" title="${tip}">${sym}</button>`;
  }).join("");

  grid.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-sym]");
    if (!btn) return;
    const symbol = btn.getAttribute("data-sym");
    const active = document.activeElement;
    const explanation = document.querySelector("[data-sol-explanation]");
    const answer = document.querySelector("[data-sol-answer]");
    insertAtCursor(
      active === explanation || active === answer ? active : answer,
      symbol
    );
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
    closeNewEntryForm();
    renderEntriesPanel(currentPage);
    showStatus(`Entry saved for page ${currentPage}.`, false);
  });
}

function wireEntryInteractions() {
  const list = document.querySelector("[data-entries-list]");
  if (!list) return;

  list.addEventListener("click", function (event) {
    const toggleBtn = event.target.closest("[data-entry-toggle]");
    if (toggleBtn) {
      const index = toggleBtn.getAttribute("data-entry-toggle");
      const detail = document.getElementById(`entry-detail-${index}`);
      const icon = toggleBtn.querySelector(".entry-toggle-icon");
      if (detail) {
        detail.classList.toggle("open");
        if (icon) icon.textContent = detail.classList.contains("open") ? "▾" : "▸";
      }
      return;
    }

    const deleteBtn = event.target.closest("[data-delete-entry]");
    if (deleteBtn) {
      const index = parseInt(deleteBtn.getAttribute("data-delete-entry"), 10);
      const storage = readStorage();
      const key = String(currentPage);
      const entries = Array.isArray(storage[key]) ? storage[key] : [];
      if (!Number.isInteger(index) || index < 0 || index >= entries.length) return;
      entries.splice(index, 1);
      storage[key] = entries;
      writeStorage(storage);
      renderEntriesPanel(currentPage);
      showStatus(`Deleted entry ${index + 1} on page ${currentPage}.`, false);
    }
  });
}

function wireNewEntryToggle() {
  const toggleBtn = document.querySelector("[data-new-entry-toggle]");
  const body = document.querySelector("[data-new-entry-body]");
  if (!toggleBtn || !body) return;
  toggleBtn.addEventListener("click", function () {
    const isOpen = body.classList.toggle("open");
    toggleBtn.textContent = isOpen ? "− New Entry" : "+ New Entry";
  });
}

function closeNewEntryForm() {
  const body = document.querySelector("[data-new-entry-body]");
  const toggleBtn = document.querySelector("[data-new-entry-toggle]");
  if (body) body.classList.remove("open");
  if (toggleBtn) toggleBtn.textContent = "+ New Entry";
}

function wireExport() {
  const toggleBtn = document.querySelector("[data-export-toggle]");
  const exportBody = document.querySelector("[data-export-body]");
  const generateBtn = document.querySelector("[data-export-page]");
  const out = document.querySelector("[data-export-out]");

  if (toggleBtn && exportBody) {
    toggleBtn.addEventListener("click", function () {
      const isOpen = exportBody.classList.toggle("open");
      toggleBtn.textContent = isOpen ? "Export page JSON ▾" : "Export page JSON ▸";
    });
  }

  if (generateBtn && out) {
    generateBtn.addEventListener("click", function () {
      out.value = JSON.stringify(
        {
          page: currentPage,
          source: "Logic: Techniques of Formal Reasoning",
          entries: getEntries(currentPage),
        },
        null,
        2
      );
    });
  }
}

function wirePopState() {
  window.addEventListener("popstate", function (event) {
    const page = event.state?.page ?? getPageFromUrl();
    currentPage = page;
    refreshPageImage(page);
    clearForm();
    updateNavControls(page);
    renderEntriesPanel(page);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function () {
  if (!document.querySelector("[data-page-img]")) return;

  wireNavLinks();
  wireGoForm();
  wireNewEntryToggle();
  wireSymbolKeyboard();
  wireSaveEntry();
  wireEntryInteractions();
  wireExport();
  wirePopState();

  currentPage = getPageFromUrl();
  history.replaceState({ page: currentPage }, "", buildPageUrl(currentPage));
  document.title = `Page ${currentPage} of ${TOTAL_PAGES} — Logic: Techniques of Formal Reasoning`;

  refreshPageImage(currentPage);
  updateNavControls(currentPage);
  renderEntriesPanel(currentPage);
});
