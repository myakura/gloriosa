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

			// Return successful extraction result
			return {
				type: 'CONTENT_EXTRACTED',
				success: true,
				content: article.content,
				title: article.title,
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

})();
