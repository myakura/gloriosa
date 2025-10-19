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
			console.log('[Gloriosa Content] Starting content extraction');
			console.log('[Gloriosa Content] Page URL:', window.location.href);
			console.log('[Gloriosa Content] Page title:', document.title);

			// Clone the document to avoid modifying the original page
			console.log('[Gloriosa Content] Cloning document...');
			const documentClone = document.cloneNode(true);

			// Create Readability instance with the cloned document
			console.log('[Gloriosa Content] Creating Readability instance...');
			const reader = new Readability(documentClone);

			// Parse the document to extract article content
			console.log('[Gloriosa Content] Parsing document...');
			const article = reader.parse();

			// Handle cases where no content can be extracted
			if (!article || !article.content) {
				console.warn('[Gloriosa Content] No readable content found');
				console.log('[Gloriosa Content] Article object:', article);
				return {
					type: 'CONTENT_EXTRACTED',
					success: false,
					content: null,
					title: null,
					error: 'No readable content found on this page'
				};
			}

			console.log('[Gloriosa Content] Content extracted successfully');
			console.log('[Gloriosa Content] Article title:', article.title);
			console.log('[Gloriosa Content] Content length:', article.content.length, 'characters');
			console.log('[Gloriosa Content] Text length:', article.textContent.length, 'characters');

			// Return successful extraction result
			return {
				type: 'CONTENT_EXTRACTED',
				success: true,
				content: article.content,
				title: article.title,
				error: null
			};

		} catch (error) {
			console.error('[Gloriosa Content] Content extraction error:', error);
			console.error('[Gloriosa Content] Error stack:', error.stack);
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
	console.log('[Gloriosa Content] Content script loaded and executing');
	extractContent().then(result => {
		console.log('[Gloriosa Content] Sending extraction result to background script');
		console.log('[Gloriosa Content] Result success:', result.success);
		chrome.runtime.sendMessage(result);
	}).catch(error => {
		console.error('[Gloriosa Content] Unexpected error in extraction flow:', error);
		chrome.runtime.sendMessage({
			type: 'CONTENT_EXTRACTED',
			success: false,
			content: null,
			title: null,
			error: error.message || 'Unknown error occurred'
		});
	});

})();
