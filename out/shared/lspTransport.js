"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamMessageWriter = exports.StreamMessageReader = void 0;
exports.isRequestMessage = isRequestMessage;
exports.isNotificationMessage = isNotificationMessage;
exports.isResponseMessage = isResponseMessage;
const HEADER_SEPARATOR = '\r\n\r\n';
class StreamMessageReader {
    constructor(readable) {
        this.readable = readable;
        this.buffer = Buffer.alloc(0);
        this.nextContentLength = null;
    }
    listen(callback) {
        this.readable.on('data', (chunk) => {
            this.buffer = Buffer.concat([this.buffer, chunk]);
            this.processBuffer(callback);
        });
    }
    processBuffer(callback) {
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
                const message = JSON.parse(body);
                callback(message);
            }
            catch {
                // Ignore JSON parse errors; continue processing the stream.
            }
        }
    }
}
exports.StreamMessageReader = StreamMessageReader;
class StreamMessageWriter {
    constructor(writable) {
        this.writable = writable;
    }
    write(message) {
        const payload = JSON.stringify(message);
        const contentLength = Buffer.byteLength(payload, 'utf8');
        const header = `Content-Length: ${contentLength}\r\n\r\n`;
        this.writable.write(header + payload, 'utf8');
    }
}
exports.StreamMessageWriter = StreamMessageWriter;
function isRequestMessage(message) {
    return typeof message === 'object' && message !== null && message.method !== undefined && message.id !== undefined;
}
function isNotificationMessage(message) {
    return typeof message === 'object' && message !== null && message.method !== undefined && message.id === undefined;
}
function isResponseMessage(message) {
    return typeof message === 'object' && message !== null && message.method === undefined && message.id !== undefined;
}
//# sourceMappingURL=lspTransport.js.map