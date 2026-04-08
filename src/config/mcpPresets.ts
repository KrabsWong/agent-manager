/**
 * MCP Server Presets
 * 
 * Pre-configured MCP servers for common use cases
 */

import type { CreateMcpServerInput } from '@/types';

export interface McpPreset {
  id: string;
  name: string;
  description: string;
  category: string;
  config: CreateMcpServerInput;
}

export const MCP_PRESETS: McpPreset[] = [
  // File System
  {
    id: 'filesystem',
    name: 'File System',
    description: 'Read and write files on the local file system',
    category: 'Core',
    config: {
      name: 'filesystem',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
      description: 'Local file system access',
    },
  },

  // Git
  {
    id: 'git',
    name: 'Git',
    description: 'Git repository operations and analysis',
    category: 'Development',
    config: {
      name: 'git',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-git'],
      description: 'Git repository tools',
    },
  },

  // GitHub
  {
    id: 'github',
    name: 'GitHub',
    description: 'GitHub API integration and repository management',
    category: 'Development',
    config: {
      name: 'github',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_TOKEN}',
      },
      description: 'GitHub integration',
    },
  },

  // PostgreSQL
  {
    id: 'postgres',
    name: 'PostgreSQL',
    description: 'PostgreSQL database integration with schema inspection',
    category: 'Database',
    config: {
      name: 'postgres',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', 'postgresql://localhost/mydb'],
      description: 'PostgreSQL database access',
    },
  },

  // SQLite
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'SQLite database operations',
    category: 'Database',
    config: {
      name: 'sqlite',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-sqlite', '--db-path', '/path/to/database.db'],
      description: 'SQLite database access',
    },
  },

  // Puppeteer
  {
    id: 'puppeteer',
    name: 'Puppeteer',
    description: 'Browser automation and web scraping',
    category: 'Web',
    config: {
      name: 'puppeteer',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-puppeteer'],
      description: 'Web browser automation',
    },
  },

  // Fetch
  {
    id: 'fetch',
    name: 'Fetch',
    description: 'Web content fetching and conversion for LLM usage',
    category: 'Web',
    config: {
      name: 'fetch',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-fetch'],
      description: 'Web content fetching',
    },
  },

  // Brave Search
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Web and local search using Brave Search API',
    category: 'Search',
    config: {
      name: 'brave-search',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: {
        BRAVE_API_KEY: '${BRAVE_API_KEY}',
      },
      description: 'Brave Search API integration',
    },
  },

  // Memory
  {
    id: 'memory',
    name: 'Memory',
    description: 'Knowledge graph-based persistent memory system',
    category: 'Core',
    config: {
      name: 'memory',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
      description: 'Persistent memory storage',
    },
  },

  // Sequential Thinking
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Dynamic and reflective problem-solving through structured thinking',
    category: 'Core',
    config: {
      name: 'sequential-thinking',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      description: 'Structured thinking tools',
    },
  },

  // Slack
  {
    id: 'slack',
    name: 'Slack',
    description: 'Slack workspace integration',
    category: 'Communication',
    config: {
      name: 'slack',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: {
        SLACK_BOT_TOKEN: '${SLACK_BOT_TOKEN}',
        SLACK_TEAM_ID: '${SLACK_TEAM_ID}',
      },
      description: 'Slack integration',
    },
  },

  // Google Maps
  {
    id: 'google-maps',
    name: 'Google Maps',
    description: 'Location services, routing, and place details',
    category: 'Location',
    config: {
      name: 'google-maps',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-google-maps'],
      env: {
        GOOGLE_MAPS_API_KEY: '${GOOGLE_MAPS_API_KEY}',
      },
      description: 'Google Maps integration',
    },
  },

  // Time
  {
    id: 'time',
    name: 'Time',
    description: 'Time and timezone conversion capabilities',
    category: 'Core',
    config: {
      name: 'time',
      transport: 'stdio',
      command: 'uvx',
      args: ['mcp-server-time'],
      description: 'Time and timezone tools',
    },
  },
];

export const MCP_CATEGORIES = [...new Set(MCP_PRESETS.map(p => p.category))];
