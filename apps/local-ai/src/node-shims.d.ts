declare module 'node:crypto' {
  export function createHash(algorithm: string): {
    update(data: string): { digest(encoding: string): string };
  };
}
declare module 'node:http' {
  export interface IncomingMessage {
    on(event: 'data', listener: (chunk: Buffer) => void): unknown;
    on(event: 'end' | 'error', listener: () => void): unknown;
    destroy(): void;
    url?: string | undefined;
    method?: string | undefined;
    headers: Record<string, string | string[] | undefined>;
  }
  export interface ServerResponse {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(data?: string): void;
    headersSent: boolean;
  }
  export interface AddressInfo {
    port: number;
    address: string;
    family: string;
  }
  export interface Server {
    listen(port: number, host: string, callback: () => void): void;
    close(callback?: () => void): void;
    address(): AddressInfo | string | null;
  }
  export function createServer(
    handler: (request: IncomingMessage, response: ServerResponse) => void,
  ): Server;
}
declare const process: {
  env: Record<string, string | undefined>;
  stdout: { write(data: string): void };
};
declare const Buffer: {
  concat(list: readonly Buffer[]): Buffer;
  from(data: string, encoding?: string): Buffer;
};
interface Buffer {
  length: number;
  toString(encoding: string): string;
}
