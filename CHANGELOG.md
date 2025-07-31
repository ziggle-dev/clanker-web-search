# Changelog

All notable changes to the Clanker Web Search tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2025-07-31

### Fixed
- Fixed sharedState access to properly use `context.sharedState` instead of `context.state`
- Registry published version now correctly retrieves API key from Clanker's shared state

### Technical
- Ensures compatibility with Clanker v0.3.64+ which shares API key via sharedState
- No changes to functionality, only internal API key retrieval logic

## [2.0.0] - 2025-07-31

### Changed
- **BREAKING**: Completely rewrote tool to use X AI's chat completions API with search_parameters
- **BREAKING**: Removed non-functional dedicated search endpoint
- Tool now uses `https://api.x.ai/v1/chat/completions` instead of non-existent `/search` endpoint

### Added
- Proper search functionality using Grok-3 model with search_parameters
- Support for date range filtering
- Citation tracking from search results
- Improved error handling and debugging

### Fixed
- Tool now actually works with X AI's real API
- Removed invalid sources parameter that was causing 422 errors

## [1.1.0] - 2024-01-20

### Changed
- Improved API key integration with Clanker settings system
- Tool now checks shared state for API key before environment variables
- Removed redundant `api_key` argument
- Better error messages for Clanker users

### Added
- Support for GROK_API_KEY environment variable
- Automatic detection of API key from Clanker shared state

## [1.0.0] - 2024-01-20

### Added
- Initial release of the Web Search tool
- Support for web searches using X AI API
- Support for Twitter/X searches
- Combined search mode (web + Twitter)
- Time range filtering (hour, day, week, month, year)
- Multi-language support
- Configurable result limits (1-50)
- Environment variable support for API key
- Comprehensive error handling
- Detailed search result formatting
- Examples for common use cases

### Security
- API key can be provided via environment variable to avoid exposure in command history

[1.0.0]: https://github.com/ziggle-dev/clanker-web-search/releases/tag/v1.0.0