// Content script for extracting page content using Readability.js
// This script is injected dynamically into the active tab

/**
 * Extracts the main content from the current page using Readability.js
 * @returns {Promise<Object>} Extraction result with content and metadata
 */
async function extractContent() {
	try {
		console.log('Gloriosa: Starting content extraction');
		console.log('Gloriosa: Page URL:', window.location.href);
		console.log('Gloriosa: Page title:', document.title);

		console.log('Gloriosa: Creating Readability instance...');
		const documentClone = document.cloneNode(true);
		const reader = new Readability(documentClone);

		console.log('Gloriosa: Parsing document...');
		const article = reader.parse();

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
		console.groupCollapsed('Gloriosa: Extracted HTML:');
		console.log(article.content);
		console.groupEnd();

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
			console.groupCollapsed('Gloriosa: Markdown output:');
			console.log(markdown);
			console.groupEnd();
		}
		catch (mdErr) {
			console.error('Gloriosa: Markdown conversion failed:', mdErr);
			return {
				type: 'CONTENT_EXTRACTED',
				success: false,
				content: null,
				title: null,
				error: 'Failed to convert content to Markdown'
			};
		}

		return {
			type: 'CONTENT_EXTRACTED',
			success: true,
			content: article.content,
			title: article.title,
			markdown,
			error: null
		};

	}
	catch (error) {
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

// Execute extraction immediately when script is injected and send result back to background script
console.log('Gloriosa: Content script loaded and executing');
extractContent().then(result => {
	console.log('Gloriosa: Sending extraction result to background script');
	console.log('Gloriosa: Result success:', result.success);
	chrome.runtime.sendMessage(result);
}).catch((error) => {
	console.error('Gloriosa: Unexpected error in extraction flow:', error);
	chrome.runtime.sendMessage({
		type: 'CONTENT_EXTRACTED',
		success: false,
		content: null,
		title: null,
		error: error.message || 'Unknown error occurred'
	});
});
