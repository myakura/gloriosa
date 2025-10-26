# Gloriosa

A browser extension that extracts the main content from web pages and converts it to Markdown format with a single click.

## Features

- **One-Click Extraction**: Click the browser toolbar button to instantly extract and convert page content
- **Clean Content**: Automatically removes ads, navigation, sidebars, and other clutter using Readability.js
- **Markdown Output**: Converts extracted HTML to clean, properly formatted Markdown
- **Clipboard Integration**: Automatically copies the Markdown to your clipboard for immediate use
- **Visual Feedback**: Clear success/error indicators so you know when content is ready

## Usage

1. Navigate to any web page with article content (news articles, blog posts, documentation, etc.)
2. Click the Gloriosa icon in your browser toolbar
3. Wait for the extraction to complete (you'll see a loading indicator)
4. When successful, the Markdown content is automatically copied to your clipboard
5. Paste the content into your favorite Markdown editor or note-taking app

## Supported Content

Gloriosa works best with:

- News articles
- Blog posts
- Documentation pages
- Medium articles
- Wikipedia pages
- Any page with clear article content

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

- Project license: Apache License 2.0 (see `LICENSE`)
- Notices: see `NOTICE` and `THIRD_PARTY_NOTICES.txt`

This project uses the following open-source libraries:

- Readability.js: Apache License 2.0
- Turndown.js: MIT License
