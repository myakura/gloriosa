# Gloriosa

A Firefox browser extension that extracts the main content from web pages and converts it to Markdown format with a single click.

## Features

- **One-Click Extraction**: Click the browser toolbar button to instantly extract and convert page content
- **Clean Content**: Automatically removes ads, navigation, sidebars, and other clutter using Readability.js
- **Markdown Output**: Converts extracted HTML to clean, properly formatted Markdown
- **Clipboard Integration**: Automatically copies the Markdown to your clipboard for immediate use
- **Visual Feedback**: Clear success/error indicators so you know when content is ready
- **Privacy-Focused**: All processing happens locally in your browser - no data is sent to external servers

## Installation

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Navigate to the extension directory and select the `manifest.json` file
6. The Gloriosa icon should now appear in your browser toolbar

**Note**: Temporary add-ons are removed when Firefox is closed. For permanent installation during development, you can use Firefox Developer Edition or Firefox Nightly with the appropriate settings.

### Building for Distribution

To package the extension for distribution on addons.mozilla.org:

1. Ensure all files are present in the extension directory
2. Create a ZIP archive of the extension files (excluding `.git`, `.kiro`, and other development files)
3. Submit the ZIP file to [addons.mozilla.org](https://addons.mozilla.org/developers/)

## Usage

1. Navigate to any web page with article content (news articles, blog posts, documentation, etc.)
2. Click the Gloriosa icon in your browser toolbar
3. Wait for the extraction to complete (you'll see a loading indicator)
4. When successful, the Markdown content is automatically copied to your clipboard
5. Paste the content into your favorite Markdown editor or note-taking app

### Keyboard Shortcut

You can also configure a keyboard shortcut in Firefox:

1. Navigate to `about:addons`
2. Click the gear icon and select "Manage Extension Shortcuts"
3. Find "Gloriosa" and set your preferred shortcut

## Supported Content

Gloriosa works best with:

- News articles
- Blog posts
- Documentation pages
- Medium articles
- Wikipedia pages
- Any page with clear article content

## Troubleshooting

### No Content Extracted

**Problem**: The extension shows an error saying "No readable content found on this page"

**Solutions**:
- The page may not have extractable article content (e.g., search results, homepages, dashboards)
- Try the extension on a different page with clear article content
- Some pages with heavy JavaScript rendering may not work correctly

### Extension Doesn't Work on Certain Pages

**Problem**: The extension button doesn't respond or shows an error

**Solutions**:
- The extension cannot run on browser internal pages (e.g., `about:*`, `chrome://`)
- Some websites may block content script injection
- Check the browser console (F12) for any error messages

### Clipboard Copy Failed

**Problem**: Content is extracted but not copied to clipboard

**Solutions**:
- Ensure the extension has clipboard permissions (check `about:addons`)
- Try clicking the extension button again
- Some browsers may require user interaction before clipboard access is granted

### Formatting Issues in Markdown

**Problem**: The Markdown output has formatting problems

**Solutions**:
- The source HTML may have unusual or non-standard formatting
- Try pasting into a different Markdown editor to verify the issue
- Some complex layouts (tables, nested lists) may not convert perfectly

### Extension Not Loading

**Problem**: The extension doesn't appear after installation

**Solutions**:
- Verify that `manifest.json` is valid JSON (no syntax errors)
- Check that all required files are present in the extension directory
- Look for errors in `about:debugging` under "This Firefox"
- Ensure you're using Firefox 109.0 or later

## Libraries Used

Gloriosa is built on top of two excellent open-source libraries:

### Readability.js (v0.6.0)

[Readability.js](https://github.com/mozilla/readability) is a standalone version of the readability library used in Firefox Reader View. It extracts the main content from web pages by:

- Identifying the primary article content
- Removing navigation, ads, and other non-essential elements
- Preserving the semantic structure of the content
- Handling various article layouts and structures

### Turndown.js (v7.2.1)

[Turndown](https://github.com/mixmark-io/turndown) is an HTML to Markdown converter that produces clean, readable Markdown. It:

- Converts HTML elements to their Markdown equivalents
- Preserves formatting like headings, lists, links, and emphasis
- Handles code blocks, images, and tables
- Provides consistent, predictable output

## Technical Details

- **Manifest Version**: 3
- **Minimum Firefox Version**: 109.0
- **Permissions**: `activeTab`, `scripting`, `clipboardWrite`
- **Architecture**: Background service worker with dynamic content script injection

## Privacy

Gloriosa respects your privacy:

- All content extraction and conversion happens locally in your browser
- No data is sent to external servers
- No tracking or analytics
- Minimal permissions requested (only what's necessary for functionality)

## Development

### Project Structure

```
/
├── manifest.json              # Extension manifest
├── gloriosa_background.js     # Background service worker
├── gloriosa_content.js        # Content script for extraction
├── lib/
│   ├── readability-0.6.0.js  # Readability library
│   └── turndown-7.2.1.js     # Turndown library
├── icons/
│   ├── icon_gray.png         # Extension icon
│   └── icon_lightgray.png    # Toolbar icon
└── README.md                  # This file
```

### Code Formatting

This project uses `.editorconfig` for consistent code formatting:

- **Charset**: UTF-8
- **Line Endings**: LF (Unix-style)
- **Indentation**: Tabs
- **Final Newline**: Required

## License

This project uses the following open-source libraries:

- Readability.js: Apache License 2.0
- Turndown.js: MIT License

## Contributing

Contributions are welcome! Please ensure:

- Code follows the `.editorconfig` formatting rules
- All changes are tested in Firefox
- Commit messages clearly describe the changes

## Support

If you encounter issues not covered in the troubleshooting section:

1. Check the browser console (F12) for error messages
2. Verify you're using Firefox 109.0 or later
3. Try disabling other extensions to rule out conflicts
4. Test on a simple article page to isolate the issue
