// Content script for extracting page content using Readability.js
// This script is injected dynamically into the active tab

(function () {
	'use strict';

	/**
	 * Extracts the main content from the current page using Readability.js
	 * @returns {Promise<Object>} Extraction result with content and metadata
	 */
	async function extractContent() {
		try {
			console.log('Gloriosa: Starting content extraction');
			console.log('Gloriosa: Page URL:', window.location.href);
			console.log('Gloriosa: Page title:', document.title);

			// Clone the document to avoid modifying the original page
			console.log('Gloriosa: Cloning document...');
			const documentClone = document.cloneNode(true);

			// Create Readability instance with the cloned document
			console.log('Gloriosa: Creating Readability instance...');
			const reader = new Readability(documentClone);

			// Parse the document to extract article content
			console.log('Gloriosa: Parsing document...');
			const article = reader.parse();

			// Handle cases where no content can be extracted
			if (!article || !article.content) {
				console.warn('Gloriosa: No readable content found');
				console.log('Gloriosa: Article object:', article);
				return {
					type: 'CONTENT_EXTRACTED',
					success: false,
					content: null,
					title: null,
					error: 'No readable content found on this page'
				};
			}

			console.log('Gloriosa: Content extracted successfully');
			console.log('Gloriosa: Article title:', article.title);
			console.log('Gloriosa: Content length:', article.content.length, 'characters');
			console.log('Gloriosa: Text length:', article.textContent.length, 'characters');


			// Create Turndown service (library injected by background)
			const turndownService = new TurndownService({
				headingStyle: 'atx',
				codeBlockStyle: 'fenced',
				bulletListMarker: '*',
				strongDelimiter: '**',
				hr: '---'
			});

			// Convert to Markdown in the page context (DOM available)
			let markdown = '';
			try {
				markdown = turndownService.turndown(article.content || '');
				if (article.title && !markdown.startsWith('# ')) {
					markdown = `# ${article.title}\n\n${markdown}`;
				}
				markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
				console.log('Gloriosa: Markdown conversion successful, length:', markdown.length);
			} catch (mdErr) {
				console.error('Gloriosa: Markdown conversion failed:', mdErr);
				return {
					type: 'CONTENT_EXTRACTED',
					success: false,
					content: null,
					title: null,
					error: 'Failed to convert content to Markdown'
				};
			}

			// Return successful extraction result with Markdown
			return {
				type: 'CONTENT_EXTRACTED',
				success: true,
				content: article.content,
				title: article.title,
				markdown,
				error: null
			};

		} catch (error) {
			console.error('Gloriosa: Content extraction error:', error);
			console.error('Gloriosa: Error stack:', error.stack);
			return {
				type: 'CONTENT_EXTRACTED',
				success: false,
				content: null,
				title: null,
				error: error.message || 'Failed to extract content'
			};
		}
	}

	// Execute extraction immediately when script is injected
	// and send result back to background script
	console.log('Gloriosa: Content script loaded and executing');
	extractContent().then(result => {
		console.log('Gloriosa: Sending extraction result to background script');
		console.log('Gloriosa: Result success:', result.success);
		chrome.runtime.sendMessage(result);
	}).catch(error => {
		console.error('Gloriosa: Unexpected error in extraction flow:', error);
		chrome.runtime.sendMessage({
			type: 'CONTENT_EXTRACTED',
			success: false,
			content: null,
			title: null,
			error: error.message || 'Unknown error occurred'
		});
	});

	// Listen for clipboard copy requests from background
	chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
		if (message && message.type === 'COPY_MARKDOWN') {
			const text = String(message.text || '');
			const respond = (ok, err) => {
				chrome.runtime.sendMessage({ type: 'COPY_RESULT', success: ok, error: err || null });
			};
			(async () => {
				let lastError = null;
				// Attempt modern API first; if it fails, fall back without aborting
				if (navigator.clipboard && navigator.clipboard.writeText) {
					try {
						// Some sites require focus; attempt to focus the window/document
						if (!document.hasFocus()) {
							try { window.focus(); } catch (_) {}
						}
						await navigator.clipboard.writeText(text);
						respond(true);
						return;
					} catch (err) {
						lastError = err;
						console.warn('Gloriosa: navigator.clipboard.writeText failed, falling back:', err);
					}
				}

				// Fallback using a temporary textarea
				try {
					if (!document.hasFocus()) {
						try { window.focus(); } catch (_) {}
					}
					const textarea = document.createElement('textarea');
					textarea.value = text;
					textarea.setAttribute('readonly', '');
					textarea.style.position = 'fixed';
					textarea.style.left = '-9999px';
					textarea.style.top = '0';
					textarea.style.opacity = '0';
					document.body.appendChild(textarea);
					textarea.focus();
					textarea.select();
					const ok = document.execCommand('copy');
					document.body.removeChild(textarea);
					if (!ok) throw new Error('Copy command failed');
					respond(true);
				} catch (fallbackErr) {
					const msg = (fallbackErr && fallbackErr.message) || (lastError && lastError.message) || 'Clipboard copy failed';
					respond(false, msg);
				}
			})();
			return; // Keep listener; async response sent via separate message
		}
	});

})();
