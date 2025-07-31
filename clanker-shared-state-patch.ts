// Patch for clanker/src/clanker/agent.ts
// Add this after line 73 where registry is created

// Share API key with tools through shared state
// This allows tools like web-search to access the same API key
if (options.apiKey) {
    this.registry.getContext().sharedState.set('clanker:apiKey', options.apiKey);
    debug.log('[GrokAgent] Shared API key with tools via shared state');
}

// Also share the provider and base URL for tools that might need it
this.registry.getContext().sharedState.set('clanker:provider', 'grok');
if (options.baseURL) {
    this.registry.getContext().sharedState.set('clanker:baseURL', options.baseURL);
}