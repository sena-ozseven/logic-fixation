const LOGIC_SYMBOLS = ["¬", "∧", "∨", "→", "↔", "∀", "∃", "⊢", "⊨", "⊥", "⊤", "□", "◇"];

function insertAtCursor(textarea, text) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  textarea.value = value.slice(0, start) + text + value.slice(end);
  const cursor = start + text.length;
  textarea.selectionStart = cursor;
  textarea.selectionEnd = cursor;
  textarea.focus();
}

async function fetchBookData() {
  const response = await fetch("/content/textbooks/logic-techniques-of-formal-reasoning/book.json");
  if (!response.ok) {
    throw new Error("Book data unavailable");
  }
  return response.json();
}

function setupSymbolKeyboard() {
  const grid = document.querySelector("[data-symbol-grid]");
  const explanation = document.querySelector("[data-explanation]");
  const answer = document.querySelector("[data-answer]");
  if (!grid || !explanation || !answer) {
    return;
  }

  grid.innerHTML = LOGIC_SYMBOLS.map(function toButton(symbol) {
    return `<button type="button" class="symbol-btn" data-symbol="${symbol}">${symbol}</button>`;
  }).join("");

  grid.addEventListener("click", function onSymbolClick(event) {
    const target = event.target.closest("[data-symbol]");
    if (!target) {
      return;
    }

    const active = document.activeElement;
    if (active === explanation || active === answer) {
      insertAtCursor(active, target.getAttribute("data-symbol"));
      return;
    }

    insertAtCursor(answer, target.getAttribute("data-symbol"));
  });
}

function setStatus(message, isError) {
  const status = document.querySelector("[data-admin-status]");
  if (!status) {
    return;
  }

  status.textContent = message;
  status.style.color = isError ? "#b91c1c" : "#065f46";
}

function setupExportActions() {
  const chapter = document.querySelector("[data-chapter-select]");
  const question = document.querySelector("[data-question]");
  const explanation = document.querySelector("[data-explanation]");
  const answer = document.querySelector("[data-answer]");
  const output = document.querySelector("[data-output]");
  const exportButton = document.querySelector("[data-export]");
  const copyButton = document.querySelector("[data-copy]");

  if (!chapter || !question || !explanation || !answer || !output || !exportButton || !copyButton) {
    return;
  }

  exportButton.addEventListener("click", function onExport() {
    if (!question.value.trim() || !explanation.value.trim() || !answer.value.trim()) {
      setStatus("Please fill question, explanation, and answer before generating.", true);
      return;
    }

    const payload = {
      chapterSlug: chapter.value,
      answerEntry: {
        question: question.value.trim(),
        explanation: explanation.value.trim(),
        answer: answer.value.trim()
      }
    };

    output.value = JSON.stringify(payload, null, 2);
    setStatus("Snippet generated. Copy and paste into the chapter JSON file.", false);
  });

  copyButton.addEventListener("click", async function onCopy() {
    if (!output.value.trim()) {
      setStatus("Generate a snippet first.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(output.value);
      setStatus("Snippet copied to clipboard.", false);
    } catch (error) {
      setStatus("Could not copy automatically. Please copy manually.", true);
    }
  });
}

async function populateChapterSelect() {
  const select = document.querySelector("[data-chapter-select]");
  if (!select) {
    return;
  }

  try {
    const book = await fetchBookData();
    select.innerHTML = book.chapters
      .map(function toOption(chapter) {
        return `<option value="${chapter.slug}">Chapter ${chapter.number}: ${chapter.title}</option>`;
      })
      .join("");
  } catch (error) {
    select.innerHTML = "<option>Unable to load chapters</option>";
    setStatus("Failed to load chapter list from book JSON.", true);
  }
}

document.addEventListener("DOMContentLoaded", function onReady() {
  setupSymbolKeyboard();
  setupExportActions();
  populateChapterSelect();
});
