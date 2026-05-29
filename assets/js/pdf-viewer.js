pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const PDF_URL =
  "https://ia601504.us.archive.org/0/items/in.ernet.dli.2015.139500/2015.139500.Logic-Techniques-Of-Formal-Reasonong.pdf";
const STORAGE_KEY = "logic-techniques-solutions-by-page-v1";
const SYMBOLS = ["¬", "∧", "∨", "→", "↔", "∀", "∃", "⊢", "⊨", "⊥", "⊤", "□", "◇"];

let pdfDoc = null;
let currentPage = 1;

// ── Storage ──────────────────────────────────────────────────────────────────

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
  const q = document.querySelector("[data-sol-question]");
  const e = document.querySelector("[data-sol-explanation]");
  const a = document.querySelector("[data-sol-answer]");
  const out = document.querySelector("[data-export-out]");
  if (q) q.value = "";
  if (e) e.value = "";
  if (a) a.value = "";
  if (out) out.value = "";
  showStatus("", false);
}

// ── Render helpers ────────────────────────────────────────────────────────────

function renderEntriesPanel(page) {
  const heading = document.querySelector("[data-entries-heading]");
  const list = document.querySelector("[data-entries-list]");
  if (!list) return;

  if (heading) heading.textContent = `Saved for Page ${page}`;

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

function updateNavControls(page) {
  const panelTitle = document.querySelector("[data-panel-title]");
  const goInput = document.querySelector("[data-go-input]");
  const totalPages = document.querySelector("[data-total-pages]");
  const prevLink = document.querySelector("[data-nav-prev]");
  const nextLink = document.querySelector("[data-nav-next]");
  const jumpBack = document.querySelector("[data-nav-jump-back]");
  const jumpForward = document.querySelector("[data-nav-jump-forward]");

  const total = pdfDoc ? pdfDoc.numPages : null;

  if (panelTitle) panelTitle.textContent = `Solutions — Page ${page}`;
  if (goInput) goInput.value = String(page);
  if (totalPages) totalPages.textContent = total ? `of ${total}` : "";

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
  applyLink(nextLink, buildPageUrl(page + 1), total !== null && page >= total);
  applyLink(jumpBack, buildPageUrl(Math.max(1, page - 10)), page <= 1);
  applyLink(
    jumpForward,
    buildPageUrl(total !== null ? Math.min(total, page + 10) : page + 10),
    total !== null && page >= total
  );
}

async function renderPdfPage(page) {
  const canvas = document.querySelector("[data-pdf-canvas]");
  const status = document.querySelector("[data-render-status]");
  if (!canvas || !pdfDoc) return;

  const clamped = Math.max(1, Math.min(page, pdfDoc.numPages));

  if (status) status.textContent = `Loading page ${clamped}…`;

  const pdfPage = await pdfDoc.getPage(clamped);
  const containerWidth =
    canvas.closest(".reader-pdf")?.clientWidth || window.innerWidth * 0.6 || 700;
  const baseViewport = pdfPage.getViewport({ scale: 1 });
  const scale = Math.min(2.5, Math.max(1, containerWidth / baseViewport.width));
  const viewport = pdfPage.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await pdfPage.render({
    canvasContext: canvas.getContext("2d"),
    viewport,
  }).promise;

  if (status) status.textContent = "";
}

// ── Navigation ────────────────────────────────────────────────────────────────

async function gotoPage(pageNum) {
  if (!pdfDoc) return;
  const clamped = Math.max(1, Math.min(pageNum, pdfDoc.numPages));
  currentPage = clamped;

  history.pushState({ page: clamped }, "", buildPageUrl(clamped));

  document.title = `Page ${clamped} — Logic: Techniques of Formal Reasoning`;

  clearForm();
  updateNavControls(clamped);
  renderEntriesPanel(clamped);
  await renderPdfPage(clamped);
}

// ── Event wiring ──────────────────────────────────────────────────────────────

function wireNavLinks() {
  const prevLink = document.querySelector("[data-nav-prev]");
  const nextLink = document.querySelector("[data-nav-next]");
  const jumpBack = document.querySelector("[data-nav-jump-back]");
  const jumpForward = document.querySelector("[data-nav-jump-forward]");

  function interceptLink(el, getTarget) {
    if (!el) return;
    el.addEventListener("click", function (event) {
      if (el.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      gotoPage(getTarget());
    });
  }

  interceptLink(prevLink, () => currentPage - 1);
  interceptLink(nextLink, () => currentPage + 1);
  interceptLink(jumpBack, () => Math.max(1, currentPage - 10));
  interceptLink(
    jumpForward,
    () => (pdfDoc ? Math.min(pdfDoc.numPages, currentPage + 10) : currentPage + 10)
  );
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
    (s) =>
      `<button type="button" class="symbol-btn" data-sym="${s}">${s}</button>`
  ).join("");

  grid.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-sym]");
    if (!btn) return;
    const symbol = btn.getAttribute("data-sym");
    const active = document.activeElement;
    const explanation = document.querySelector("[data-sol-explanation]");
    const answer = document.querySelector("[data-sol-answer]");
    if (active === explanation || active === answer) {
      insertAtCursor(active, symbol);
    } else {
      insertAtCursor(answer, symbol);
    }
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
    const payload = {
      page: currentPage,
      source: "Logic: Techniques of Formal Reasoning",
      entries: getEntries(currentPage),
    };
    out.value = JSON.stringify(payload, null, 2);
    showStatus("JSON exported below.", false);
  });
}

function wirePopState() {
  window.addEventListener("popstate", async function (event) {
    const page =
      event.state?.page ?? getPageFromUrl();
    currentPage = page;
    clearForm();
    updateNavControls(page);
    renderEntriesPanel(page);
    await renderPdfPage(page);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async function () {
  if (!document.querySelector("[data-pdf-canvas]")) return;

  wireNavLinks();
  wireGoForm();
  wireSymbolKeyboard();
  wireSaveEntry();
  wireDeleteEntry();
  wireExport();
  wirePopState();

  const status = document.querySelector("[data-render-status]");
  if (status) status.textContent = "Downloading PDF…";

  try {
    pdfDoc = await pdfjsLib.getDocument({ url: PDF_URL, withCredentials: false }).promise;
  } catch (err) {
    if (status) status.textContent = "Failed to load PDF. Check your connection.";
    return;
  }

  currentPage = getPageFromUrl();
  history.replaceState({ page: currentPage }, "", buildPageUrl(currentPage));
  document.title = `Page ${currentPage} — Logic: Techniques of Formal Reasoning`;

  updateNavControls(currentPage);
  renderEntriesPanel(currentPage);
  await renderPdfPage(currentPage);
});
