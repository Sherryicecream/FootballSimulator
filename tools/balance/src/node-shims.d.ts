declare module 'node:fs/promises' {
  export function mkdir(path: string, options: { recursive: boolean }): Promise<void>;
  export function writeFile(path: string, data: string, encoding: string): Promise<void>;
}
declare module 'node:path' {
  export function dirname(path: string): string;
  export function resolve(path: string): string;
}
declare module 'node:os' {
  export function availableParallelism(): number;
}
declare module 'node:worker_threads' {
  export const isMainThread: boolean;
  export const parentPort: { postMessage(message: unknown): void } | null;
  export const workerData: unknown;
  export class Worker {
    constructor(filename: string, options: { workerData: unknown; execArgv?: string[] });
    on(event: 'message' | 'error', listener: (value: unknown) => void): this;
    on(event: 'exit', listener: (code: number) => void): this;
    terminate(): Promise<number>;
  }
}
declare module 'node:url' {
  export function fileURLToPath(url: string): string;
}
declare const process: { argv: string[]; stderr: { write(message: string): void } };
