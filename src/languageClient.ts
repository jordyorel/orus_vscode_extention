import * as vscode from 'vscode';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as path from 'path';
import { StreamMessageReader, StreamMessageWriter, JsonRpcMessage, isResponseMessage } from './shared/lspTransport';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: Error) => void;
}

export class OrusLanguageClient {
  private child: ChildProcessWithoutNullStreams | null = null;
  private reader: StreamMessageReader | null = null;
  private writer: StreamMessageWriter | null = null;
  private requestId = 0;
  private readonly pendingRequests = new Map<number, PendingRequest>();
  private initialized = false;
  private readonly disposables: vscode.Disposable[] = [];
  private readonly openedDocuments = new Set<string>();

  constructor(private readonly context: vscode.ExtensionContext) {}

  async start(): Promise<void> {
    if (this.child) {
      return;
    }

    const serverModule = this.context.asAbsolutePath(path.join('out', 'server', 'index.js'));
    this.child = spawn(process.execPath, [serverModule], {
      cwd: this.context.extensionPath,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stderr.on('data', (chunk: Buffer) => {
      console.error(`[Orus LS] ${chunk.toString('utf8')}`);
    });

    this.child.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        console.error(`Orus language server exited unexpectedly (code: ${code}, signal: ${signal ?? 'unknown'})`);
      }
      this.initialized = false;
      this.child = null;
    });

    this.reader = new StreamMessageReader(this.child.stdout);
    this.writer = new StreamMessageWriter(this.child.stdin);

    this.reader.listen((message) => this.handleMessage(message));

    await this.initialize();
    this.registerWorkspaceListeners();
    this.registerHoverProvider();
    this.publishExistingDocuments();
  }

  private async initialize(): Promise<void> {
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

  private registerWorkspaceListeners(): void {
    this.disposables.push(
      vscode.workspace.onDidOpenTextDocument((doc) => this.dispatchDidOpen(doc)),
      vscode.workspace.onDidChangeTextDocument((event) => this.dispatchDidChange(event)),
      vscode.workspace.onDidCloseTextDocument((doc) => this.dispatchDidClose(doc)),
    );
  }

  private registerHoverProvider(): void {
    const provider: vscode.HoverProvider = {
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
            ? new vscode.Range(
                new vscode.Position(result.range.start.line, result.range.start.character),
                new vscode.Position(result.range.end.line, result.range.end.character),
              )
            : undefined;

          return new vscode.Hover(hoverContents, range);
        } catch (error) {
          console.error('Failed to fetch hover information from Orus language server:', error);
          return null;
        }
      },
    };

    this.disposables.push(vscode.languages.registerHoverProvider({ language: 'orus', scheme: 'file' }, provider));
  }

  private convertMarkedString(value: any): vscode.MarkdownString {
    if (value && typeof value === 'object' && 'kind' in value && value.kind === 'markdown') {
      return new vscode.MarkdownString(String(value.value ?? ''));
    }

    return new vscode.MarkdownString(String(value ?? ''));
  }

  private publishExistingDocuments(): void {
    for (const document of vscode.workspace.textDocuments) {
      this.dispatchDidOpen(document);
    }
  }

  private dispatchDidOpen(document: vscode.TextDocument): void {
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

  private dispatchDidChange(event: vscode.TextDocumentChangeEvent): void {
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

  private dispatchDidClose(document: vscode.TextDocument): void {
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

  private handleMessage(message: JsonRpcMessage): void {
    if (isResponseMessage(message) && typeof message.id === 'number') {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
      }
    }
  }

  private sendNotification(method: string, params: unknown): void {
    if (!this.writer) {
      return;
    }

    this.writer.write({ jsonrpc: '2.0', method, params });
  }

  private sendRequest(method: string, params: unknown): Promise<any> {
    if (!this.writer) {
      return Promise.reject(new Error('Language server process is not running'));
    }

    const id = ++this.requestId;

    const promise = new Promise<any>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    this.writer.write({ jsonrpc: '2.0', id, method, params });

    return promise;
  }

  async stop(): Promise<void> {
    if (!this.child || !this.writer) {
      return;
    }

    try {
      await this.sendRequest('shutdown', null);
    } catch (error) {
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

  dispose(): void {
    void this.stop();
  }
}
