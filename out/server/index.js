"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path = __importStar(require("path"));
const lspTransport_1 = require("../shared/lspTransport");
class KeywordIndex {
    constructor(keywordsFile) {
        this.keywordsFile = keywordsFile;
        this.descriptions = new Map();
        this.load();
    }
    load() {
        try {
            const contents = (0, fs_1.readFileSync)(this.keywordsFile, 'utf8');
            const lines = contents.split(/\r?\n/);
            for (const line of lines) {
                const match = /^\|\s*`([a-z_]+)`\s*\|\s*([^|]+)\|/i.exec(line);
                if (match) {
                    const keyword = match[1].trim();
                    const description = match[2].trim();
                    this.descriptions.set(keyword, description);
                }
            }
        }
        catch {
            // Failed to load keyword metadata; operate with an empty map.
        }
    }
    lookup(term) {
        return this.descriptions.get(term);
    }
}
class DocumentStore {
    constructor() {
        this.documents = new Map();
    }
    open(doc) {
        this.documents.set(doc.uri, doc.text);
    }
    change(change) {
        if (change.contentChanges.length > 0) {
            this.documents.set(change.textDocument.uri, change.contentChanges[0].text);
        }
    }
    close(uri) {
        this.documents.delete(uri);
    }
    get(uri) {
        return this.documents.get(uri);
    }
}
class OrusLanguageServer {
    constructor() {
        this.reader = new lspTransport_1.StreamMessageReader(process.stdin);
        this.writer = new lspTransport_1.StreamMessageWriter(process.stdout);
        this.keywordIndex = new KeywordIndex(path.join(__dirname, '../../docs/KEYWORDS.md'));
        this.documents = new DocumentStore();
    }
    start() {
        this.reader.listen((message) => this.handleMessage(message));
    }
    handleMessage(message) {
        if ((0, lspTransport_1.isRequestMessage)(message)) {
            this.handleRequest(message);
            return;
        }
        if ((0, lspTransport_1.isNotificationMessage)(message)) {
            this.handleNotification(message.method, message.params);
        }
    }
    handleRequest(message) {
        switch (message.method) {
            case 'initialize': {
                this.writer.write({
                    jsonrpc: '2.0',
                    id: message.id,
                    result: {
                        capabilities: {
                            hoverProvider: true,
                            textDocumentSync: 1,
                        },
                    },
                });
                return;
            }
            case 'shutdown': {
                this.writer.write({ jsonrpc: '2.0', id: message.id, result: null });
                return;
            }
            case 'textDocument/hover': {
                const params = message.params;
                const result = this.provideHover(params);
                this.writer.write({ jsonrpc: '2.0', id: message.id, result });
                return;
            }
            default: {
                this.writer.write({
                    jsonrpc: '2.0',
                    id: message.id,
                    error: { code: -32601, message: `Method not implemented: ${message.method}` },
                });
            }
        }
    }
    handleNotification(method, params) {
        switch (method) {
            case 'initialized':
                return;
            case 'exit':
                process.exit(0);
                return;
            case 'textDocument/didOpen':
                this.documents.open(params.textDocument);
                return;
            case 'textDocument/didChange':
                this.documents.change(params);
                return;
            case 'textDocument/didClose':
                this.documents.close(params.textDocument.uri);
                return;
            default:
                return;
        }
    }
    provideHover(params) {
        const text = this.documents.get(params.textDocument.uri);
        if (!text) {
            return null;
        }
        const lines = text.split(/\r?\n/);
        if (params.position.line < 0 || params.position.line >= lines.length) {
            return null;
        }
        const line = lines[params.position.line];
        const wordInfo = this.extractWord(line, params.position.character);
        if (!wordInfo) {
            return null;
        }
        const description = this.keywordIndex.lookup(wordInfo.word.toLowerCase());
        if (!description) {
            return null;
        }
        const markdown = `**${wordInfo.word}**  \n${description}`;
        return {
            contents: {
                kind: 'markdown',
                value: markdown,
            },
            range: {
                start: { line: params.position.line, character: wordInfo.start },
                end: { line: params.position.line, character: wordInfo.end },
            },
        };
    }
    extractWord(line, character) {
        if (character < 0 || character > line.length) {
            return null;
        }
        const regex = /[A-Za-z_][\w]*/g;
        let match;
        while ((match = regex.exec(line)) !== null) {
            const start = match.index;
            const end = start + match[0].length;
            if (character >= start && character <= end) {
                return { word: match[0], start, end };
            }
        }
        return null;
    }
}
new OrusLanguageServer().start();
//# sourceMappingURL=index.js.map