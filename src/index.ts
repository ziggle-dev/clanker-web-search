import { createTool, ToolCategory, ToolCapability, ToolArguments, ToolContext } from '@ziggler/clanker';

// Configuration constants
const DEFAULT_MAX_RESULTS = 10;
const X_AI_API_URL = 'https://api.x.ai/v1/chat/completions';

/**
 * Get API key from various sources
 * Priority: Shared state > Environment variables
 */
function getApiKey(context: ToolContext): string | undefined {
  let apiKey: string | undefined;
  
  // Try to get API key from shared state first
  const contextWithSharedState = context as any;
  if (contextWithSharedState.sharedState) {
    // Try the standard clanker:apiKey location
    const sharedApiKey = contextWithSharedState.sharedState.get('clanker:apiKey');
    if (sharedApiKey && typeof sharedApiKey === 'string') {
      apiKey = sharedApiKey;
      context.logger?.debug('Using API key from shared state (clanker:apiKey)');
      return apiKey;
    }
    
    // Also try provider-specific locations
    const provider = contextWithSharedState.sharedState.get('clanker:provider');
    if (provider === 'grok' || provider === 'openai') {
      const providerKey = contextWithSharedState.sharedState.get(`clanker:${provider}:apiKey`);
      if (providerKey && typeof providerKey === 'string') {
        apiKey = providerKey;
        context.logger?.debug(`Using API key from shared state (clanker:${provider}:apiKey)`);
        return apiKey;
      }
    }
  }
  
  // Fall back to environment variables
  apiKey = process.env.X_AI_API_KEY || process.env.GROK_API_KEY || process.env.OPENAI_API_KEY;
  if (apiKey) {
    context.logger?.debug('Using API key from environment variable');
  }
  
  return apiKey;
}

/**
 * Calculate from date based on time range
 */
function calculateFromDate(timeRange: string): string | undefined {
  if (timeRange === 'all') {
    return undefined;
  }
  
  const now = new Date();
  
  switch (timeRange) {
    case 'hour':
      now.setHours(now.getHours() - 1);
      break;
    case 'day':
      now.setDate(now.getDate() - 1);
      break;
    case 'week':
      now.setDate(now.getDate() - 7);
      break;
    case 'month':
      now.setMonth(now.getMonth() - 1);
      break;
    case 'year':
      now.setFullYear(now.getFullYear() - 1);
      break;
    default:
      return undefined;
  }
  
  return now.toISOString().split('T')[0];
}

export default createTool()
  .id('web-search')
  .name('Web Search')
  .description('Search the web and Twitter/X using X AI\'s live search API with Grok. Uses API key from Clanker settings or environment.')
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
    
    // Get API key from various sources
    const apiKey = getApiKey(context);
    
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
      // Calculate date range if specified
      const toDate = new Date().toISOString().split('T')[0];
      const fromDate = calculateFromDate(String(time_range));
      
      // Build request body with search parameters
      const requestBody = {
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: search_type === 'twitter' 
              ? `You are a search assistant. Search Twitter/X for the latest posts and information about: ${query}. Focus on recent tweets and discussions.`
              : search_type === 'web'
              ? `You are a search assistant. Search the web for information about: ${query}. Provide a comprehensive summary of the results from websites and articles.`
              : `You are a search assistant. Search both the web and Twitter/X for information about: ${query}. Provide a comprehensive summary combining results from both sources.`
          },
          {
            role: 'user',
            content: String(query)
          }
        ],
        search_parameters: {
          max_search_results: Number(max_results) || DEFAULT_MAX_RESULTS,
          return_citations: true,
          ...(fromDate && { from_date: fromDate }),
          ...(toDate && { to_date: toDate })
        },
        stream: false
      };
      
      context.logger?.debug('Request body:', JSON.stringify(requestBody, null, 2));
      
      // Make API request
      const response = await fetch(X_AI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
      
      const data = await response.json() as any;
      
      if (!data.choices || data.choices.length === 0) {
        context.logger?.error('No response from API');
        return {
          success: false,
          error: 'No response from X AI API'
        };
      }
      
      // Extract the search results from the model's response
      const content = data.choices[0].message.content;
      const sourcesUsed = data.usage?.num_sources_used || 0;
      
      // Create formatted output
      let output = `## Search Results for "${query}"\n\n`;
      output += content;
      
      if (data.citations && data.citations.length > 0) {
        output += `\n\n### Sources:\n`;
        data.citations.forEach((citation: string, index: number) => {
          output += `${index + 1}. ${citation}\n`;
        });
      }
      
      if (sourcesUsed > 0) {
        output += `\n\n*Searched ${sourcesUsed} sources*`;
      }
      
      context.logger?.info(`Search completed successfully using ${sourcesUsed} sources`);
      
      return {
        success: true,
        output: output.trim(),
        data: {
          query,
          content,
          citations: data.citations || [],
          sources_used: sourcesUsed
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