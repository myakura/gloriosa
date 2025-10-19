// Offscreen document script for reliable clipboard operations.
// Listens for messages from the service worker, copies text via
// navigator.clipboard when possible, otherwise falls back to
// a hidden textarea + execCommand('copy'), then reports the result.

chrome.runtime.onMessage.addListener(async (msg) => {
	if (!msg || msg.type !== 'OFFSCREEN_COPY_TEXT') return;

	const text = String(msg.text || '');
	let success = false;
	let error = null;

	try {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			await navigator.clipboard.writeText(text);
			success = true;
		} else {
			throw new Error('navigator.clipboard unavailable');
		}
	} catch (e) {
		// Fallback: use textarea selection + execCommand('copy')
		try {
			const ta = document.getElementById('gloriosa-offscreen-ta');
			ta.value = text;
			ta.focus();
			ta.select();
			success = document.execCommand('copy');
			if (!success) {
				throw new Error('execCommand copy failed');
			}
		} catch (fallbackErr) {
			success = false;
			error = fallbackErr && fallbackErr.message ? fallbackErr.message : (e && e.message ? e.message : 'Clipboard copy failed');
		}
	}

	// Notify the service worker about the result
	chrome.runtime.sendMessage({ type: 'OFFSCREEN_COPY_RESULT', success, error });
});

