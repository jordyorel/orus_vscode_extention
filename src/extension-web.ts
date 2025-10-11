import * as vscode from 'vscode';

import { defaultTemplate } from './defaultTemplate';

export function activate(context: vscode.ExtensionContext) {
  const runDisposable = vscode.commands.registerCommand('orus.runFile', async () => {
    void vscode.window.showInformationMessage('Running Orus files requires the desktop version of VS Code.');
  });

  const templateDisposable = vscode.commands.registerCommand('orus.createFileFromTemplate', async () => {
    const document = await vscode.workspace.openTextDocument({
      language: 'orus',
      content: defaultTemplate,
    });
    await vscode.window.showTextDocument(document);
  });

  context.subscriptions.push(runDisposable, templateDisposable);
}

export function deactivate() {
  // No resources to dispose in the web extension variant.
}
