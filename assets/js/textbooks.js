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
  renderChapterPage();
});
