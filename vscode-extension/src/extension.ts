import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { BackendClient, ResolveBundle } from "./backendClient";
import { documentHasConflicts } from "./conflictDetector";

let panel: vscode.WebviewPanel | undefined;
let latestBundle: ResolveBundle | undefined;
let latestFilePath = "";

export function activate(context: vscode.ExtensionContext): void {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) {
    return;
  }

  const backend = new BackendClient(workspaceFolder);
  const output = vscode.window.createOutputChannel("ConflictCraft");
  context.subscriptions.push(output);
  const prompted = new Set<string>();

  const maybePrompt = async (document: vscode.TextDocument): Promise<void> => {
    if (document.uri.scheme !== "file") {
      return;
    }
    if (!documentHasConflicts(document)) {
      return;
    }
    if (prompted.has(document.uri.fsPath)) {
      return;
    }

    prompted.add(document.uri.fsPath);
    const choice = await vscode.window.showInformationMessage(
      "Conflict markers detected. Open ConflictCraft editor?",
      "Open",
      "Later",
    );
    if (choice === "Open") {
      await openEditorForDocument(document, backend, context);
    }
  };

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      void maybePrompt(doc);
    }),
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        void maybePrompt(editor.document);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.openEditor", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      await openEditorForDocument(editor.document, backend, context);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.resolveCurrentFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const bundle = await backend.resolveConflictFile(editor.document.uri.fsPath);
      await fs.promises.writeFile(editor.document.uri.fsPath, bundle.resolvedText, "utf8");
      await editor.document.save();
      vscode.window.showInformationMessage("ConflictCraft applied safe deterministic rules.");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.toggleExplainMode", () => {
      panel?.webview.postMessage({ type: "toggleExplain" });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.undoAction", () => {
      panel?.webview.postMessage({ type: "undo" });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.redoAction", () => {
      panel?.webview.postMessage({ type: "redo" });
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.runDoctor", async () => {
      output.clear();
      output.show(true);
      output.appendLine("ConflictCraft: running doctor");
      const exitCode = await runCliCommand(workspaceFolder, ["doctor"], output);
      if (exitCode === 0) {
        vscode.window.showInformationMessage("ConflictCraft doctor passed.");
      } else {
        vscode.window.showErrorMessage(`ConflictCraft doctor found issues (exit ${exitCode}). Check Output: ConflictCraft.`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.scanWorkspaceConflicts", async () => {
      output.clear();
      output.show(true);
      output.appendLine("ConflictCraft: scanning workspace for conflict markers");
      const exitCode = await runCliCommand(workspaceFolder, ["scan", workspaceFolder], output);
      if (exitCode === 0) {
        vscode.window.showInformationMessage("ConflictCraft scan completed.");
      } else {
        vscode.window.showErrorMessage(`ConflictCraft scan failed (exit ${exitCode}). Check Output: ConflictCraft.`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.resolveGitUnmerged", async () => {
      const choice = await vscode.window.showQuickPick(
        [
          { label: "Preview only (Recommended)", args: ["git-resolve", "--no-write", "--explain"] },
          { label: "Apply safe resolutions", args: ["git-resolve", "--write", "--explain"] },
        ],
        {
          title: "ConflictCraft: Resolve Git Unmerged Files",
          placeHolder: "Choose how ConflictCraft should run",
        },
      );

      if (!choice) {
        return;
      }

      output.clear();
      output.show(true);
      output.appendLine(`ConflictCraft: running ${choice.args.join(" ")}`);

      const exitCode = await runCliCommand(workspaceFolder, choice.args, output);
      if (exitCode === 0) {
        vscode.window.showInformationMessage("ConflictCraft git-resolve completed.");
      } else if (exitCode === 2) {
        vscode.window.showWarningMessage("ConflictCraft git-resolve completed with manual conflicts remaining.");
      } else {
        vscode.window.showErrorMessage(`ConflictCraft git-resolve failed (exit ${exitCode}). Check Output: ConflictCraft.`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.openFullTutorial", async () => {
      const tutorialPath = path.join(workspaceFolder, "docs", "ConflictCraft-Full-Tutorial.md");
      const fallbackReadme = path.join(workspaceFolder, "README.md");
      const targetPath = fs.existsSync(tutorialPath) ? tutorialPath : fallbackReadme;
      const document = await vscode.workspace.openTextDocument(targetPath);
      await vscode.window.showTextDocument(document, { preview: false });
    }),
  );
}

export function deactivate(): void {}

async function openEditorForDocument(
  document: vscode.TextDocument,
  backend: BackendClient,
  context: vscode.ExtensionContext,
): Promise<void> {
  latestBundle = await backend.resolveConflictFile(document.uri.fsPath);
  latestFilePath = document.uri.fsPath;

  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      "conflictcraft",
      `ConflictCraft: ${path.basename(document.uri.fsPath)}`,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "out", "webview")),
          vscode.Uri.file(path.join(context.extensionPath, "src", "webview")),
        ],
      },
    );

    panel.onDidDispose(() => {
      panel = undefined;
    });

    panel.webview.onDidReceiveMessage(async (message: any) => {
      if (!latestBundle || !latestFilePath) {
        return;
      }

      if (message.type === "saveResult") {
        await fs.promises.writeFile(latestFilePath, String(message.payload?.text || ""), "utf8");
        vscode.window.showInformationMessage("ConflictCraft result saved.");
      }

      if (message.type === "requestInit") {
        panel?.webview.postMessage(makeInitPayload(latestBundle, latestFilePath));
      }
    });
  }

  panel.title = `ConflictCraft: ${path.basename(document.uri.fsPath)}`;
  panel.webview.html = getWebviewHtml(panel.webview, context.extensionUri);
  panel.reveal(vscode.ViewColumn.Active);
  panel.webview.postMessage(makeInitPayload(latestBundle, latestFilePath));
}

