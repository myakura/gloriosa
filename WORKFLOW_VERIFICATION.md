# End-to-End Workflow Verification

This document describes the complete workflow coordination and how to verify it works correctly.

## Workflow Steps

The extension follows this complete workflow:

1. **User Action**: User clicks the browser action button
2. **Loading State**: Badge shows "..." with blue background
3. **Script Injection**: 
   - Background script sets up message listener (avoiding race condition)
   - Readability.js library is injected into the active tab
   - Content script (gloriosa_content.js) is injected
4. **Content Extraction**: 
   - Content script executes immediately upon injection
   - Clones the document to avoid modifying the page
   - Uses Readability.js to extract main content
   - Sends result back to background script via chrome.runtime.sendMessage
5. **Message Passing**: 
   - Background script receives CONTENT_EXTRACTED message
   - Validates the extraction was successful
6. **Markdown Conversion**: 
   - Background script converts HTML to Markdown using Turndown.js
   - Adds title as H1 if not already present
   - Cleans up excessive whitespace
7. **Clipboard Operation**: 
   - Copies Markdown to clipboard using navigator.clipboard.writeText
   - Falls back to document.execCommand if clipboard API unavailable
8. **User Feedback**: 
   - Success: Badge shows "✓" with green background for 2 seconds
   - Error: Badge shows "✗" with red background for 3 seconds
   - Browser action title updates with specific error message

## Error Handling at Each Stage

### Stage 1: Script Injection Errors
- **Restricted pages** (chrome://, about:, etc.): Shows "Cannot extract content from this page (restricted)"
- **Tab not found**: Shows "Tab not found"
- **General injection failure**: Shows "Failed to inject content script"

### Stage 2: Content Extraction Errors
- **No readable content**: Shows "No readable content found on this page"
- **Readability.js errors**: Caught and reported as extraction failure

### Stage 3: Markdown Conversion Errors
- **Empty HTML**: Shows "Failed to convert content to Markdown"
- **Turndown.js errors**: Caught and reported as conversion failure

### Stage 4: Clipboard Errors
- **Permission denied**: Shows "Clipboard access denied. Please grant clipboard permissions."
- **API not supported**: Shows "Clipboard API not supported in this browser"
- **General clipboard failure**: Shows "Failed to copy to clipboard"

### Stage 5: Timeout Handling
- **10-second timeout**: If content script doesn't respond within 10 seconds, shows "Content extraction timed out"

## Testing Scenarios

### Test 1: Successful Extraction (test-page.html)
1. Load test-page.html in Firefox
2. Click the Gloriosa extension button
3. Expected: Badge shows "..." then "✓", content is copied to clipboard
4. Paste the clipboard content to verify Markdown format

### Test 2: No Readable Content
1. Navigate to a page with no article content (e.g., Google homepage)
2. Click the extension button
3. Expected: Badge shows "..." then "✗", error message about no readable content

### Test 3: Restricted Page
1. Navigate to about:config or chrome://extensions
2. Click the extension button
3. Expected: Badge shows "✗", error message about restricted page

### Test 4: Multiple Simultaneous Clicks
1. Load test-page.html
2. Click the extension button multiple times rapidly
3. Expected: Only one extraction runs, subsequent clicks are ignored until first completes

### Test 5: Loading State Transitions
1. Load a large article page
2. Click the extension button
3. Expected: Badge immediately shows "..." (blue), then transitions to "✓" (green) or "✗" (red)

## Message Passing Verification

The workflow uses the following message format:

```javascript
// Content Script → Background Script
{
	type: 'CONTENT_EXTRACTED',
	success: boolean,
	content: string | null,  // HTML content
	title: string | null,
	error: string | null
}
```

Key implementation details:
- Message listener is set up BEFORE script injection to avoid race conditions
- Content script executes immediately upon injection (no waiting for messages)
- 10-second timeout prevents hanging if content script fails silently
- Message listener is properly cleaned up after receiving response

## Requirements Coverage

This implementation satisfies the following requirements:

- **3.2**: Browser action triggers content extraction process
- **4.5**: Extracted content is passed to conversion process via message passing
- **5.5**: Conversion errors are handled gracefully
- **6.1**: Markdown is copied to clipboard after conversion
- **6.2**: User can paste content immediately
- **6.3**: User receives confirmation feedback (success badge)
- **6.4**: User receives error notification if clipboard operation fails

## Manual Testing Checklist

- [ ] Extension loads without errors in Firefox
- [ ] Browser action button appears in toolbar
- [ ] Clicking button on test-page.html extracts content
- [ ] Markdown is correctly formatted when pasted
- [ ] Loading badge appears during extraction
- [ ] Success badge appears after successful extraction
- [ ] Error badge appears for restricted pages
- [ ] Error badge appears for pages with no content
- [ ] Multiple rapid clicks don't cause issues
- [ ] Timeout works if content script hangs
- [ ] All error messages are user-friendly and specific
