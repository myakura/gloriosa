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
			// Clone the document to avoid modifying the original page
			const documentClone = document.cloneNode(true);

			// Create Readability instance with the cloned document
			const reader = new Readability(documentClone);

			// Parse the document to extract article content
			const article = reader.parse();

			// Handle cases where no content can be extracted
			if (!article || !article.content) {
				return {
					type: 'CONTENT_EXTRACTED',
					success: false,
					content: null,
					title: null,
					error: 'No readable content found on this page'
				};
			}

			// Return successful extraction result
			return {
				type: 'CONTENT_EXTRACTED',
				success: true,
				content: article.content,
				title: article.title,
				error: null
			};

		} catch (error) {
			console.error('Content extraction error:', error);
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
	extractContent().then(result => {
		chrome.runtime.sendMessage(result);
	}).catch(error => {
		chrome.runtime.sendMessage({
			type: 'CONTENT_EXTRACTED',
			success: false,
			content: null,
			title: null,
			error: error.message || 'Unknown error occurred'
		});
	});

})();
