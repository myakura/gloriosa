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

---

Follow-up: Clipboard Robustness

Summary

- Make clipboard copying resilient when `navigator.clipboard.writeText` fails due to focus or activation requirements by attempting focus and falling back to a textarea + `execCommand('copy')` path.

Why

- Some pages and browser states cause `writeText` to throw (e.g., “Document is not focused”). Previously this surfaced as a hard failure, even though a traditional selection-based copy often succeeds in the page context.

Changes

- gloriosa_content.js
  - In the `COPY_MARKDOWN` handler, try `window.focus()` if `document.hasFocus()` is false before calling `navigator.clipboard.writeText`.
  - If `writeText` throws, fall back to creating a hidden, readonly `<textarea>`, select its value, and call `document.execCommand('copy')`.
  - Report success/failure via `COPY_RESULT`; include a meaningful error only if both methods fail.

Behavioral impact

- Reduces clipboard failures on pages requiring focus or explicit activation.
- Keeps background logic unchanged while improving reliability in the content context.

Verification steps

- Reload the extension.
- Click the toolbar icon on an article page that previously failed with “Document is not focused”.
  - Expect the success badge and Markdown on the clipboard even if `writeText` fails.

---

Follow-up: Clipboard via ExecuteScript

Summary

- Perform clipboard copy by executing `navigator.clipboard.writeText` directly in the page context via `chrome.scripting.executeScript`, mirroring the working pattern from the Miqueliana extension.

Why

- Calling `writeText` from a content-script handler can still fail on some pages with “Document is not focused”. Executing the copy function via `scripting.executeScript` in direct response to the user’s action improves activation/focus semantics and reliability.

Changes

- gloriosa_background.js
  - Replace message-based clipboard copy with `copyToClipboardViaExecuteScript(tabId, text)`.
  - New helper uses `chrome.scripting.executeScript` and returns `{ ok, error }` from the page to the background, throwing if copy fails.

Behavioral impact

- More reliable clipboard writes on pages that previously rejected `writeText` due to focus/activation.
- Keeps conversion in-page and background orchestration unchanged otherwise.

Verification steps

- Reload the extension.
- Trigger on a page that previously failed with “Document is not focused”.
- Expect success badge and Markdown on the clipboard.

---

Follow-up: Manifest Host Permissions

Summary

- Add host permissions so programmatic script execution and clipboard operations have the necessary origin access across sites.

Why

- The clipboard write is executed via `chrome.scripting.executeScript` in the page context. While `activeTab` often suffices after a user gesture, adding `host_permissions: ["<all_urls>"]` aligns with a known-good configuration (as used in the working reference extension) and improves reliability on sites with stricter permission checks.

Changes

- manifest.json
  - Added `"host_permissions": ["<all_urls>"]`.

Behavioral impact

- Ensures the extension has origin access needed for dynamic script injection and clipboard write across domains.

Verification steps

- Reload the extension.
- Visit a few different domains (news site, blog, docs) and click the toolbar icon.
- Confirm Markdown lands on the clipboard without permission prompts or errors.

---

Follow-up: Offscreen Clipboard Fallback

Summary

- Add a robust clipboard pathway using an offscreen document when `navigator.clipboard` is unavailable in the service worker or fails.

Why

- MV3 service workers lack a DOM and often cannot access `navigator.clipboard`. The Offscreen API provides a dedicated, invisible document with DOM access to perform clipboard actions reliably.

Changes

- gloriosa_background.js

  - Added `copyToClipboardSmart(text)` which tries `navigator.clipboard.writeText` in SW, falling back to `copyViaOffscreen(text)`.
  - Implemented `copyViaOffscreen(text)` and `ensureOffscreenDocument(offscreenUrl)` using `chrome.offscreen.createDocument` and `chrome.runtime.getContexts` to detect existing offscreen documents, await result via `OFFSCREEN_COPY_RESULT`, and close the document afterward.
  - Updated main flow to call `copyToClipboardSmart(markdown)`.

- gloriosa_offscreen.html / gloriosa_offscreen.js

  - New offscreen document with a hidden `<textarea>`.
  - Script listens for `OFFSCREEN_COPY_TEXT`, attempts `navigator.clipboard.writeText`, falls back to textarea + `execCommand('copy')`, then posts `OFFSCREEN_COPY_RESULT` back.

- manifest.json
  - Added `"offscreen"` permission and included `gloriosa_offscreen.html` + `gloriosa_offscreen.js` in `web_accessible_resources`.
  - Kept `clipboardWrite` and added `clipboardRead` for broader compatibility.

Behavioral impact

- Clipboard copying becomes reliable even when the service worker cannot access the Clipboard API.

Verification steps

- Reload the extension.
- Trigger the action on various domains.
- Expect the clipboard to be populated and no “Document is not focused” errors.

---

Follow-up: Clipboard Strategy Order

Summary

- Prefer the Offscreen API for clipboard writes and fall back to page-executed `navigator.clipboard.writeText` via `chrome.scripting.executeScript` when Offscreen is unavailable or fails.

Why

- Offscreen documents provide the most reliable environment for clipboard operations in MV3. When Offscreen cannot be used (API not present or site/OS limitations), executing the copy function in the page context remains a solid fallback.

Changes

- gloriosa_background.js
  - Updated `copyToClipboardSmart(text, tabId)` to:
    1) Try `copyViaOffscreen(text)` first.
    2) On failure or if Offscreen is unavailable, call `copyText(tabId, text)` which uses `chrome.scripting.executeScript` + `navigator.clipboard.writeText`.
  - Updated call site to pass `tab.id` into `copyToClipboardSmart`.

Behavioral impact

- Increases success rates across sites and environments by using the most robust path first, with a proven fallback.

Verification steps

- Reload the extension.
- Test across multiple domains; expect clipboard success even if Offscreen is not usable.
