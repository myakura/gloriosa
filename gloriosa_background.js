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
	console.log('[Gloriosa] Browser action clicked for tab:', tab.id, tab.url);
	try {
		await handleBrowserAction(tab);
	} catch (error) {
		console.error('[Gloriosa] Browser action failed:', error);
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
		console.warn('[Gloriosa] Extraction already in progress, ignoring click');
		return;
	}

	console.log('[Gloriosa] Starting content extraction for tab:', tab.id);
	isExtracting = true;

	// Show loading state
	showLoadingBadge();

	try {
		// Inject content script and extract content
		console.log('[Gloriosa] Injecting content script...');
		const extractedContent = await injectContentScript(tab.id);

		if (!extractedContent.success) {
			console.error('[Gloriosa] Content extraction failed:', extractedContent.error);
			throw new Error(extractedContent.error || 'Content extraction failed');
		}

		console.log('[Gloriosa] Content extracted successfully, title:', extractedContent.title);

		// Convert HTML to Markdown
		console.log('[Gloriosa] Converting HTML to Markdown...');
		const markdown = convertToMarkdown(extractedContent.content, extractedContent.title);
		console.log('[Gloriosa] Markdown conversion complete, length:', markdown.length, 'characters');

		// Copy to clipboard
		console.log('[Gloriosa] Copying to clipboard...');
		await copyToClipboard(markdown);

		// Show success feedback
		showSuccessBadge('✓');

		console.log('[Gloriosa] Content successfully copied to clipboard');
	} catch (error) {
		console.error('[Gloriosa] Content extraction failed:', error);

		// Provide specific error feedback based on error type
		if (error.message.includes('restricted')) {
			console.error('[Gloriosa] Error type: Restricted page');
			showErrorBadge('✗');
			showNotification('Cannot extract content from this page (restricted)');
		} else if (error.message.includes('No readable content')) {
			console.error('[Gloriosa] Error type: No readable content');
			showErrorBadge('✗');
			showNotification('No readable content found on this page');
		} else if (error.message.includes('clipboard')) {
			console.error('[Gloriosa] Error type: Clipboard failure');
			showErrorBadge('✗');
			showNotification('Failed to copy to clipboard');
		} else if (error.message.includes('timeout')) {
			console.error('[Gloriosa] Error type: Timeout');
			showErrorBadge('✗');
			showNotification('Content extraction timed out');
		} else {
			console.error('[Gloriosa] Error type: Unknown');
			showErrorBadge('✗');
			showNotification('An error occurred. Please try again.');
		}
	} finally {
		// Reset extraction state
		isExtracting = false;
		console.log('[Gloriosa] Extraction state reset');
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
			console.log('[Gloriosa] Using modern clipboard API');
			await navigator.clipboard.writeText(text);
			console.log('[Gloriosa] Clipboard write successful');
			return;
		}

		console.warn('[Gloriosa] Modern clipboard API not available, using fallback');

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
			console.error('[Gloriosa] Fallback copy command failed');
			throw new Error('Copy command failed');
		}

		console.log('[Gloriosa] Fallback clipboard write successful');

	} catch (error) {
		console.error('[Gloriosa] Clipboard operation failed:', error);

		// Handle specific error cases
		if (error.name === 'NotAllowedError') {
			console.error('[Gloriosa] Clipboard access denied by user or browser policy');
			throw new Error('Clipboard access denied. Please grant clipboard permissions.');
		} else if (error.message.includes('not supported')) {
			console.error('[Gloriosa] Clipboard API not supported in this browser');
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
			console.error('[Gloriosa] No HTML content provided for conversion');
			throw new Error('No HTML content to convert');
		}

		console.log('[Gloriosa] Converting HTML to Markdown, HTML length:', html.length);

		// Convert HTML to Markdown using Turndown
		let markdown = turndownService.turndown(html);

		// Add title as H1 if available and not already present
		if (title && !markdown.startsWith('# ')) {
			console.log('[Gloriosa] Adding title to Markdown:', title);
			markdown = `# ${title}\n\n${markdown}`;
		}

		// Clean up excessive whitespace
		markdown = markdown.replace(/\n{3,}/g, '\n\n');

		console.log('[Gloriosa] Markdown conversion successful');
		return markdown.trim();

	} catch (error) {
		console.error('[Gloriosa] Markdown conversion failed:', error);
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
		console.log('[Gloriosa] Setting up message listener for tab:', tabId);

		// Set up message listener BEFORE injecting the script to avoid race condition
		const extractionPromise = new Promise((resolve, reject) => {
			const messageListener = (message, sender) => {
				if (sender.tab?.id === tabId && message.type === 'CONTENT_EXTRACTED') {
					console.log('[Gloriosa] Received extraction result from content script');
					chrome.runtime.onMessage.removeListener(messageListener);
					clearTimeout(timeoutId);
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
			const timeoutId = setTimeout(() => {
				console.error('[Gloriosa] Content extraction timed out after 10 seconds');
				chrome.runtime.onMessage.removeListener(messageListener);
				reject(new Error('Content extraction timeout'));
			}, 10000); // 10 second timeout
		});

		// First inject Readability.js library
		console.log('[Gloriosa] Injecting Readability.js library...');
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['lib/readability-0.6.0.js']
		});
		console.log('[Gloriosa] Readability.js injected successfully');

		// Then inject and execute the content script
		console.log('[Gloriosa] Injecting content script...');
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['gloriosa_content.js']
		});
		console.log('[Gloriosa] Content script injected successfully');

		// Wait for the content script to send back the extracted content
		console.log('[Gloriosa] Waiting for extraction result...');
		return await extractionPromise;

	} catch (error) {
		console.error('[Gloriosa] Script injection failed:', error);

		// Handle specific error cases
		if (error.message.includes('Cannot access') || error.message.includes('Cannot access a chrome')) {
			console.error('[Gloriosa] Attempted to inject into restricted page (chrome://, about:, etc.)');
			throw new Error('Cannot extract content from this page (restricted)');
		} else if (error.message.includes('No tab with id')) {
			console.error('[Gloriosa] Tab not found:', tabId);
			throw new Error('Tab not found');
		} else if (error.message.includes('timeout')) {
			throw error; // Re-throw timeout errors as-is
		} else {
			throw new Error('Failed to inject content script: ' + error.message);
		}
	}
}

/**
 * Show loading indicator on browser action badge
 */
function showLoadingBadge() {
	console.log('[Gloriosa] Showing loading badge');
	chrome.action.setBadgeText({ text: '...' });
	chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
}

/**
 * Show success indicator on browser action badge
 * @param {string} text - Badge text to display
 */
function showSuccessBadge(text = '✓') {
	console.log('[Gloriosa] Showing success badge');
	chrome.action.setBadgeText({ text });
	chrome.action.setBadgeBackgroundColor({ color: '#34a853' });

	// Clear badge after 2 seconds
	setTimeout(() => {
		console.log('[Gloriosa] Clearing success badge');
		chrome.action.setBadgeText({ text: '' });
	}, 2000);
}

/**
 * Show error indicator on browser action badge
 * @param {string} text - Badge text to display
 */
function showErrorBadge(text = '✗') {
	console.log('[Gloriosa] Showing error badge');
	chrome.action.setBadgeText({ text });
	chrome.action.setBadgeBackgroundColor({ color: '#ea4335' });

	// Clear badge after 3 seconds
	setTimeout(() => {
		console.log('[Gloriosa] Clearing error badge');
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
