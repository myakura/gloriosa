// Import Turndown.js library
importScripts('lib/turndown-7.2.1.js');

// Initialize TurndownService with configuration
const turndownService = new TurndownService({
	headingStyle: 'atx',
	codeBlockStyle: 'fenced',
	bulletListMarker: '*',
	strongDelimiter: '**',
	hr: '---'
});

// Track extraction state to prevent multiple simultaneous extractions
let isExtracting = false;

// Listen for browser action clicks
chrome.action.onClicked.addListener(async (tab) => {
	try {
		await handleBrowserAction(tab);
	} catch (error) {
		console.error('Browser action failed:', error);
		showErrorBadge('Error');
	}
});

/**
 * Main handler for browser action clicks
 * @param {chrome.tabs.Tab} tab - The active tab
 */
async function handleBrowserAction(tab) {
	// Prevent multiple simultaneous extractions
	if (isExtracting) {
		console.log('Extraction already in progress');
		return;
	}

	isExtracting = true;

	// Show loading state
	showLoadingBadge();

	try {
		// Inject content script and extract content
		const extractedContent = await injectContentScript(tab.id);

		if (!extractedContent.success) {
			throw new Error(extractedContent.error || 'Content extraction failed');
		}

		// Convert HTML to Markdown
		const markdown = convertToMarkdown(extractedContent.content, extractedContent.title);

		// Copy to clipboard
		await copyToClipboard(markdown);

		// Show success feedback
		showSuccessBadge('✓');

		console.log('Content copied to clipboard');
	} catch (error) {
		console.error('Content extraction failed:', error);

		// Provide specific error feedback based on error type
		if (error.message.includes('restricted')) {
			showErrorBadge('✗');
			showNotification('Cannot extract content from this page (restricted)');
		} else if (error.message.includes('No readable content')) {
			showErrorBadge('✗');
			showNotification('No readable content found on this page');
		} else if (error.message.includes('clipboard')) {
			showErrorBadge('✗');
			showNotification('Failed to copy to clipboard');
		} else if (error.message.includes('timeout')) {
			showErrorBadge('✗');
			showNotification('Content extraction timed out');
		} else {
			showErrorBadge('✗');
			showNotification('An error occurred. Please try again.');
		}
	} finally {
		// Reset extraction state
		isExtracting = false;
	}
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy to clipboard
 * @returns {Promise<void>}
 */
async function copyToClipboard(text) {
	try {
		// Try using the modern clipboard API first
		if (navigator.clipboard && navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}

		// Fallback for browsers without clipboard API
		// Create a temporary textarea element
		const textarea = document.createElement('textarea');
		textarea.value = text;
		textarea.style.position = 'fixed';
		textarea.style.opacity = '0';
		document.body.appendChild(textarea);

		// Select and copy the text
		textarea.select();
		textarea.setSelectionRange(0, 99999); // For mobile devices

		const successful = document.execCommand('copy');
		document.body.removeChild(textarea);

		if (!successful) {
			throw new Error('Copy command failed');
		}

	} catch (error) {
		console.error('Clipboard operation failed:', error);

		// Handle specific error cases
		if (error.name === 'NotAllowedError') {
			throw new Error('Clipboard access denied. Please grant clipboard permissions.');
		} else if (error.message.includes('not supported')) {
			throw new Error('Clipboard API not supported in this browser');
		} else {
			throw new Error('Failed to copy to clipboard');
		}
	}
}

/**
 * Convert HTML content to Markdown format
 * @param {string} html - HTML content to convert
 * @param {string|null} title - Article title
 * @returns {string} - Markdown formatted content
 */
function convertToMarkdown(html, title) {
	try {
		if (!html) {
			throw new Error('No HTML content to convert');
		}

		// Convert HTML to Markdown using Turndown
		let markdown = turndownService.turndown(html);

		// Add title as H1 if available and not already present
		if (title && !markdown.startsWith('# ')) {
			markdown = `# ${title}\n\n${markdown}`;
		}

		// Clean up excessive whitespace
		markdown = markdown.replace(/\n{3,}/g, '\n\n');

		return markdown.trim();

	} catch (error) {
		console.error('Markdown conversion failed:', error);
		throw new Error('Failed to convert content to Markdown');
	}
}

/**
 * Inject content script with Readability.js into the active tab
 * @param {number} tabId - The tab ID to inject into
 * @returns {Promise<Object>} - Extraction result
 */
async function injectContentScript(tabId) {
	try {
		// First inject Readability.js library
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['lib/readability-0.6.0.js']
		});

		// Then inject and execute the content script
		const results = await chrome.scripting.executeScript({
			target: { tabId },
			files: ['gloriosa_content.js']
		});

		// Wait for the content script to send back the extracted content
		return new Promise((resolve, reject) => {
			const messageListener = (message, sender, sendResponse) => {
				if (sender.tab?.id === tabId && message.type === 'CONTENT_EXTRACTED') {
					chrome.runtime.onMessage.removeListener(messageListener);
					resolve({
						success: message.success,
						content: message.content,
						title: message.title,
						error: message.error
					});
				}
			};

			chrome.runtime.onMessage.addListener(messageListener);

			// Set a timeout to handle cases where no response is received
			setTimeout(() => {
				chrome.runtime.onMessage.removeListener(messageListener);
				reject(new Error('Content extraction timeout'));
			}, 10000); // 10 second timeout
		});

	} catch (error) {
		console.error('Script injection failed:', error);

		// Handle specific error cases
		if (error.message.includes('Cannot access')) {
			throw new Error('Cannot extract content from this page (restricted)');
		} else if (error.message.includes('No tab with id')) {
			throw new Error('Tab not found');
		} else {
			throw new Error('Failed to inject content script');
		}
	}
}

/**
 * Show loading indicator on browser action badge
 */
function showLoadingBadge() {
	chrome.action.setBadgeText({ text: '...' });
	chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
}

/**
 * Show success indicator on browser action badge
 * @param {string} text - Badge text to display
 */
function showSuccessBadge(text = '✓') {
	chrome.action.setBadgeText({ text });
	chrome.action.setBadgeBackgroundColor({ color: '#34a853' });

	// Clear badge after 2 seconds
	setTimeout(() => {
		chrome.action.setBadgeText({ text: '' });
	}, 2000);
}

/**
 * Show error indicator on browser action badge
 * @param {string} text - Badge text to display
 */
function showErrorBadge(text = '✗') {
	chrome.action.setBadgeText({ text });
	chrome.action.setBadgeBackgroundColor({ color: '#ea4335' });

	// Clear badge after 3 seconds
	setTimeout(() => {
		chrome.action.setBadgeText({ text: '' });
	}, 3000);
}

/**
 * Show notification to user
 * @param {string} message - Message to display
 * @param {boolean} isError - Whether this is an error notification
 */
function showNotification(message, isError = false) {
	// For now, we'll use console logging as notifications require additional permissions
	// In a full implementation, you could use chrome.notifications API
	if (isError) {
		console.error('Extension notification:', message);
	} else {
		console.log('Extension notification:', message);
	}

	// Alternative: Update the browser action title temporarily
	chrome.action.setTitle({ title: message });

	// Reset title after a few seconds
	setTimeout(() => {
		chrome.action.setTitle({ title: 'Get content in Markdown' });
	}, 5000);
}
