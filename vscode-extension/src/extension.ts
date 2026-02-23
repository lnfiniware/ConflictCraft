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
