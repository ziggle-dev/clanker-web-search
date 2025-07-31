# Changelog

All notable changes to the Clanker Web Search tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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