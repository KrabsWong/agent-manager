/**
 * GitHub Service
 *
 * Handles GitHub API operations for skill discovery
 */

import log from 'electron-log';
import { errors } from '../../utils/errors';
import { configStore } from '../../utils/config-store';

export interface GitHubRepo {
  owner: string;
  name: string;
  url: string;
  description?: string;
  stars: number;
}

export interface GitHubSkill {
  name: string;
  directory: string;
  description?: string;
  readmeContent?: string;
}

export class GitHubService {
  private baseUrl = 'https://api.github.com';

  /**
   * Get GitHub API headers with optional auth token
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'CC-Switch/4.0.0',
    };

    // Check if user has configured a GitHub token
    const settings = configStore.getSettings();
    if (settings.githubToken) {
      headers['Authorization'] = `token ${settings.githubToken}`;
    }

    return headers;
  }

  /**
   * Handle GitHub API errors with better messages
   */
  private handleApiError(response: Response, context: string): never {
    if (response.status === 403) {
      const isRateLimit = response.headers.get('X-RateLimit-Remaining') === '0';
      if (isRateLimit) {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const resetDate = resetTime
          ? new Date(parseInt(resetTime) * 1000).toLocaleTimeString()
          : 'soon';

        throw new Error(
          `GitHub API rate limit exceeded. Resets at ${resetDate}. ` +
            `Consider adding a GitHub personal access token in Settings to increase your rate limit.`
        );
      }
    }

    if (response.status === 404) {
      throw errors.notFound(context, 'Resource not found');
    }

    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  /**
   * Scan a GitHub repository for skills
   * Skills are directories containing a README.md file
   */
  async scanRepo(owner: string, repo: string): Promise<GitHubSkill[]> {
    try {
      log.info(`Scanning GitHub repo: ${owner}/${repo}`);

      // Get repository contents
      const contents = await this.getRepoContents(owner, repo);

      // Filter for directories that might contain skills
      const skills: GitHubSkill[] = [];

      for (const item of contents) {
        if (item.type === 'dir') {
          // Check if directory contains a skill (has README or specific files)
          const skillInfo = await this.getSkillInfo(owner, repo, item.name);
          if (skillInfo) {
            skills.push(skillInfo);
          }
        }
      }

      log.info(`Found ${skills.length} skills in ${owner}/${repo}`);
      return skills;
    } catch (error) {
      log.error(`Failed to scan repo ${owner}/${repo}:`, error);
      throw errors.networkError('github', error);
    }
  }

  /**
   * Get repository contents at root level
   */
  private async getRepoContents(
    owner: string,
    repo: string,
    path = ''
  ): Promise<
    Array<{
      name: string;
      type: string;
      path: string;
    }>
  > {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/contents/${path}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      this.handleApiError(response, 'Repository');
    }

    return response.json();
  }

  /**
   * Get skill info from a directory
   */
  private async getSkillInfo(
    owner: string,
    repo: string,
    directory: string
  ): Promise<GitHubSkill | null> {
    try {
      // Check for README.md
      const readmeUrl = `${this.baseUrl}/repos/${owner}/${repo}/contents/${directory}/README.md`;
      const readmeResponse = await fetch(readmeUrl, {
        headers: this.getHeaders(),
      });

      if (!readmeResponse.ok) {
        return null;
      }

      const readmeData = await readmeResponse.json();
      const readmeContent = readmeData.content
        ? Buffer.from(readmeData.content, 'base64').toString('utf-8')
        : '';

      // Parse description from first line of README
      const description = this.extractDescription(readmeContent);

      return {
        name: directory,
        directory,
        description,
        readmeContent,
      };
    } catch (error) {
      log.warn(`Failed to get skill info for ${directory}:`, error);
      return null;
    }
  }

  /**
   * Extract description from README content
   */
  private extractDescription(readme: string): string | undefined {
    // Try to get the first paragraph after any headers
    const lines = readme.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip headers and empty lines
      if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('---')) {
        return trimmed.slice(0, 200); // Limit to 200 chars
      }
    }

    return undefined;
  }

  /**
   * Get raw file content from GitHub
   */
  async getRawFile(owner: string, repo: string, path: string): Promise<string> {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;

    const response = await fetch(url);

    if (!response.ok) {
      // Try with 'master' branch
      const masterUrl = `https://raw.githubusercontent.com/${owner}/${repo}/master/${path}`;
      const masterResponse = await fetch(masterUrl);

      if (!masterResponse.ok) {
        throw errors.notFound('File', path);
      }

      return masterResponse.text();
    }

    return response.text();
  }

  /**
   * Get repository info
   */
  async getRepoInfo(owner: string, repo: string): Promise<GitHubRepo> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      this.handleApiError(response, 'Repository');
    }

    const data = await response.json();

    return {
      owner,
      name: repo,
      url: data.html_url,
      description: data.description,
      stars: data.stargazers_count,
    };
  }
}

export const githubService = new GitHubService();
