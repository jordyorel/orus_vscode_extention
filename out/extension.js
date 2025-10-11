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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const defaultTemplate_1 = require("./defaultTemplate");
const languageClient_1 = require("./languageClient");
let outputChannel;
let reusableTerminal;
let languageClient;
async function activate(context) {
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
        const executablePath = config.get('executablePath', 'orus');
        const runInTerminal = config.get('runInTerminal', false);
        if (!executablePath) {
            void vscode.window.showErrorMessage('Configure `orus.executablePath` before running files.');
            return;
        }
        if (runInTerminal) {
            runInIntegratedTerminal(executablePath, filePath);
        }
        else {
            runInOutputChannel(executablePath, filePath);
        }
    });
    const templateDisposable = vscode.commands.registerCommand('orus.createFileFromTemplate', async () => {
        const document = await vscode.workspace.openTextDocument({
            language: 'orus',
            content: defaultTemplate_1.defaultTemplate,
        });
        await vscode.window.showTextDocument(document);
    });
    const terminalCloseDisposable = vscode.window.onDidCloseTerminal((terminal) => {
        if (terminal === reusableTerminal) {
            reusableTerminal = undefined;
        }
    });
    context.subscriptions.push(runDisposable, templateDisposable, terminalCloseDisposable);
    languageClient = new languageClient_1.OrusLanguageClient(context);
    await languageClient.start();
    context.subscriptions.push(languageClient);
}
async function deactivate() {
    reusableTerminal?.dispose();
    outputChannel?.dispose();
    await languageClient?.stop();
}
function runInIntegratedTerminal(executablePath, filePath) {
    if (!reusableTerminal) {
        reusableTerminal = vscode.window.createTerminal('Orus');
    }
    reusableTerminal.show(true);
    const quotedExecutable = quoteForShell(executablePath);
    const quotedFile = quoteForShell(filePath);
    reusableTerminal.sendText(`${quotedExecutable} ${quotedFile}`);
}
function runInOutputChannel(executablePath, filePath) {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('Orus');
    }
    outputChannel.clear();
    outputChannel.show(true);
    outputChannel.appendLine(`[Orus] Running ${filePath}`);
    const cwd = path.dirname(filePath);
    const child = (0, child_process_1.spawn)(executablePath, [filePath], { cwd, shell: false });
    child.stdout.on('data', (data) => {
        outputChannel?.append(data.toString());
    });
    child.stderr.on('data', (data) => {
        outputChannel?.append(data.toString());
    });
    child.on('close', (code) => {
        outputChannel?.appendLine(`\n[Orus] Process exited with code ${code ?? 'unknown'}`);
    });
    child.on('error', (error) => {
        outputChannel?.appendLine(`\n[Orus] Failed to start process: ${error.message}`);
        void vscode.window.showErrorMessage('Unable to run the Orus executable. Check the Orus output channel for details.');
    });
}
function quoteForShell(value) {
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
//# sourceMappingURL=extension.js.map