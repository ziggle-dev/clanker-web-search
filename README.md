# Clanker Web Search Tool

A powerful web and Twitter/X search tool for Clanker that uses X AI's API to provide real-time search results from across the internet.

## Features

- 🔍 **Web Search**: Search the entire web for current information
- 🐦 **Twitter/X Search**: Search Twitter/X for real-time posts and discussions
- 🌐 **Combined Search**: Search both web and Twitter simultaneously
- ⏰ **Time Filtering**: Filter results by time range (hour, day, week, month, year)
- 🌍 **Language Support**: Search in multiple languages
- 📊 **Configurable Results**: Control the number of results returned

## Installation

### Install from Clanker Registry

```bash
clanker install web-search
```

### Install Locally for Testing

```bash
clanker install --local /path/to/clanker-web-search
```

## Configuration

### API Key Setup

The tool requires an X AI API key. You can provide it in two ways:

1. **Environment Variable** (Recommended):
   ```bash
   export X_AI_API_KEY="your-api-key-here"
   ```

2. **Command Argument**:
   ```bash
   clanker run web-search --query "your search" --api_key "your-api-key-here"
   ```

Get your API key at: https://x.ai/api

## Usage

### Basic Web Search

```bash
clanker run web-search --query "latest AI developments"
```

### Twitter/X Search

```bash
clanker run web-search --query "OpenAI announcements" --search_type twitter --time_range day
```

### Combined Search with Parameters

```bash
clanker run web-search \
  --query "machine learning tutorials" \
  --search_type all \
  --max_results 20 \
  --time_range week \
  --language en
```

## Arguments

| Argument | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `query` | string | Yes | - | The search query to execute |
| `api_key` | string | No | env:X_AI_API_KEY | X AI API key |
| `search_type` | string | No | all | Type of search: `web`, `twitter`, or `all` |
| `max_results` | number | No | 10 | Maximum results (1-50) |
| `time_range` | string | No | all | Time filter: `hour`, `day`, `week`, `month`, `year`, `all` |
| `language` | string | No | en | Language code (e.g., en, es, fr) |

## Examples

### Search for Recent News

```bash
clanker run web-search --query "breaking news technology" --time_range day
```

Output:
```
Found 10 results for "breaking news technology":

1. **Major Tech Company Announces AI Breakthrough**
   URL: https://example.com/tech-news/ai-breakthrough
   Source: TechNews
   Published: 2024-01-20 14:30:00
   A major technology company today announced a significant breakthrough in artificial intelligence...

2. **New Quantum Computing Milestone Achieved**
   URL: https://example.com/quantum-computing
   Source: ScienceDaily
   Published: 2024-01-20 12:15:00
   Researchers have achieved a new milestone in quantum computing...

[...]
```

### Search Twitter for Trending Topics

```bash
clanker run web-search \
  --query "#MachineLearning" \
  --search_type twitter \
  --max_results 5 \
  --time_range hour
```

### Multi-language Search

```bash
clanker run web-search \
  --query "inteligencia artificial" \
  --language es \
  --max_results 15
```

## Error Handling

The tool provides clear error messages for common issues:

- **Missing API Key**: Prompts to provide API key via argument or environment variable
- **Invalid API Key**: Returns 401 error with instructions to check the key
- **Rate Limiting**: Returns 429 error suggesting to try again later
- **No Results**: Clearly indicates when no results are found for a query

## Development

### Building the Tool

```bash
npm install
npm run build
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

## API Rate Limits

X AI API has the following rate limits:
- Free tier: 100 requests per day
- Basic tier: 1,000 requests per day
- Pro tier: 10,000 requests per day

Check your current tier at: https://x.ai/api/dashboard

## Troubleshooting

### Common Issues

1. **"API key is required" error**
   - Ensure X_AI_API_KEY environment variable is set
   - Or provide the api_key argument when running the tool

2. **"Rate limit exceeded" error**
   - You've exceeded your daily API limit
   - Upgrade your plan or wait until the next day

3. **"No results found"**
   - Try broadening your search query
   - Check if time_range is too restrictive
   - Verify the language setting matches your query

### Debug Mode

Enable debug logging to see detailed information:

```bash
CLANKER_LOG_LEVEL=debug clanker run web-search --query "test"
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Support

- Report issues: https://github.com/ziggle-dev/clanker-web-search/issues
- X AI API documentation: https://x.ai/api/docs
- Clanker documentation: https://clanker.dev/docs