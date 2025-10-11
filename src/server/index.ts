import { readFileSync } from 'fs';
import * as path from 'path';
import { StreamMessageReader, StreamMessageWriter, JsonRpcMessage, isRequestMessage, isNotificationMessage } from '../shared/lspTransport';

interface InitializeParams {
  processId: number | null;
  rootUri?: string | null;
  capabilities?: unknown;
}

interface TextDocumentItem {
  uri: string;
  languageId: string;
  version: number;
  text: string;
}

interface DidOpenTextDocumentParams {
  textDocument: TextDocumentItem;
}

interface DidChangeTextDocumentParams {
  textDocument: { uri: string; version: number };
  contentChanges: Array<{ text: string }>;
}

interface DidCloseTextDocumentParams {
  textDocument: { uri: string };
}

interface HoverParams {
  textDocument: { uri: string };
  position: { line: number; character: number };
}

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface HoverResult {
  contents: { kind: 'markdown'; value: string };
  range?: Range;
}

class KeywordIndex {
  private readonly descriptions = new Map<string, string>();

  constructor(private readonly keywordsFile: string) {
    this.load();
  }

  private load(): void {
    try {
      const contents = readFileSync(this.keywordsFile, 'utf8');
      const lines = contents.split(/\r?\n/);
      for (const line of lines) {
        const match = /^\|\s*`([a-z_]+)`\s*\|\s*([^|]+)\|/i.exec(line);
        if (match) {
          const keyword = match[1].trim();
          const description = match[2].trim();
          this.descriptions.set(keyword, description);
        }
      }
    } catch {
      // Failed to load keyword metadata; operate with an empty map.
    }
  }

  lookup(term: string): string | undefined {
    return this.descriptions.get(term);
  }
}

class DocumentStore {
  private readonly documents = new Map<string, string>();

  open(doc: TextDocumentItem): void {
    this.documents.set(doc.uri, doc.text);
  }

  change(change: DidChangeTextDocumentParams): void {
    if (change.contentChanges.length > 0) {
      this.documents.set(change.textDocument.uri, change.contentChanges[0].text);
    }
  }

  close(uri: string): void {
    this.documents.delete(uri);
  }

  get(uri: string): string | undefined {
    return this.documents.get(uri);
  }
}

class OrusLanguageServer {
  private readonly reader = new StreamMessageReader(process.stdin);
  private readonly writer = new StreamMessageWriter(process.stdout);
  private readonly keywordIndex = new KeywordIndex(path.join(__dirname, '../../docs/KEYWORDS.md'));
  private readonly documents = new DocumentStore();

  start(): void {
    this.reader.listen((message) => this.handleMessage(message));
  }

  private handleMessage(message: JsonRpcMessage): void {
    if (isRequestMessage(message)) {
      this.handleRequest(message);
      return;
    }

    if (isNotificationMessage(message)) {
      this.handleNotification(message.method, message.params);
    }
  }

  private handleRequest(message: JsonRpcMessage & { id: number | string; method: string }): void {
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
        const params = message.params as HoverParams;
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

  private handleNotification(method: string, params: unknown): void {
    switch (method) {
      case 'initialized':
        return;
      case 'exit':
        process.exit(0);
        return;
      case 'textDocument/didOpen':
        this.documents.open((params as DidOpenTextDocumentParams).textDocument);
        return;
      case 'textDocument/didChange':
        this.documents.change(params as DidChangeTextDocumentParams);
        return;
      case 'textDocument/didClose':
        this.documents.close((params as DidCloseTextDocumentParams).textDocument.uri);
        return;
      default:
        return;
    }
  }

  private provideHover(params: HoverParams): HoverResult | null {
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

  private extractWord(line: string, character: number): { word: string; start: number; end: number } | null {
    if (character < 0 || character > line.length) {
      return null;
    }

    const regex = /[A-Za-z_][\w]*/g;
    let match: RegExpExecArray | null;

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
