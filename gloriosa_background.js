// Note: Do not perform DOM-dependent work (like Turndown) in the
// background service worker. Conversion and clipboard operations
// are delegated to the content script which has a DOM.

// Track extraction state to prevent multiple simultaneous extractions
let isExtracting = false;

// Listen for browser action clicks
chrome.action.onClicked.addListener(async (tab) => {
	console.log('Browser action clicked for tab:', tab.id, tab.url);
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
		console.warn('Extraction already in progress, ignoring click');
		return;
	}

	console.log('Starting content extraction for tab:', tab.id);
	isExtracting = true;

	// Show loading state
	showLoadingBadge();

	try {
		// Inject content script and extract content
		console.log('Injecting content script...');
		const extractedContent = await injectContentScript(tab.id);

		if (!extractedContent.success) {
			console.error('Content extraction failed:', extractedContent.error);
			throw new Error(extractedContent.error || 'Content extraction failed');
		}

		console.log('Content extracted successfully, title:', extractedContent.title);

		// Ensure we have Markdown from the content script
		if (!extractedContent.markdown) {
			throw new Error('Failed to convert content to Markdown');
		}

		console.log('Markdown conversion complete, length:', extractedContent.markdown.length, 'characters');

		// Copy to clipboard via the tab (content script context)
		console.log('Copying to clipboard...');
		await copyToClipboardInTab(tab.id, extractedContent.markdown);

		// Show success feedback
		showSuccessBadge('✓');

		console.log('Content successfully copied to clipboard');
	} catch (error) {
		console.error('Content extraction failed:', error);

		// Provide specific error feedback based on error type
		if (error.message.includes('restricted')) {
			console.error('Error type: Restricted page');
			showErrorBadge('✗');
			showNotification('Cannot extract content from this page (restricted)');
		} else if (error.message.includes('No readable content')) {
			console.error('Error type: No readable content');
			showErrorBadge('✗');
			showNotification('No readable content found on this page');
		} else if (error.message.includes('clipboard')) {
			console.error('Error type: Clipboard failure');
			showErrorBadge('✗');
			showNotification('Failed to copy to clipboard');
		} else if (error.message.includes('timeout')) {
			console.error('Error type: Timeout');
			showErrorBadge('✗');
			showNotification('Content extraction timed out');
		} else {
			console.error('Error type: Unknown');
			showErrorBadge('✗');
			showNotification('An error occurred. Please try again.');
		}
	} finally {
		// Reset extraction state
		isExtracting = false;
		console.log('Extraction state reset');
	}
}

/**
 * Ask the tab's content script to copy text to clipboard.
 * @param {number} tabId
 * @param {string} text
 */
async function copyToClipboardInTab(tabId, text) {
	return new Promise((resolve, reject) => {
		let timeout;
		const listener = (message, sender) => {
			if (sender.tab?.id === tabId && message.type === 'COPY_RESULT') {
				chrome.runtime.onMessage.removeListener(listener);
				clearTimeout(timeout);
				if (message.success) resolve(); else reject(new Error(message.error || 'Clipboard copy failed'));
			}
		};

		chrome.runtime.onMessage.addListener(listener);

		chrome.tabs.sendMessage(tabId, { type: 'COPY_MARKDOWN', text });

		timeout = setTimeout(() => {
			chrome.runtime.onMessage.removeListener(listener);
			reject(new Error('Clipboard operation timeout'));
		}, 5000);
	});
}

/**
 * Inject content script with Readability.js into the active tab
 * @param {number} tabId - The tab ID to inject into
 * @returns {Promise<Object>} - Extraction result
 */
async function injectContentScript(tabId) {
	try {
		console.log('Setting up message listener for tab:', tabId);

		// Set up message listener BEFORE injecting the script to avoid race condition
		const extractionPromise = new Promise((resolve, reject) => {
			const messageListener = (message, sender) => {
				if (sender.tab?.id === tabId && message.type === 'CONTENT_EXTRACTED') {
					console.log('Received extraction result from content script');
					chrome.runtime.onMessage.removeListener(messageListener);
					clearTimeout(timeoutId);
					resolve({
						success: message.success,
						content: message.content,
						title: message.title,
						markdown: message.markdown,
						error: message.error
					});
				}
			};

			chrome.runtime.onMessage.addListener(messageListener);

			// Set a timeout to handle cases where no response is received
			const timeoutId = setTimeout(() => {
				console.error('Content extraction timed out after 10 seconds');
				chrome.runtime.onMessage.removeListener(messageListener);
				reject(new Error('Content extraction timeout'));
			}, 10000); // 10 second timeout
		});

		// First inject Readability.js library
		console.log('Injecting Readability.js library...');
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['lib/readability-0.6.0.js']
		});
		console.log('Readability.js injected successfully');

		// Inject Turndown.js library for Markdown conversion in the page context
		console.log('Injecting Turndown.js library...');
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['lib/turndown-7.2.1.js']
		});
		console.log('Turndown.js injected successfully');

		// Then inject and execute the content script
		console.log('Injecting content script...');
		await chrome.scripting.executeScript({
			target: { tabId },
			files: ['gloriosa_content.js']
		});
		console.log('Content script injected successfully');

		// Wait for the content script to send back the extracted content
		console.log('Waiting for extraction result...');
		return await extractionPromise;

	} catch (error) {
		console.error('Script injection failed:', error);

		// Handle specific error cases
		if (error.message.includes('Cannot access') || error.message.includes('Cannot access a chrome')) {
			console.error('Attempted to inject into restricted page (chrome://, about:, etc.)');
			throw new Error('Cannot extract content from this page (restricted)');
		} else if (error.message.includes('No tab with id')) {
			console.error('Tab not found:', tabId);
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
	console.log('Showing loading badge');
	chrome.action.setBadgeText({ text: '...' });
	chrome.action.setBadgeBackgroundColor({ color: '#4285f4' });
}

/**
 * Show success indicator on browser action badge
 * @param {string} text - Badge text to display
 */
function showSuccessBadge(text = '✓') {
	console.log('Showing success badge');
	chrome.action.setBadgeText({ text });
	chrome.action.setBadgeBackgroundColor({ color: '#34a853' });

	// Clear badge after 2 seconds
	setTimeout(() => {
		console.log('Clearing success badge');
		chrome.action.setBadgeText({ text: '' });
	}, 2000);
}

/**
 * Show error indicator on browser action badge
 * @param {string} text - Badge text to display
 */
function showErrorBadge(text = '✗') {
	console.log('Showing error badge');
	chrome.action.setBadgeText({ text });
	chrome.action.setBadgeBackgroundColor({ color: '#ea4335' });

	// Clear badge after 3 seconds
	setTimeout(() => {
		console.log('Clearing error badge');
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
