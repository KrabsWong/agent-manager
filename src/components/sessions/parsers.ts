/**
 * Message Content Parsers
 *
 * 可扩展的消息内容解析系统，支持按 appType 注册特殊的解析器
 * 用于处理不同应用中消息内容的特殊格式
 */

export interface ParsedContent {
  type: 'text' | 'file' | 'tool' | 'code';
  content: string;
  metadata?: Record<string, string>;
}

export type ContentParser = (content: string) => ParsedContent[];

/**
 * 去除文件内容中的行号
 * 例如: "1: content\n2: content" -> "content\ncontent"
 */
function stripLineNumbers(content: string): string {
  // 匹配行首的数字和冒号，如 "123: " 或 "1:"
  return content
    .split('\n')
    .map((line) => line.replace(/^\d+:\s?/, ''))
    .join('\n');
}

/**
 * OpenCode 文件引用解析器
 * 处理格式: <path>...</path>\n<type>...</type>\n<content>...</content>
 */
const opencodeFileParser: ContentParser = (content: string) => {
  const results: ParsedContent[] = [];
  const fileBlockRegex =
    /<path>([\s\S]*?)<\/path>\s*<type>([\s\S]*?)<\/type>\s*<content>([\s\S]*?)<\/content>/g;

  let lastIndex = 0;
  let match;

  while ((match = fileBlockRegex.exec(content)) !== null) {
    // 添加匹配前的普通文本
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        results.push({
          type: 'text',
          content: textBefore,
        });
      }
    }

    // 添加文件引用块
    const [_, filePath, fileType, fileContent] = match;
    // 去除行号后再存储
    const cleanedContent = stripLineNumbers(fileContent.trim());
    results.push({
      type: 'file',
      content: cleanedContent,
      metadata: {
        path: filePath.trim(),
        type: fileType.trim(),
      },
    });

    lastIndex = fileBlockRegex.lastIndex;
  }

  // 添加剩余文本
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim();
    if (remainingText) {
      results.push({
        type: 'text',
        content: remainingText,
      });
    }
  }

  // 如果没有匹配到任何文件块，返回原始内容
  if (results.length === 0) {
    results.push({
      type: 'text',
      content: content,
    });
  }

  return results;
};

/**
 * 默认解析器 - 将内容作为纯文本处理
 */
const defaultParser: ContentParser = (content: string) => [
  {
    type: 'text',
    content: content,
  },
];

/**
 * 解析器注册表
 * key: appType, value: ContentParser
 */
const parserRegistry: Map<string, ContentParser> = new Map([['opencode', opencodeFileParser]]);

/**
 * 注册自定义解析器
 * @param appType - 应用类型标识
 * @param parser - 解析器函数
 */
export function registerContentParser(appType: string, parser: ContentParser): void {
  parserRegistry.set(appType, parser);
}

/**
 * 获取指定应用类型的解析器
 * @param appType - 应用类型
 * @returns 对应的解析器，如果没有则返回默认解析器
 */
export function getContentParser(appType: string): ContentParser {
  return parserRegistry.get(appType) || defaultParser;
}

/**
 * 解析消息内容
 * @param content - 原始消息内容
 * @param appType - 应用类型
 * @returns 解析后的内容块数组
 */
export function parseMessageContent(content: string, appType?: string): ParsedContent[] {
  const parser = appType ? getContentParser(appType) : defaultParser;
  return parser(content);
}

/**
 * 检查是否需要特殊解析
 * @param appType - 应用类型
 * @returns 是否有注册的解析器
 */
export function hasSpecialParser(appType?: string): boolean {
  if (!appType) return false;
  return parserRegistry.has(appType);
}

/**
 * 注销解析器（用于测试或动态配置）
 * @param appType - 应用类型
 */
export function unregisterContentParser(appType: string): void {
  parserRegistry.delete(appType);
}
