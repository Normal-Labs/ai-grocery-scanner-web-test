/**
 * Research Agent Tool Configurations
 * 
 * Defines and configures tools for the AI Research Agent:
 * - Tavily Search: Web discovery of product information
 * - Jina Reader: Clean content extraction from URLs
 * 
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7, 13.8
 */

import { tool } from 'ai';
import { tavilySearch } from '@tavily/ai-sdk';
import { z } from 'zod';
import type { TierType } from './types';

/**
 * Get Tavily Search tool
 * 
 * Uses @tavily/ai-sdk for real-time web discovery.
 * Searches for product URLs, manufacturer data, and sustainability reports.
 * 
 * Requirements: 13.1, 13.2, 13.3
 */
export function getTavilyTool() {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not set - search tool will not be available');
    return null;
  }

  return tavilySearch({
    apiKey,
    maxResults: 5,
    searchDepth: 'advanced',
    includeAnswer: true,
    includeRawContent: false,
  });
}

/**
 * Get Jina Reader tool
 * 
 * Custom tool that extracts clean Markdown content from web pages.
 * Uses Jina AI's Reader API for content extraction.
 * 
 * Requirements: 13.4, 13.5, 13.6
 * 
 * NOTE: Temporarily disabled due to tool() API compatibility issues
 * Will be re-enabled after resolving type definitions
 */
export function getJinaReaderTool() {
  // Temporarily return null - will implement after resolving tool() API
  return null;
  
  /* Original implementation - to be restored:
  return tool({
    description: 'Extract clean, readable content from a web page URL for deep analysis',
    parameters: z.object({
      url: z.string().url().describe('The URL to scrape and extract content from'),
    }),
    execute: async ({ url }: { url: string }) => {
      try {
        const urlObj = new URL(url);
        if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
          throw new Error('Only HTTP and HTTPS URLs are allowed');
        }

        const response = await fetch(`https://r.jina.ai/${url}`, {
          headers: {
            'Accept': 'text/event-stream',
            'X-Return-Format': 'markdown',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to scrape URL: ${response.statusText}`);
        }

        const markdown = await response.text();

        return {
          url,
          content: markdown.substring(0, 10000),
          success: true,
        };
      } catch (error) {
        console.error('Jina Reader error:', error);
        return {
          url,
          content: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });
  */
}

/**
 * Get tools configuration based on tier
 * 
 * Free tier: Returns empty object (no tool-calling)
 * Premium tier: Returns both Tavily Search and Jina Reader tools
 * 
 * Requirements: 13.7, 13.8
 */
export function getToolsForTier(tier: TierType) {
  if (tier === 'free') {
    // Free tier: No tool-calling
    return {};
  }

  // Premium tier: Full tool-calling enabled
  const tavilyTool = getTavilyTool();

  const tools: Record<string, any> = {};

  // Only add Tavily if API key is available
  if (tavilyTool) {
    tools.tavilySearch = tavilyTool;
  }

  // Note: Jina Reader tool temporarily disabled due to type issues
  // Will be re-enabled after resolving tool() API compatibility
  // tools.scrape_url = getJinaReaderTool();

  return tools;
}
