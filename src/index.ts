import { createTool, ToolCategory, ToolCapability, ToolArguments, ToolContext } from '@ziggler/clanker';

// X AI API configuration
const X_AI_API_URL = 'https://api.x.ai/v1/search';
const DEFAULT_MAX_RESULTS = 10;

// Settings interface to match Clanker's structure
interface ClankerSettings {
  apiKey: string;
  provider: 'grok' | 'openai' | 'custom';
  customBaseURL?: string;
  [key: string]: any;
}

// Search result interface
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  timestamp?: string;
}

// X AI response interface
interface XAISearchResponse {
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    source?: string;
    published_at?: string;
  }>;
  total_results?: number;
  search_time?: number;
}

export default createTool()
  .id('web-search')
  .name('Web Search')
  .description('Search the web and Twitter/X using X AI\'s API for real-time results. Uses API key from Clanker settings.')
  .category(ToolCategory.Utility)
  .capabilities(ToolCapability.NetworkAccess)
  .tags('web', 'search', 'twitter', 'x', 'ai', 'api', 'internet', 'query')
  
  // Arguments
  .stringArg('query', 'Search query to execute', { required: true })
  .stringArg('search_type', 'Type of search: web, twitter, or all', {
    required: false,
    default: 'all',
    enum: ['web', 'twitter', 'all']
  })
  .numberArg('max_results', 'Maximum number of results to return', {
    required: false,
    default: DEFAULT_MAX_RESULTS,
    validate: (value: number) => value > 0 && value <= 50 || 'Max results must be between 1 and 50'
  })
  .stringArg('time_range', 'Time range for results: hour, day, week, month, year, or all', {
    required: false,
    default: 'all',
    enum: ['hour', 'day', 'week', 'month', 'year', 'all']
  })
  .stringArg('language', 'Language code for results (e.g., en, es, fr)', {
    required: false,
    default: 'en'
  })
  
  // Execute
  .execute(async (args: ToolArguments, context: ToolContext) => {
    const { query, search_type, max_results, time_range, language } = args;
    
    // Try to get API key from context state first (if Clanker stores it there)
    let apiKey: string | undefined;
    
    // Check if Clanker has stored the API key in context state
    const stateApiKey = context.state?.get('apiKey') || context.state?.get('clanker:apiKey');
    if (stateApiKey && typeof stateApiKey === 'string') {
      apiKey = stateApiKey;
      context.logger?.debug('Using API key from context state');
    }
    
    // Fall back to environment variables
    if (!apiKey) {
      apiKey = process.env.X_AI_API_KEY || process.env.GROK_API_KEY || process.env.OPENAI_API_KEY;
      if (apiKey) {
        context.logger?.debug('Using API key from environment variable');
      }
    }
    
    if (!apiKey) {
      context.logger?.error('No API key found in settings or environment');
      return {
        success: false,
        error: 'X AI API key is required. For Clanker users: ensure Grok provider is configured in settings. Otherwise, set X_AI_API_KEY or GROK_API_KEY environment variable.'
      };
    }
    
    context.logger?.info(`Searching for: ${query}`);
    context.logger?.debug(`Search type: ${search_type}, Max results: ${max_results}, Time range: ${time_range}`);
    
    try {
      // Build search parameters
      const searchParams = new URLSearchParams({
        q: String(query),
        type: String(search_type || 'all'),
        limit: String(max_results || DEFAULT_MAX_RESULTS),
        lang: String(language || 'en')
      });
      
      if (time_range && time_range !== 'all') {
        searchParams.append('time_range', String(time_range));
      }
      
      // Make API request
      const response = await fetch(`${X_AI_API_URL}?${searchParams}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        context.logger?.error(`API error: ${response.status} - ${errorText}`);
        
        if (response.status === 401) {
          return {
            success: false,
            error: 'Invalid API key. Please check your X AI API key.'
          };
        } else if (response.status === 429) {
          return {
            success: false,
            error: 'Rate limit exceeded. Please try again later.'
          };
        }
        
        return {
          success: false,
          error: `X AI API error: ${response.status} - ${errorText}`
        };
      }
      
      const data = await response.json() as XAISearchResponse;
      
      if (!data.results || data.results.length === 0) {
        context.logger?.info('No results found');
        return {
          success: true,
          output: `No results found for query: "${query}"`,
          data: {
            query,
            results: [],
            total_results: 0
          }
        };
      }
      
      // Format results for output
      const results: SearchResult[] = data.results.map(result => ({
        title: result.title,
        url: result.url,
        snippet: result.snippet,
        source: result.source,
        timestamp: result.published_at
      }));
      
      // Create formatted output
      let output = `Found ${results.length} results for "${query}":\n\n`;
      
      results.forEach((result, index) => {
        output += `${index + 1}. **${result.title}**\n`;
        output += `   URL: ${result.url}\n`;
        if (result.source) {
          output += `   Source: ${result.source}\n`;
        }
        if (result.timestamp) {
          output += `   Published: ${new Date(result.timestamp).toLocaleString()}\n`;
        }
        output += `   ${result.snippet}\n\n`;
      });
      
      if (data.total_results && data.total_results > results.length) {
        output += `\n(Showing ${results.length} of ${data.total_results} total results)`;
      }
      
      if (data.search_time) {
        output += `\nSearch completed in ${data.search_time}ms`;
      }
      
      context.logger?.info(`Search completed successfully with ${results.length} results`);
      
      return {
        success: true,
        output: output.trim(),
        data: {
          query,
          results,
          total_results: data.total_results || results.length,
          search_time: data.search_time
        }
      };
    } catch (error) {
      context.logger?.error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: `Search failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  })
  
  // Examples
  .examples([
    {
      description: 'Search the web for information',
      arguments: {
        query: 'latest AI developments 2024'
      },
      result: 'Returns web search results about AI developments'
    },
    {
      description: 'Search Twitter/X for recent posts',
      arguments: {
        query: 'OpenAI announcements',
        search_type: 'twitter',
        time_range: 'day'
      },
      result: 'Returns recent Twitter/X posts about OpenAI'
    },
    {
      description: 'Search with custom parameters',
      arguments: {
        query: 'machine learning tutorials',
        max_results: 20,
        language: 'en',
        time_range: 'week'
      },
      result: 'Returns up to 20 English results from the past week'
    },
    {
      description: 'Search all sources',
      arguments: {
        query: 'climate change news',
        search_type: 'all',
        max_results: 15
      },
      result: 'Returns results from both web and Twitter/X'
    }
  ])
  
  .build();