Gloriosa – Codex Update Notes

Summary

- Fixed background crash: Turndown and clipboard operations moved from the background service worker to the page context (content script) where `document` exists.
- Implemented message-based clipboard copy from background → content script.
- Injected Turndown into the tab before extraction so Markdown conversion runs in-page.

Why

- Error observed: `ReferenceError: document is not defined` when Turndown ran in the background. Background in MV3 is a service worker without a DOM, while Turndown’s parser expects DOM APIs. The background’s fallback clipboard path also relied on `document`.
- Solution: perform DOM-dependent tasks (HTML→Markdown and copying) in the tab’s context (content script) and keep the background focused on orchestration.

Changes

- gloriosa_background.js

  - Removed Turndown import and initialization in the background.
  - Removed DOM-based `convertToMarkdown` and `copyToClipboard` functions.
  - Inject `lib/readability-0.6.0.js` and `lib/turndown-7.2.1.js` into the tab before the content script.
  - Expect `markdown` in the content script’s response; no longer convert HTML in the background.
  - Added `copyToClipboardInTab(tabId, text)` to request clipboard copy via content script using messages (`COPY_MARKDOWN` → `COPY_RESULT`).

- gloriosa_content.js
  - Create `TurndownService` in the page context and convert `article.content` to Markdown.
  - Include `markdown` in the `CONTENT_EXTRACTED` message back to the background.
  - Add message listener for `COPY_MARKDOWN` to copy text using `navigator.clipboard.writeText` with textarea fallback, then respond with `COPY_RESULT`.

Behavioral impact

- Background no longer touches DOM APIs, avoiding service worker runtime errors.
- Clipboard copy occurs in-page, improving compatibility across sites and avoiding service worker limitations.

Verification steps

- Reload the extension.
- Open any article page and click the toolbar icon.
- Observe success logs in background; Markdown should be on the clipboard.

Notes

- No manifest permissions changed. `clipboardWrite`, `activeTab`, and `scripting` remain sufficient.
- For MV3, only `service_worker` is necessary under `background`; we left the manifest as-is but can simplify it if desired.

---

Follow-up: Markdown Relay

Summary

- Ensure Markdown generated in the content script is relayed to the background so clipboard copy proceeds.

Why

- The content script included `markdown` in the `CONTENT_EXTRACTED` message, but the background’s listener omitted this field when resolving the result. The background then treated the conversion as failed and aborted with “Failed to convert content to Markdown.”

Changes

- gloriosa_background.js
  - In `injectContentScript` message listener, include `markdown: message.markdown` in the resolved object so the service worker receives the converted text.

Behavioral impact

- Prevents false negatives where conversion succeeded in-page but appeared failed in the background.
- Allows clipboard copy to run as intended with the in-page Markdown.

Verification steps

- Reload the extension.
- Click the toolbar icon on an article page.
- Confirm success badge and that Markdown is on the clipboard.
