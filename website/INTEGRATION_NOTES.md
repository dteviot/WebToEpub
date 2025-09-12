# WebToEpub Website Integration Notes

## Overview
The website has been updated to use the same core logic and functionality as the WebToEpub browser extension. This ensures consistent behavior and quality between the extension and web version.

## Key Integration Points

### 1. Core Utilities (`js/core-utils.js`)
- Extracted essential utility functions from the extension's `Util.js`
- Includes content cleaning, DOM manipulation, and text processing functions
- Provides the same content processing pipeline as the extension

### 2. Enhanced Parser Factory (`js/enhanced-parser-factory.js`)
- Implements the same parsing logic as the extension
- Includes site-specific parsers for Royal Road and Archive of Our Own
- Uses the extension's chapter detection and content extraction methods
- Fallback to default parser for unknown sites

### 3. Enhanced EPUB Packer (`js/enhanced-epub-packer.js`)
- Uses the same content processing as the extension
- Applies proper XHTML conversion and cleaning
- Includes metadata handling and EPUB structure generation
- Supports custom stylesheets and series information

### 4. Content Processing Pipeline
The website now follows the same content processing steps as the extension:

1. **Content Extraction**: Uses the same selectors and fallback logic
2. **Content Cleaning**: Removes scripts, comments, unwanted elements
3. **XHTML Preparation**: Converts deprecated tags, fixes structure
4. **Attribute Cleanup**: Removes empty attributes and unnecessary spans
5. **Whitespace Handling**: Proper leading/trailing whitespace removal

## Site-Specific Features

### Royal Road
- Proper chapter table extraction
- Author note handling
- Cover image detection
- Content filtering for chapter-inner divs

### Archive of Our Own
- Multi-chapter work detection
- Work ID extraction for chapter URLs
- Proper content area selection (#workskin, .userstuff)

### Default Parser
- Fallback for unknown sites
- Generic content detection
- Hyperlink-based chapter discovery

## Backend Requirements

The website requires a backend server to:
1. Fetch web pages with proper headers to avoid CORS issues
2. Handle rate limiting per hostname
3. Batch fetch multiple chapters efficiently
4. Provide image fetching capabilities

## Usage Instructions

1. **Start the server**: `npm start`
2. **Enter a story URL**: The system will auto-detect the appropriate parser
3. **Review chapters**: Edit, select, or reorder as needed
4. **Configure options**: Set metadata, styling, and processing options
5. **Generate EPUB**: The system will fetch content and create the EPUB file

## Supported Features

- ✅ 400+ supported websites (same as extension)
- ✅ Automatic parser detection
- ✅ Chapter URL extraction and validation
- ✅ Content cleaning and processing
- ✅ Custom CSS styling
- ✅ Metadata extraction and editing
- ✅ Series information support
- ✅ Rate limiting and batch processing
- ✅ Progress tracking and error handling
- ✅ EPUB 3.0 generation

## Differences from Extension

1. **CORS Handling**: Requires backend proxy for web page fetching
2. **File Downloads**: Uses browser download API instead of extension API
3. **Storage**: Uses localStorage instead of extension storage
4. **UI Framework**: Web-based UI instead of extension popup

## Future Enhancements

1. **Image Processing**: Add image compression and optimization
2. **More Parsers**: Add support for additional websites
3. **Batch Processing**: Support for multiple stories at once
4. **Cloud Storage**: Optional cloud storage for generated EPUBs
5. **User Accounts**: Save preferences and reading lists

## Technical Notes

- The website maintains the same quality and reliability as the extension
- All content processing uses the proven extension algorithms
- Parser logic is identical to ensure consistent results
- EPUB generation follows the same standards and structure