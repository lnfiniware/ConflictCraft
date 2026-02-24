import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

import { BackendClient, BackendExecutionError, ResolveBundle } from "./backendClient";
import { documentHasConflicts } from "./conflictDetector";

let panel: vscode.WebviewPanel | undefined;
let latestBundle: ResolveBundle | undefined;
let latestFilePath = "";
let backendReady = false;
let backendIssues: string[] = [];

function getConfig(): {
  autoPrompt: "always" | "once" | "never";
  enableSmartRules: boolean;
  showExplainMode: boolean;
} {
  const config = vscode.workspace.getConfiguration("conflictcraft");
  const autoPrompt = config.get<string>("autoPrompt", "once");
  return {
    autoPrompt: autoPrompt === "always" || autoPrompt === "never" ? autoPrompt : "once",
    enableSmartRules: config.get<boolean>("enableSmartRules", true),
    showExplainMode: config.get<boolean>("showExplainMode", true),
  };
}

async function runProcess(command: string, args: string[], cwd?: string): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = cp.spawn(command, args, { cwd, shell: false });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      resolve({
        code: 1,
        stdout,
        stderr: `${stderr}${error.message}`,
      });
    });
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function getWorkspaceRoot(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function ensureBackendReady(): boolean {
  if (backendReady) {
    return true;
  }

  const issueDetails = backendIssues.length > 0 ? `\n${backendIssues.join("\n")}` : "";
  void vscode.window.showErrorMessage(`ConflictCraft backend is unavailable.${issueDetails}`);
  return false;
}

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("ConflictCraft");
  context.subscriptions.push(output);

  const backend = new BackendClient(context.extensionPath);
  const prompted = new Set<string>();

  const runPreflight = async (): Promise<void> => {
    const config = getConfig();
    const check = await backend.preflight(config.enableSmartRules);
    backendReady = check.ok;
    backendIssues = check.issues;
    if (!check.ok) {
      void vscode.window.showErrorMessage(
        "ConflictCraft backend files are missing for this platform. Commands are disabled until backend is available.",
      );
      output.appendLine("ConflictCraft preflight failed:");
      for (const issue of check.issues) {
        output.appendLine(`- ${issue}`);
      }
    }
  };

  void runPreflight();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration("conflictcraft.pythonPath") ||
        event.affectsConfiguration("conflictcraft.enableSmartRules") ||
        event.affectsConfiguration("conflictcraft.autoPrompt") ||
        event.affectsConfiguration("conflictcraft.showExplainMode")
      ) {
        void runPreflight();
      }
    }),
  );

  const maybePrompt = async (document: vscode.TextDocument): Promise<void> => {
    const config = getConfig();
    if (config.autoPrompt === "never") {
      return;
    }
    if (document.uri.scheme !== "file") {
      return;
    }
    if (!documentHasConflicts(document)) {
      return;
    }
    if (config.autoPrompt === "once" && prompted.has(document.uri.fsPath)) {
      return;
    }
    if (config.autoPrompt === "once") {
      prompted.add(document.uri.fsPath);
    }

    const choice = await vscode.window.showInformationMessage(
      "Conflict markers detected. Open ConflictCraft editor?",
      "Open",
      "Later",
    );
    if (choice === "Open") {
      await openEditorForDocument(document, backend, context, output);
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
      if (!ensureBackendReady()) {
        return;
      }
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      await openEditorForDocument(editor.document, backend, context, output);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.resolveCurrentFile", async () => {
      if (!ensureBackendReady()) {
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      try {
        const config = getConfig();
        const bundle = await backend.resolveConflictFile(editor.document.uri.fsPath, {
          enableSmartRules: config.enableSmartRules,
        });
        await fs.promises.writeFile(editor.document.uri.fsPath, bundle.resolvedText, "utf8");
        await editor.document.save();
        if (bundle.resolutionExitCode === 0) {
          void vscode.window.showInformationMessage("ConflictCraft resolution completed.");
        } else if (bundle.resolutionExitCode === 2) {
          void vscode.window.showWarningMessage("Manual conflicts remain.");
        } else {
          void vscode.window.showErrorMessage(`ConflictCraft failed (exit ${bundle.resolutionExitCode}).`);
        }
      } catch (error) {
        reportBackendError(error, output);
      }
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
      const config = getConfig();
      const check = await backend.preflight(config.enableSmartRules);
      backendReady = check.ok;
      backendIssues = check.issues;

      output.appendLine("ConflictCraft doctor report");
      output.appendLine("-------------------------");
      output.appendLine(`[${check.ok ? "ok" : "fail"}] extension backend root: ${backend.getBackendRoot()}`);
      if (!check.ok) {
        for (const issue of check.issues) {
          output.appendLine(`[fail] ${issue}`);
        }
      }

      const workspaceRoot = getWorkspaceRoot();
      if (workspaceRoot) {
        const gitCheck = await runProcess("git", ["rev-parse", "--is-inside-work-tree"], workspaceRoot);
        output.appendLine(gitCheck.code === 0 ? "[ok] git repository detected" : "[warn] workspace is not a git repository");
      } else {
        output.appendLine("[warn] no workspace folder is open");
      }

      if (check.ok) {
        void vscode.window.showInformationMessage("ConflictCraft doctor passed.");
      } else {
        void vscode.window.showErrorMessage("ConflictCraft doctor found backend issues.");
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.scanWorkspaceConflicts", async () => {
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        void vscode.window.showWarningMessage("Open a workspace folder to scan conflicts.");
        return;
      }

      output.clear();
      output.show(true);
      output.appendLine(`ConflictCraft: scanning ${workspaceRoot}`);

      const files = await vscode.workspace.findFiles("**/*", "**/.git/**");
      const conflictFiles: string[] = [];
      for (const file of files) {
        if (file.scheme !== "file") {
          continue;
        }
        try {
          const content = await fs.promises.readFile(file.fsPath, "utf8");
          if (content.includes("<<<<<<<")) {
            conflictFiles.push(file.fsPath);
          }
        } catch {
          // Ignore non-text files.
        }
      }

      if (conflictFiles.length === 0) {
        output.appendLine("No conflict markers found.");
      } else {
        output.appendLine(`Conflict files (${conflictFiles.length}):`);
        for (const item of conflictFiles) {
          output.appendLine(`  ${item}`);
        }
      }
      void vscode.window.showInformationMessage(`Conflict scan completed: ${conflictFiles.length} file(s).`);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.resolveGitUnmerged", async () => {
      if (!ensureBackendReady()) {
        return;
      }
      const workspaceRoot = getWorkspaceRoot();
      if (!workspaceRoot) {
        void vscode.window.showWarningMessage("Open a git workspace folder first.");
        return;
      }

      const choice = await vscode.window.showQuickPick(
        [
          { label: "Preview only (Recommended)", applyChanges: false },
          { label: "Apply safe resolutions", applyChanges: true },
        ],
        {
          title: "ConflictCraft: Resolve Git Unmerged Files",
          placeHolder: "Choose how ConflictCraft should run",
        },
      );
      if (!choice) {
        return;
      }

      const gitUnmerged = await runProcess("git", ["diff", "--name-only", "--diff-filter=U"], workspaceRoot);
      if (gitUnmerged.code !== 0) {
        void vscode.window.showErrorMessage("Failed to query git unmerged files.");
        return;
      }

      const files = gitUnmerged.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => path.resolve(workspaceRoot, line));

      if (files.length === 0) {
        void vscode.window.showInformationMessage("No unmerged files found.");
        return;
      }

      const config = getConfig();
      let resolved = 0;
      let manual = 0;

      for (const filePath of files) {
        try {
          const bundle = await backend.resolveConflictFile(filePath, {
            enableSmartRules: config.enableSmartRules,
          });
          if (choice.applyChanges) {
            await fs.promises.writeFile(filePath, bundle.resolvedText, "utf8");
          }
          if (bundle.resolutionExitCode === 0) {
            resolved += 1;
          } else if (bundle.resolutionExitCode === 2) {
            manual += 1;
          }
        } catch (error) {
          reportBackendError(error, output);
          return;
        }
      }

      if (manual > 0) {
        void vscode.window.showWarningMessage(`Manual conflicts remain in ${manual} file(s).`);
      } else {
        void vscode.window.showInformationMessage(`ConflictCraft processed ${resolved} file(s).`);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("conflictcraft.openFullTutorial", async () => {
      const workspaceRoot = getWorkspaceRoot();
      const candidatePaths = [
        workspaceRoot ? path.join(workspaceRoot, "docs", "ConflictCraft-Full-Tutorial.md") : "",
        workspaceRoot ? path.join(workspaceRoot, "README.md") : "",
        path.join(context.extensionPath, "README.md"),
      ].filter(Boolean);

      const selected = candidatePaths.find((candidate) => fs.existsSync(candidate)) || candidatePaths[candidatePaths.length - 1];
      const document = await vscode.workspace.openTextDocument(selected);
      await vscode.window.showTextDocument(document, { preview: false });
    }),
  );
}

export function deactivate(): void {}

function reportBackendError(error: unknown, output: vscode.OutputChannel): void {
  if (error instanceof BackendExecutionError) {
    output.appendLine(`[backend error] ${error.message}`);
    output.appendLine(`command: ${error.command} ${error.args.join(" ")}`);
    if (error.stderr.trim()) {
      output.appendLine(error.stderr.trim());
    }
    output.show(true);
    void vscode.window.showErrorMessage("ConflictCraft backend failed. Check Output: ConflictCraft.");
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  output.appendLine(`[backend error] ${message}`);
  output.show(true);
  void vscode.window.showErrorMessage(message);
}

async function openEditorForDocument(
  document: vscode.TextDocument,
  backend: BackendClient,
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
): Promise<void> {
  try {
    const config = getConfig();
    latestBundle = await backend.resolveConflictFile(document.uri.fsPath, {
      enableSmartRules: config.enableSmartRules,
    });
    latestFilePath = document.uri.fsPath;
  } catch (error) {
    reportBackendError(error, output);
    return;
  }

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
        void vscode.window.showInformationMessage("ConflictCraft result saved.");
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
  const config = getConfig();
  const firstConflict = bundle.analysis.hunks.find((h) => h.is_conflict) || bundle.analysis.hunks[0];

  return {
    type: "init",
    payload: {
      filePath,
      baseText: (firstConflict?.base_lines || []).join("\n"),
      oursText: (firstConflict?.ours_lines || []).join("\n"),
      theirsText: (firstConflict?.theirs_lines || []).join("\n"),
      resultText: bundle.resolvedText,
      explainVisible: config.showExplainMode,
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
