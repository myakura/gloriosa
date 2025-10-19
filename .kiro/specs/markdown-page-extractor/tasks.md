# Implementation Plan

- [x] 1. Fix manifest.json configuration
	- Generate a valid UUID for Firefox extension (current value is empty "{}")
	- Update `browser_specific_settings.gecko.id` field with UUID in curly braces format
	- Update permissions to include `activeTab`, `scripting`, and `clipboardWrite`
	- Remove unnecessary `tabs` and `tabGroups` permissions
	- Fix `strict_min_version` to "109.0" (currently "139.0")
	- Ensure file follows .editorconfig formatting (tab indentation, LF line endings)
	- _Requirements: 1.1, 1.2, 1.3, 1.4, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3_

- [x] 2. Create content script for page content extraction
	- [x] 2.1 Create gloriosa_content.js file with proper formatting
		- Create new `gloriosa_content.js` file in project root
		- Set up message listener for background script communication
		- Ensure file follows .editorconfig formatting (tab indentation, UTF-8, LF endings, final newline)
		- _Requirements: 4.1, 8.1, 8.2, 8.5, 8.6_
	
	- [x] 2.2 Implement Readability.js integration in content script
		- Import and initialize Readability.js functionality
		- Clone the document to avoid modifying the original page
		- Create Readability instance with cloned document
		- Parse the document to extract article content
		- Handle cases where no content can be extracted
		- _Requirements: 2.1, 2.2, 4.2, 4.3, 4.4, 4.5_
	
	- [x] 2.3 Implement message passing to background script
		- Send extracted HTML content back to background script
		- Include article title in the response
		- Handle and communicate extraction errors
		- Format response according to ContentMessage interface
		- _Requirements: 4.5_

- [x] 3. Implement background service worker
	- [x] 3.1 Create gloriosa_background.js with basic structure
		- Create new `gloriosa_background.js` file
		- Import Turndown.js library
		- Set up browser action click listener
		- Ensure file follows .editorconfig formatting (tab indentation, UTF-8, LF endings)
		- _Requirements: 3.1, 3.2, 8.1, 8.2, 8.5, 8.6_
	
	- [x] 3.2 Implement content script injection logic
		- Create function to inject gloriosa_content.js into active tab
		- Include Readability.js library in the injection
		- Use chrome.scripting.executeScript API for injection
		- Handle injection errors for restricted pages
		- Implement loading state feedback during injection
		- _Requirements: 2.3, 3.2, 3.4, 4.1_
	
	- [x] 3.3 Implement Turndown.js HTML-to-Markdown conversion
		- Initialize TurndownService with configuration options
		- Configure headingStyle: 'atx', codeBlockStyle: 'fenced'
		- Configure bulletListMarker: '*', strongDelimiter: '**', hr: '---'
		- Create conversion function that processes extracted HTML
		- Handle conversion errors gracefully
		- _Requirements: 2.1, 2.2, 5.1, 5.2, 5.3, 5.4, 5.5_
	
	- [x] 3.4 Implement clipboard write functionality
		- Create function to write Markdown text to clipboard
		- Use `navigator.clipboard.writeText` API
		- Handle clipboard permission errors
		- Implement fallback for browsers without clipboard API
		- _Requirements: 6.1, 6.2, 6.4, 7.3_
	
	- [x] 3.5 Implement user feedback mechanisms
		- Create success notification/badge when content is copied
		- Create error notification/badge for failures
		- Implement loading indicator during extraction
		- Clear badges after appropriate timeout (2s success, 3s error)
		- Provide specific error messages for different failure types
		- _Requirements: 3.4, 6.3, 6.4_

- [x] 4. Implement end-to-end workflow coordination
	- Wire together browser action click → injection → extraction → conversion → clipboard
	- Implement proper error handling at each stage
	- Ensure message passing works correctly between components
	- Test that loading states transition properly
	- Verify user receives appropriate feedback for all scenarios
	- _Requirements: 3.2, 4.5, 5.5, 6.1, 6.2, 6.3, 6.4_

- [x] 5. Add error handling and edge cases
	- Handle pages with no extractable content (Readability returns null)
	- Handle restricted pages where script injection fails (chrome://, about:)
	- Handle clipboard API failures gracefully
	- Prevent multiple simultaneous extractions
	- Add console logging for debugging purposes
	- _Requirements: 4.4, 5.5, 6.4, 7.4_

- [ ] 6. Create README documentation
	- Document extension purpose and features
	- Add installation instructions for Firefox
	- Add usage instructions
	- Add troubleshooting section for common issues
	- Include information about the libraries used (Readability.js and Turndown.js)
	- Ensure file follows .editorconfig formatting
	- _Requirements: 1.3, 8.1, 8.5, 8.6_
