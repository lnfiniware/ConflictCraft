import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import * as vscode from "vscode";

const execFile = promisify(cp.execFile);

export interface AnalysisResult {
  file: string;
  hunks: Array<{
    id: string;
    base_lines: string[];
    ours_lines: string[];
    theirs_lines: string[];
    is_conflict: boolean;
  }>;
  graph: {
    nodes: Array<{ node_id: string }>;
    edges: Array<{ from: string; to: string; reason: string }>;
  };
}

export interface RuleResult {
  suggestions: Array<{
    hunk_id: string;
    rule_id: string;
    action: string;
    resolved_lines: string[];
    confidence: number;
    safe_to_apply: boolean;
    notes?: string;
  }>;
  explanations: Array<{
    hunk_id: string;
    why_conflict: string;
    base_summary: string;
    ours_summary: string;
    theirs_summary: string;
    why_suggestion_valid: string;
  }>;
  summary: {
    resolved_hunks: number;
    manual_hunks: number;
  };
}

export interface ResolveBundle {
  analysis: AnalysisResult;
  rules: RuleResult;
  resolvedText: string;
}

export class BackendClient {
  constructor(private readonly workspaceRoot: string) {}

  private getCoreBinary(): string {
    const config = vscode.workspace.getConfiguration("conflictcraft");
    const configured = config.get<string>("coreBinaryPath")?.trim();
    if (configured) {
      return configured;
    }

    const isWindows = process.platform === "win32";
    const binary = isWindows ? "conflictcraft_core.exe" : "conflictcraft_core";
    return path.join(this.workspaceRoot, "core", "build", binary);
  }

  private getPython(): string {
    const config = vscode.workspace.getConfiguration("conflictcraft");
    return config.get<string>("pythonPath") || "python";
  }

  private getRuleEngine(): string {
    const config = vscode.workspace.getConfiguration("conflictcraft");
    const configured = config.get<string>("ruleEnginePath")?.trim();
    if (configured) {
      return configured;
    }
    return path.join(this.workspaceRoot, "python_engine", "conflictcraft_rules", "main.py");
  }

  async resolveConflictFile(filePath: string): Promise<ResolveBundle> {
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "conflictcraft-"));
    const analysisPath = path.join(tempDir, "analysis.json");
    const rulesPath = path.join(tempDir, "rules.json");
    const resolvedPath = path.join(tempDir, "resolved.txt");

    await execFile(this.getCoreBinary(), [
      "analyze",
      "--conflict-file",
      filePath,
      "--out",
      analysisPath,
      "--file",
      path.basename(filePath),
    ]);

    await execFile(this.getPython(), [
      this.getRuleEngine(),
      "--analysis",
      analysisPath,
      "--out",
      rulesPath,
      "--conflict-file",
      filePath,
      "--resolved-out",
      resolvedPath,
    ]);

    const analysis = JSON.parse(await fs.promises.readFile(analysisPath, "utf8")) as AnalysisResult;
    const rules = JSON.parse(await fs.promises.readFile(rulesPath, "utf8")) as RuleResult;
    const resolvedText = await fs.promises.readFile(resolvedPath, "utf8");

    return {
      analysis,
      rules,
      resolvedText,
    };
  }
}
