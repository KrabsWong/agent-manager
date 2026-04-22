/**
 * Type declarations for JSON imports
 */
declare module '*.json' {
  const value: Record<string, unknown>;
  export default value;
}

/**
 * Type declarations for image imports
 */
declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}
