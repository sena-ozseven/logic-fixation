async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  return response.json();
}

function buildChapterUrl(bookSlug, chapterSlug) {
  return `/textbooks/${bookSlug}/chapter.html?book=${encodeURIComponent(bookSlug)}&chapter=${encodeURIComponent(chapterSlug)}`;
}

async function renderBookPage() {
  const tocTarget = document.querySelector("[data-toc-list]");
  if (!tocTarget) {
    return;
  }

  const book = await fetchJson("/content/textbooks/logic-techniques-of-formal-reasoning/book.json");
  const items = book.chapters
    .map(function toItem(chapter) {
      const href = buildChapterUrl(book.slug, chapter.slug);
      return `<li><a href="${href}">Chapter ${chapter.number}: ${chapter.title}</a> <span class="muted">(${chapter.status})</span></li>`;
    })
    .join("");

  tocTarget.innerHTML = items;
}

const PDF_URL = "https://ia601504.us.archive.org/0/items/in.ernet.dli.2015.139500/2015.139500.Logic-Techniques-Of-Formal-Reasonong.pdf";
const PAGE_STORAGE_KEY = "logic-techniques-solutions-by-page-v1";
const PAGE_SYMBOLS = ["¬", "∧", "∨", "→", "↔", "∀", "∃", "⊢", "⊨", "⊥", "⊤", "□", "◇"];

