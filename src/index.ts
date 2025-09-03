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
  .numberArg('max_results', 'Maximum number of results to return (max_search_results)', {
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
  .booleanArg('return_citations', 'Whether to return source citations', {
    required: false,
    default: true
  })
  .booleanArg('return_images', 'Whether to return related images', {
    required: false,
    default: false
  })
  .stringArg('include_domains', 'Comma-separated list of domains to include (e.g., "wikipedia.org,github.com")', {
    required: false
  })
  .stringArg('exclude_domains', 'Comma-separated list of domains to exclude (e.g., "facebook.com,instagram.com")', {
    required: false
  })
  .stringArg('search_mode', 'Search mode: auto, on, or off (controls whether to use web search)', {
    required: false,
    default: 'on',
    enum: ['auto', 'on', 'off']
  })
  .numberArg('recency_weight', 'Weight for recency (0.0 to 1.0) - higher values favor more recent results', {
    required: false,
    default: 0.5,
    validate: (value: number) => value >= 0 && value <= 1 || 'Recency weight must be between 0.0 and 1.0'
  })
  .stringArg('custom_date_from', 'Custom start date for search (YYYY-MM-DD format)', {
    required: false
  })
  .stringArg('custom_date_to', 'Custom end date for search (YYYY-MM-DD format)', {
    required: false
  })
  
  // Execute
  .execute(async (args: ToolArguments, context: ToolContext) => {
    const { 
      query, 
      search_type, 
      max_results, 
      time_range, 
      language,
      return_citations,
      return_images,
      include_domains,
      exclude_domains,
      search_mode,
      recency_weight,
      custom_date_from,
      custom_date_to
    } = args;
    
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
      let toDate = custom_date_to || new Date().toISOString().split('T')[0];
      let fromDate = custom_date_from || calculateFromDate(String(time_range));
      
      // Build search parameters object
      const searchParameters: any = {
        max_search_results: Number(max_results) || DEFAULT_MAX_RESULTS,
        return_citations: return_citations !== false,
        mode: search_mode || 'on'
      };
      
      // Add date range if specified
      if (fromDate) searchParameters.from_date = fromDate;
      if (toDate && time_range !== 'all') searchParameters.to_date = toDate;
      
      // Add image results if requested
      if (return_images) searchParameters.return_images = true;
      
      // Add recency weight if different from default
      if (recency_weight !== undefined && recency_weight !== 0.5) {
        searchParameters.recency_weight = Number(recency_weight);
      }
      
      // Add domain filters if specified
      if (include_domains) {
        const domains = String(include_domains).split(',').map(d => d.trim()).filter(d => d);
        if (domains.length > 0) {
          searchParameters.include_domains = domains;
        }
      }
      
      if (exclude_domains) {
        const domains = String(exclude_domains).split(',').map(d => d.trim()).filter(d => d);
        if (domains.length > 0) {
          searchParameters.exclude_domains = domains;
        }
      }
      
      // Build system message based on search type
      let systemMessage = '';
      if (search_type === 'twitter') {
        systemMessage = `You are a search assistant. Search Twitter/X for the latest posts and information about: ${query}. Focus on recent tweets and discussions.`;
      } else if (search_type === 'web') {
        systemMessage = `You are a search assistant. Search the web for information about: ${query}. Provide a comprehensive summary of the results from websites and articles.`;
      } else {
        systemMessage = `You are a search assistant. Search both the web and Twitter/X for information about: ${query}. Provide a comprehensive summary combining results from both sources.`;
      }
      
      // Add language preference if specified
      if (language && language !== 'en') {
        systemMessage += ` Prioritize results in ${language} language.`;
      }
      
      // Build request body with search parameters
      const requestBody = {
        model: 'grok-3',
        messages: [
          {
            role: 'system',
            content: systemMessage
          },
          {
            role: 'user',
            content: String(query)
          }
        ],
        search_parameters: searchParameters,
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
      
      // Add images if returned
      if (data.images && data.images.length > 0) {
        output += `\n\n### Related Images:\n`;
        data.images.forEach((image: any, index: number) => {
          if (typeof image === 'string') {
            output += `${index + 1}. ![Image ${index + 1}](${image})\n`;
          } else if (image.url) {
            output += `${index + 1}. ![${image.title || `Image ${index + 1}`}](${image.url})`;
            if (image.source) output += ` - [Source](${image.source})`;
            output += '\n';
          }
        });
      }
      
      if (data.citations && data.citations.length > 0) {
        output += `\n\n### Sources:\n`;
        data.citations.forEach((citation: string, index: number) => {
          output += `${index + 1}. ${citation}\n`;
        });
      }
      
      // Add search metadata
      const metadata: string[] = [];
      if (sourcesUsed > 0) metadata.push(`${sourcesUsed} sources searched`);
      if (searchParameters.include_domains) metadata.push(`Domains: ${searchParameters.include_domains.join(', ')}`);
      if (searchParameters.exclude_domains) metadata.push(`Excluded: ${searchParameters.exclude_domains.join(', ')}`);
      if (recency_weight !== 0.5) metadata.push(`Recency weight: ${recency_weight}`);
      
      if (metadata.length > 0) {
        output += `\n\n*${metadata.join(' | ')}*`;
      }
      
      context.logger?.info(`Search completed successfully using ${sourcesUsed} sources`);
      
      return {
        success: true,
        output: output.trim(),
        data: {
          query,
          content,
          citations: data.citations || [],
          images: data.images || [],
          sources_used: sourcesUsed,
          search_parameters: searchParameters
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
      description: 'Basic web search',
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
      description: 'Search with domain filtering',
      arguments: {
        query: 'machine learning tutorials',
        max_results: 20,
        include_domains: 'github.com,arxiv.org',
        exclude_domains: 'facebook.com'
      },
      result: 'Returns results only from GitHub and arXiv, excluding Facebook'
    },
    {
      description: 'Search with custom date range',
      arguments: {
        query: 'climate change research',
        custom_date_from: '2024-01-01',
        custom_date_to: '2024-06-30',
        return_citations: true
      },
      result: 'Returns results from first half of 2024 with source citations'
    },
    {
      description: 'Search prioritizing recent results',
      arguments: {
        query: 'breaking news technology',
        recency_weight: 0.9,
        max_results: 30,
        time_range: 'day'
      },
      result: 'Returns up to 30 results heavily weighted toward most recent content'
    },
    {
      description: 'Search with images',
      arguments: {
        query: 'SpaceX Starship launch',
        return_images: true,
        search_type: 'all',
        max_results: 15
      },
      result: 'Returns results from web and Twitter with related images'
    },
    {
      description: 'Academic search',
      arguments: {
        query: 'quantum computing algorithms',
        include_domains: 'arxiv.org,scholar.google.com,ieee.org',
        recency_weight: 0.3,
        max_results: 25
      },
      result: 'Returns academic results with less emphasis on recency'
    }
  ])
  
  .build();