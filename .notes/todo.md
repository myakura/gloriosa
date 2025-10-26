# todo

this is a todo notes for building a browser extension to get page content in Markdown format.

## Implementation Details

- The extension uses Manifest V3 and works on Firefox and Chrome-based browsers.
- It grabs the main content of the current page, converts it to Markdown, and copies it to the clipboard.
- The extension uses Readability.js to extract the main content from the page.
- The extension uses Turndown.js to convert HTML content to Markdown format.
- The extension provides a browser action button to trigger the content extraction and conversion.

## Tasks

- generate and UUID and use the value surrounded by curly braces as the value of the `browser_specific_settings.gecko.id` field in manifest.json.
- add readability.js and turndown.js libraries to the extension.
- update manifest file with necessary permissions and commands.
- set up the background script to handle the content extraction and conversion.
- implement the content extraction and conversion logic.

for each step, write code and commit changes with appropriate commit messages.
