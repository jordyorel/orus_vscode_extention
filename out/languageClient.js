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
exports.OrusLanguageClient = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const lspTransport_1 = require("./shared/lspTransport");
class OrusLanguageClient {
    constructor(context) {
        this.context = context;
        this.child = null;
        this.reader = null;
        this.writer = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.initialized = false;
        this.disposables = [];
        this.openedDocuments = new Set();
    }
    async start() {
        if (this.child) {
            return;
        }
        const serverModule = this.context.asAbsolutePath(path.join('out', 'server', 'index.js'));
        this.child = (0, child_process_1.spawn)(process.execPath, [serverModule], {
            cwd: this.context.extensionPath,
            stdio: ['pipe', 'pipe', 'pipe'],
        });
        this.child.stderr.on('data', (chunk) => {
            console.error(`[Orus LS] ${chunk.toString('utf8')}`);
        });
        this.child.on('exit', (code, signal) => {
            if (code !== 0 && signal !== 'SIGTERM') {
                console.error(`Orus language server exited unexpectedly (code: ${code}, signal: ${signal ?? 'unknown'})`);
            }
            this.initialized = false;
            this.child = null;
        });
        this.reader = new lspTransport_1.StreamMessageReader(this.child.stdout);
        this.writer = new lspTransport_1.StreamMessageWriter(this.child.stdin);
        this.reader.listen((message) => this.handleMessage(message));
        await this.initialize();
        this.registerWorkspaceListeners();
        this.registerHoverProvider();
        this.publishExistingDocuments();
    }
    async initialize() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const rootUri = workspaceFolders && workspaceFolders.length > 0 ? workspaceFolders[0].uri.toString() : null;
        await this.sendRequest('initialize', {
            processId: process.pid,
            rootUri,
            capabilities: {},
        });
        this.sendNotification('initialized', {});
        this.initialized = true;
    }
    registerWorkspaceListeners() {
        this.disposables.push(vscode.workspace.onDidOpenTextDocument((doc) => this.dispatchDidOpen(doc)), vscode.workspace.onDidChangeTextDocument((event) => this.dispatchDidChange(event)), vscode.workspace.onDidCloseTextDocument((doc) => this.dispatchDidClose(doc)));
    }
    registerHoverProvider() {
        const provider = {
            provideHover: async (document, position) => {
                if (!this.initialized) {
                    return null;
                }
                if (document.languageId !== 'orus') {
                    return null;
                }
                try {
                    const result = await this.sendRequest('textDocument/hover', {
                        textDocument: { uri: document.uri.toString() },
                        position: { line: position.line, character: position.character },
                    });
                    if (!result || !result.contents) {
                        return null;
                    }
                    const contents = result.contents;
                    const hoverContents = Array.isArray(contents)
                        ? contents.map(this.convertMarkedString)
                        : [this.convertMarkedString(contents)];
                    const range = result.range
                        ? new vscode.Range(new vscode.Position(result.range.start.line, result.range.start.character), new vscode.Position(result.range.end.line, result.range.end.character))
                        : undefined;
                    return new vscode.Hover(hoverContents, range);
                }
                catch (error) {
                    console.error('Failed to fetch hover information from Orus language server:', error);
                    return null;
                }
            },
        };
        this.disposables.push(vscode.languages.registerHoverProvider({ language: 'orus', scheme: 'file' }, provider));
    }
    convertMarkedString(value) {
        if (value && typeof value === 'object' && 'kind' in value && value.kind === 'markdown') {
            return new vscode.MarkdownString(String(value.value ?? ''));
        }
        return new vscode.MarkdownString(String(value ?? ''));
    }
    publishExistingDocuments() {
        for (const document of vscode.workspace.textDocuments) {
            this.dispatchDidOpen(document);
        }
    }
    dispatchDidOpen(document) {
        if (document.languageId !== 'orus') {
            return;
        }
        const uri = document.uri.toString();
        if (this.openedDocuments.has(uri)) {
            return;
        }
        this.openedDocuments.add(uri);
        this.sendNotification('textDocument/didOpen', {
            textDocument: {
                uri,
                languageId: document.languageId,
                version: document.version,
                text: document.getText(),
            },
        });
    }
    dispatchDidChange(event) {
        const document = event.document;
        if (document.languageId !== 'orus') {
            return;
        }
        this.sendNotification('textDocument/didChange', {
            textDocument: {
                uri: document.uri.toString(),
                version: document.version,
            },
            contentChanges: [{ text: document.getText() }],
        });
    }
    dispatchDidClose(document) {
        if (document.languageId !== 'orus') {
            return;
        }
        const uri = document.uri.toString();
        if (!this.openedDocuments.has(uri)) {
            return;
        }
        this.openedDocuments.delete(uri);
        this.sendNotification('textDocument/didClose', {
            textDocument: {
                uri,
            },
        });
    }
    handleMessage(message) {
        if ((0, lspTransport_1.isResponseMessage)(message) && typeof message.id === 'number') {
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                this.pendingRequests.delete(message.id);
                if (message.error) {
                    pending.reject(new Error(message.error.message));
                }
                else {
                    pending.resolve(message.result);
                }
            }
        }
    }
    sendNotification(method, params) {
        if (!this.writer) {
            return;
        }
        this.writer.write({ jsonrpc: '2.0', method, params });
    }
    sendRequest(method, params) {
        if (!this.writer) {
            return Promise.reject(new Error('Language server process is not running'));
        }
        const id = ++this.requestId;
        const promise = new Promise((resolve, reject) => {
            this.pendingRequests.set(id, { resolve, reject });
        });
        this.writer.write({ jsonrpc: '2.0', id, method, params });
        return promise;
    }
    async stop() {
        if (!this.child || !this.writer) {
            return;
        }
        try {
            await this.sendRequest('shutdown', null);
        }
        catch (error) {
            console.error('Failed to shutdown Orus language server cleanly:', error);
        }
        this.sendNotification('exit', null);
        this.child.kill();
        this.child = null;
        this.initialized = false;
        while (this.disposables.length > 0) {
            const disposable = this.disposables.pop();
            disposable?.dispose();
        }
    }
    dispose() {
        void this.stop();
    }
}
exports.OrusLanguageClient = OrusLanguageClient;
//# sourceMappingURL=languageClient.js.map