import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';

import { defaultTemplate } from './defaultTemplate';
import { OrusLanguageClient } from './languageClient';

let outputChannel: vscode.OutputChannel | undefined;
let reusableTerminal: vscode.Terminal | undefined;
let languageClient: OrusLanguageClient | undefined;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Orus');
  context.subscriptions.push(outputChannel);

  const runDisposable = vscode.commands.registerCommand('orus.runFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showInformationMessage('Open an Orus file to run it.');
      return;
    }

    const document = editor.document;
    if (document.isDirty) {
      const saved = await document.save();
      if (!saved) {
        void vscode.window.showWarningMessage('Save the file before running it.');
        return;
      }
    }

    if (document.isUntitled) {
      void vscode.window.showWarningMessage('Save the Orus file before running it.');
      return;
    }

    const filePath = document.fileName;
    const config = vscode.workspace.getConfiguration('orus');
    const executablePath = config.get<string>('executablePath', 'orus');
    const runInTerminal = config.get<boolean>('runInTerminal', false);

    if (!executablePath) {
      void vscode.window.showErrorMessage('Configure `orus.executablePath` before running files.');
      return;
    }

    if (runInTerminal) {
      runInIntegratedTerminal(executablePath, filePath);
    } else {
      runInOutputChannel(executablePath, filePath);
    }
  });

  const templateDisposable = vscode.commands.registerCommand('orus.createFileFromTemplate', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'orus',
      content: defaultTemplate,
    });
    await vscode.window.showTextDocument(document);
  });

  const terminalCloseDisposable = vscode.window.onDidCloseTerminal((terminal) => {
    if (terminal === reusableTerminal) {
      reusableTerminal = undefined;
    }
  });

  context.subscriptions.push(runDisposable, templateDisposable, terminalCloseDisposable);

  languageClient = new OrusLanguageClient(context);
  await languageClient.start();
  context.subscriptions.push(languageClient);
}

export async function deactivate() {
  reusableTerminal?.dispose();
  outputChannel?.dispose();
  await languageClient?.stop();
}

function runInIntegratedTerminal(executablePath: string, filePath: string) {
  if (!reusableTerminal) {
    reusableTerminal = vscode.window.createTerminal('Orus');
  }

  reusableTerminal.show(true);
  const quotedExecutable = quoteForShell(executablePath);
  const quotedFile = quoteForShell(filePath);
  reusableTerminal.sendText(`${quotedExecutable} ${quotedFile}`);
}

function runInOutputChannel(executablePath: string, filePath: string) {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Orus');
  }

  outputChannel.clear();
  outputChannel.show(true);
  outputChannel.appendLine(`[Orus] Running ${filePath}`);

  const cwd = path.dirname(filePath);
  const child = spawn(executablePath, [filePath], { cwd, shell: false });

  child.stdout.on('data', (data: Buffer) => {
    outputChannel?.append(data.toString());
  });

  child.stderr.on('data', (data: Buffer) => {
    outputChannel?.append(data.toString());
  });

  child.on('close', (code: number | null) => {
    outputChannel?.appendLine(`\n[Orus] Process exited with code ${code ?? 'unknown'}`);
  });

  child.on('error', (error: Error) => {
    outputChannel?.appendLine(`\n[Orus] Failed to start process: ${error.message}`);
    void vscode.window.showErrorMessage('Unable to run the Orus executable. Check the Orus output channel for details.');
  });
}

function quoteForShell(value: string): string {
  if (process.platform === 'win32') {
    const escaped = value.replace(/(["^%\\])/g, '^$1');
    return `"${escaped}"`;
  }

  if (/^[\w@%+=:,./-]+$/u.test(value)) {
    return value;
  }

  const escaped = value.replace(/(["\\`$])/g, '\\$1');
  return `"${escaped}"`;
}
