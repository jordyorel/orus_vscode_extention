import { Readable, Writable } from 'stream';

export interface JsonRpcMessage {
  jsonrpc: '2.0';
  id?: number | string | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

const HEADER_SEPARATOR = '\r\n\r\n';

export class StreamMessageReader {
  private buffer = Buffer.alloc(0);
  private nextContentLength: number | null = null;

  constructor(private readonly readable: Readable) {}

  listen(callback: (message: JsonRpcMessage) => void): void {
    this.readable.on('data', (chunk: Buffer) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.processBuffer(callback);
    });
  }

  private processBuffer(callback: (message: JsonRpcMessage) => void): void {
    while (true) {
      if (this.nextContentLength === null) {
        const headerEnd = this.buffer.indexOf(HEADER_SEPARATOR);
        if (headerEnd === -1) {
          return;
        }

        const header = this.buffer.slice(0, headerEnd).toString('utf8');
        const match = /Content-Length:\s*(\d+)/i.exec(header);

        if (!match) {
          // Malformed header; drop it and continue listening.
          this.buffer = this.buffer.slice(headerEnd + HEADER_SEPARATOR.length);
          continue;
        }

        this.nextContentLength = Number.parseInt(match[1], 10);
        this.buffer = this.buffer.slice(headerEnd + HEADER_SEPARATOR.length);
      }

      if (this.nextContentLength === null) {
        return;
      }

      if (this.buffer.length < this.nextContentLength) {
        return;
      }

      const body = this.buffer.slice(0, this.nextContentLength).toString('utf8');
      this.buffer = this.buffer.slice(this.nextContentLength);
      this.nextContentLength = null;

      try {
        const message = JSON.parse(body) as JsonRpcMessage;
        callback(message);
      } catch {
        // Ignore JSON parse errors; continue processing the stream.
      }
    }
  }
}

export class StreamMessageWriter {
  constructor(private readonly writable: Writable) {}

  write(message: JsonRpcMessage): void {
    const payload = JSON.stringify(message);
    const contentLength = Buffer.byteLength(payload, 'utf8');
    const header = `Content-Length: ${contentLength}\r\n\r\n`;
    this.writable.write(header + payload, 'utf8');
  }
}

export function isRequestMessage(message: JsonRpcMessage): message is JsonRpcMessage & {
  id: number | string;
  method: string;
} {
  return typeof message === 'object' && message !== null && message.method !== undefined && message.id !== undefined;
}

export function isNotificationMessage(message: JsonRpcMessage): message is JsonRpcMessage & {
  method: string;
  id?: null;
} {
  return typeof message === 'object' && message !== null && message.method !== undefined && message.id === undefined;
}

export function isResponseMessage(message: JsonRpcMessage): message is JsonRpcMessage & {
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
} {
  return typeof message === 'object' && message !== null && message.method === undefined && message.id !== undefined;
}