function makeInitPayload(bundle: ResolveBundle, filePath: string): any {
  const firstConflict = bundle.analysis.hunks.find((h) => h.is_conflict) || bundle.analysis.hunks[0];

  return {
    type: "init",
    payload: {
      filePath,
      baseText: (firstConflict?.base_lines || []).join("\n"),
      oursText: (firstConflict?.ours_lines || []).join("\n"),
      theirsText: (firstConflict?.theirs_lines || []).join("\n"),
      resultText: bundle.resolvedText,
      graphSummary: {
        nodes: bundle.analysis.graph.nodes.length,
        edges: bundle.analysis.graph.edges.length,
      },
      suggestions: bundle.rules.suggestions,
      explanations: bundle.rules.explanations,
      summary: bundle.rules.summary,
    },
  };
}

function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "webview", "main.js"));
  const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, "src", "webview", "styles.css"));

  const htmlPath = vscode.Uri.joinPath(extensionUri, "src", "webview", "index.html").fsPath;
  let html = fs.readFileSync(htmlPath, "utf8");
  html = html.replace("{{cspSource}}", webview.cspSource);
  html = html.replace("{{scriptUri}}", scriptUri.toString());
  html = html.replace("{{styleUri}}", styleUri.toString());
  return html;
}

function getCliInvocation(workspaceRoot: string, args: string[]): { command: string; argv: string[] } {
  if (process.platform === "win32") {
    const script = path.join(workspaceRoot, "scripts", "conflictcraft.ps1");
    return {
      command: "powershell",
      argv: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, ...args],
    };
  }

  const script = path.join(workspaceRoot, "scripts", "conflictcraft");
  return {
    command: "bash",
    argv: [script, ...args],
  };
}

function runCliCommand(workspaceRoot: string, args: string[], output: vscode.OutputChannel): Promise<number> {
  const invocation = getCliInvocation(workspaceRoot, args);
  return new Promise((resolve) => {
    const child = cp.spawn(invocation.command, invocation.argv, {
      cwd: workspaceRoot,
      shell: false,
    });

    child.stdout.on("data", (chunk) => {
      output.append(chunk.toString());
    });

    child.stderr.on("data", (chunk) => {
      output.append(chunk.toString());
    });

    child.on("error", (error) => {
      output.appendLine(`\nConflictCraft extension error: ${error.message}`);
      resolve(1);
    });

    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}