function readPageStorage() {
  try {
    const raw = localStorage.getItem(PAGE_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch (error) {
    return {};
  }
}

function writePageStorage(data) {
  localStorage.setItem(PAGE_STORAGE_KEY, JSON.stringify(data));
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setupEmbeddedBookWorkspace() {
  const frame = document.querySelector("[data-pdf-frame]");
  const pageInput = document.querySelector("[data-page-input]");
  const pageStatus = document.querySelector("[data-page-status]");
  const prevButton = document.querySelector("[data-page-prev]");
  const nextButton = document.querySelector("[data-page-next]");
  const jumpBackButton = document.querySelector("[data-page-jump-back]");
  const jumpForwardButton = document.querySelector("[data-page-jump-forward]");
  const goButton = document.querySelector("[data-page-go]");
  const questionInput = document.querySelector("[data-solution-question]");
  const explanationInput = document.querySelector("[data-solution-explanation]");
  const answerInput = document.querySelector("[data-solution-answer]");
  const addSolutionButton = document.querySelector("[data-page-add-solution]");
  const exportButton = document.querySelector("[data-page-export]");
  const exportOutput = document.querySelector("[data-page-export-output]");
  const entriesTarget = document.querySelector("[data-page-entries]");
  const entriesTitle = document.querySelector("[data-page-entries-title]");
  const symbolGrid = document.querySelector("[data-page-symbol-grid]");
  const statusTarget = document.querySelector("[data-page-panel-status]");

  if (
    !frame ||
    !pageInput ||
    !pageStatus ||
    !prevButton ||
    !nextButton ||
    !jumpBackButton ||
    !jumpForwardButton ||
    !goButton ||
    !questionInput ||
    !explanationInput ||
    !answerInput ||
    !addSolutionButton ||
    !exportButton ||
    !exportOutput ||
    !entriesTarget ||
    !entriesTitle ||
    !symbolGrid ||
    !statusTarget
  ) {
    return;
  }

  let currentPage = 1;

  function showStatus(message, isError) {
    statusTarget.textContent = message;
    statusTarget.style.color = isError ? "#b91c1c" : "#065f46";
  }

  function insertAtCursor(textarea, symbol) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    textarea.value = value.slice(0, start) + symbol + value.slice(end);
    const cursor = start + symbol.length;
    textarea.selectionStart = cursor;
    textarea.selectionEnd = cursor;
    textarea.focus();
  }

  symbolGrid.innerHTML = PAGE_SYMBOLS.map(function toSymbolButton(symbol) {
    return `<button type="button" class="symbol-btn" data-page-symbol="${symbol}">${symbol}</button>`;
  }).join("");

  symbolGrid.addEventListener("click", function onSymbolClick(event) {
    const button = event.target.closest("[data-page-symbol]");
    if (!button) {
      return;
    }

    const active = document.activeElement;
    if (active === explanationInput || active === answerInput) {
      insertAtCursor(active, button.getAttribute("data-page-symbol"));
      return;
    }

    insertAtCursor(answerInput, button.getAttribute("data-page-symbol"));
  });

  function getEntriesForCurrentPage() {
    const storage = readPageStorage();
    const key = String(currentPage);
    return Array.isArray(storage[key]) ? storage[key] : [];
  }

  function renderEntries() {
    const entries = getEntriesForCurrentPage();
    entriesTitle.textContent = `Saved Entries For Page ${currentPage}`;
    if (!entries.length) {
      entriesTarget.innerHTML = "<p class=\"muted\">No saved entries for this page yet.</p>";
      return;
    }

    entriesTarget.innerHTML = entries
      .map(function toEntryHtml(entry, index) {
        return `
          <article class="card">
            <h4>Entry ${index + 1}</h4>
            <p><strong>Question:</strong> ${escapeHtml(entry.question)}</p>
            <p><strong>Explanation:</strong> ${escapeHtml(entry.explanation)}</p>
            <p><strong>Answer:</strong> ${escapeHtml(entry.answer)}</p>
            <div class="entry-actions">
              <button type="button" data-entry-delete="${index}">Delete Entry</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function refreshViewer() {
    // Hide built-in toolbar where supported so page control stays in one place.
    frame.src = `${PDF_URL}#page=${currentPage}&toolbar=0&navpanes=0&view=FitH`;
    pageInput.value = String(currentPage);
    pageStatus.textContent = `Page ${currentPage}`;
    exportOutput.value = "";
    questionInput.value = "";
    explanationInput.value = "";
    answerInput.value = "";
    renderEntries();
  }

  function setPage(pageNumber) {
    const nextPage = Number(pageNumber);
    if (!Number.isInteger(nextPage) || nextPage < 1) {
      showStatus("Please enter a valid page number (1 or above).", true);
      return;
    }
    currentPage = nextPage;
    refreshViewer();
    showStatus("Page updated.", false);
  }

  prevButton.addEventListener("click", function onPrev() {
    if (currentPage > 1) {
      currentPage -= 1;
      refreshViewer();
      showStatus("Moved to previous page.", false);
    }
  });

  nextButton.addEventListener("click", function onNext() {
    currentPage += 1;
    refreshViewer();
    showStatus("Moved to next page.", false);
  });

  jumpBackButton.addEventListener("click", function onJumpBack() {
    const targetPage = Math.max(1, currentPage - 10);
    currentPage = targetPage;
    refreshViewer();
    showStatus("Moved back by 10 pages.", false);
  });

  jumpForwardButton.addEventListener("click", function onJumpForward() {
    currentPage += 10;
    refreshViewer();
    showStatus("Moved forward by 10 pages.", false);
  });

  goButton.addEventListener("click", function onGo() {
    setPage(pageInput.value);
  });

  pageInput.addEventListener("keydown", function onEnter(event) {
    if (event.key === "Enter") {
      setPage(pageInput.value);
    }
  });

  pageInput.addEventListener("blur", function onBlur() {
    if (pageInput.value.trim()) {
      setPage(pageInput.value);
    }
  });

  addSolutionButton.addEventListener("click", function onAddSolution() {
    const question = questionInput.value.trim();
    const explanation = explanationInput.value.trim();
    const answer = answerInput.value.trim();

    if (!question || !explanation || !answer) {
      showStatus("Question, explanation, and answer are all required.", true);
      return;
    }

    const storage = readPageStorage();
    const key = String(currentPage);
    const entries = Array.isArray(storage[key]) ? storage[key] : [];
    entries.push({ question, explanation, answer });
    storage[key] = entries;
    writePageStorage(storage);

    questionInput.value = "";
    explanationInput.value = "";
    answerInput.value = "";
    renderEntries();
    showStatus(`Saved entry for page ${currentPage}.`, false);
  });

  entriesTarget.addEventListener("click", function onDeleteEntry(event) {
    const button = event.target.closest("[data-entry-delete]");
    if (!button) {
      return;
    }

    const index = Number(button.getAttribute("data-entry-delete"));
    const storage = readPageStorage();
    const key = String(currentPage);
    const entries = Array.isArray(storage[key]) ? storage[key] : [];
    if (!Number.isInteger(index) || index < 0 || index >= entries.length) {
      return;
    }

    entries.splice(index, 1);
    storage[key] = entries;
    writePageStorage(storage);
    renderEntries();
    showStatus(`Deleted entry ${index + 1} on page ${currentPage}.`, false);
  });

  exportButton.addEventListener("click", function onExport() {
    const entries = getEntriesForCurrentPage();
    const payload = {
      page: currentPage,
      source: "Logic: Techniques of Formal Reasoning",
      entries
    };
    exportOutput.value = JSON.stringify(payload, null, 2);
    showStatus("Page JSON exported below.", false);
  });

  refreshViewer();
}

function getQueryValue(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

async function renderChapterPage() {
  const chapterTarget = document.querySelector("[data-chapter-view]");
  if (!chapterTarget) {
    return;
  }

  const book = getQueryValue("book");
  const chapter = getQueryValue("chapter");
  if (!book || !chapter) {
    chapterTarget.innerHTML = "<p>Book or chapter is missing in URL parameters.</p>";
    return;
  }

  const chapterPath = `/content/textbooks/${book}/chapters/${chapter}.json`;
  try {
    const payload = await fetchJson(chapterPath);
    const answerHtml = payload.answers
      .map(function toBlock(answer) {
        return `<article class="card"><h3>${answer.question}</h3><p>${answer.explanation}</p><p><strong>Answer:</strong> ${answer.answer}</p></article>`;
      })
      .join("");

    chapterTarget.innerHTML = `
      <h1>Chapter ${payload.number}: ${payload.title}</h1>
      <p>${payload.summary}</p>
      <h2>Explanations and Answers</h2>
      ${answerHtml || "<p>No answers added yet.</p>"}
      <p><a href="/textbooks/logic-techniques-of-formal-reasoning/">Back to textbook contents</a></p>
    `;
  } catch (error) {
    chapterTarget.innerHTML = "<p>Unable to load chapter content yet.</p>";
  }
}

document.addEventListener("DOMContentLoaded", function onLoad() {
  renderBookPage();
  setupEmbeddedBookWorkspace();
  renderChapterPage();
});
