# Philosophical Logic Notes

Minimal vanilla HTML/CSS/JS website for philosophical logic content with a scalable textbook data structure.

## Current Routes

- `/homepage/`
- `/about/`
- `/textbooks/`
- `/textbooks/logic-techniques-of-formal-reasoning/`
- `/textbooks/logic-techniques-of-formal-reasoning/chapter.html?book=logic-techniques-of-formal-reasoning&chapter=chapter-01`
- `/contact/`
- `/admin/` (local publishing helper)

## Content Structure

- Book metadata: `content/textbooks/<book-slug>/book.json`
- Chapter files: `content/textbooks/<book-slug>/chapters/chapter-xx.json`

`book.json` controls the textbook table of contents and chapter ordering.

Each chapter file uses this schema:

```json
{
  "number": 1,
  "slug": "chapter-01",
  "title": "Chapter Title",
  "summary": "Short chapter description",
  "answers": [
    {
      "question": "Question text",
      "explanation": "Explanation text",
      "answer": "Final answer text"
    }
  ]
}
```

## Add a New Textbook

1. Create `content/textbooks/<new-book-slug>/book.json`.
2. Create `content/textbooks/<new-book-slug>/chapters/` with chapter JSON files.
3. Add a link card to `textbooks/index.html`.
4. Add a book route directory at `textbooks/<new-book-slug>/`:
   - `index.html` for TOC
   - `chapter.html` for chapter view
5. Reuse `assets/js/textbooks.js` rendering pattern.

## Admin Publishing Workflow (v1)

`/admin/` is local-only and has no authentication in this phase.

1. Select chapter.
2. Write question, explanation, and answer (using logic symbol keyboard).
3. Click **Generate JSON Snippet**.
4. Copy snippet and paste the answer entry into the corresponding chapter file under `content/textbooks/.../chapters/`.

## Scalability Notes

- Keep shared UI in `assets/js/site.js` and `assets/css/base.css`.
- Prefer data updates in JSON over direct HTML duplication.
- Add future auth/backend only around `/admin/` while keeping public pages static.
