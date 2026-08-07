declare module 'node:fs/promises' {
  export function mkdir(path: string, options: { recursive: boolean }): Promise<void>;
  export function writeFile(path: string, data: string, encoding: string): Promise<void>;
}
declare module 'node:path' {
  export function dirname(path: string): string;
  export function resolve(path: string): string;
}
declare module 'node:url' {
  export function fileURLToPath(url: string): string;
}
declare const process: { argv: string[] };
