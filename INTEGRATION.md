# Integration with Clanker Settings

## Current Limitation

The web-search tool needs access to the same X AI API key that Clanker uses for its Grok provider. Currently, external tools don't have direct access to Clanker's settings, requiring users to set the API key as an environment variable.

## Proposed Solution

Add the following to Clanker's agent initialization to share the API key with tools:

```typescript
// In clanker/src/clanker/agent.ts constructor or initialize method:
constructor(options: GrokAgentOptions) {
    // ... existing code ...
    
    // Share API key with tools through shared state
    if (options.apiKey) {
        this.registry.getContext().sharedState.set('clanker:apiKey', options.apiKey);
    }
}
```

This would allow tools to access the API key through:
```typescript
const apiKey = context.sharedState.get('clanker:apiKey');
```

## Workaround

Until this is implemented in Clanker core, users can:

1. Set the API key as an environment variable:
   ```bash
   export GROK_API_KEY="your-api-key"
   clanker -p "Search the web..."
   ```

2. Create an alias that extracts the key from settings:
   ```bash
   # Add to ~/.bashrc or ~/.zshrc
   alias clanker='GROK_API_KEY=$(cat ~/.clanker/settings.json | jq -r .apiKey) clanker'
   ```

3. Create a wrapper script:
   ```bash
   #!/bin/bash
   # clanker-with-key
   export GROK_API_KEY=$(cat ~/.clanker/settings.json | jq -r .apiKey)
   clanker "$@"
   ```

## Security Considerations

- The API key should only be shared with trusted tools
- Consider implementing a permission system for sensitive data access
- Tools should never log or expose API keys