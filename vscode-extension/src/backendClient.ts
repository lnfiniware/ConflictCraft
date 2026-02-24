import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as vscode from "vscode";

export interface AnalysisResult {
  file: string;
  hunks: Array<{
    id: string;
    hunk_id: string;
    base_lines: string[];
    ours_lines: string[];
    theirs_lines: string[];
    is_conflict: boolean;
  }>;
  graph: {
    nodes: Array<{ node_id: string; hunk_id: string }>;
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
  resolutionExitCode: number;
}

export interface BackendCheck {
  ok: boolean;
  issues: string[];
}

interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

interface ResolveOptions {
  enableSmartRules: boolean;
}

export class BackendExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly command: string,
    public readonly args: string[],
    public readonly stderr: string,
  ) {
    super(message);
  }
}

export class BackendClient {
  private readonly backendRoot: string;

  constructor(private readonly extensionPath: string) {
    this.backendRoot = path.resolve(path.join(extensionPath, "backend"));
  }

  getBackendRoot(): string {
    return this.backendRoot;
  }

  private assertInsideBackend(targetPath: string): string {
    const resolvedTarget = path.resolve(targetPath);
    const relative = path.relative(this.backendRoot, resolvedTarget);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new Error(`refusing to execute outside extension backend: ${resolvedTarget}`);
    }
    return resolvedTarget;
  }

  private getCoreBinaryPath(): string {
    let relativePath = "";
    if (process.platform === "win32") {
      relativePath = path.join("bin", `win32-${process.arch}`, "conflictcraft_core.exe");
    } else if (process.platform === "darwin") {
      relativePath = path.join("bin", `darwin-${process.arch}`, "conflictcraft_core");
    } else {
      relativePath = path.join("bin", `linux-${process.arch}`, "conflictcraft_core");
    }
    return this.assertInsideBackend(path.join(this.backendRoot, relativePath));
  }

  private getRuleEnginePath(): string {
    return this.assertInsideBackend(
      path.join(this.backendRoot, "python_engine", "conflictcraft_rules", "main.py"),
    );
  }

  private getRuleConfigPath(): string {
    return this.assertInsideBackend(
      path.join(this.backendRoot, "python_engine", "rule_configs", "default_rules.json"),
    );
  }

  private getPythonCandidates(): string[] {
    const config = vscode.workspace.getConfiguration("conflictcraft");
    const configured = (config.get<string>("pythonPath") || "python3").trim();
    const candidates = [configured];
    if (!candidates.includes("python3")) {
      candidates.push("python3");
    }
    if (!candidates.includes("python")) {
      candidates.push("python");
    }
    if (process.platform === "win32" && !candidates.includes("py")) {
      candidates.push("py");
    }
    return candidates;
  }

  private async resolvePythonCommand(): Promise<string> {
    const candidates = this.getPythonCandidates();
    for (const candidate of candidates) {
      const result = await this.runProcess(candidate, ["--version"], undefined, true);
      if (result.code === 0) {
        return candidate;
      }
    }
    throw new Error(`python runtime not found. tried: ${candidates.join(", ")}`);
  }

  async preflight(enableSmartRules: boolean): Promise<BackendCheck> {
    const issues: string[] = [];

    const manifestPath = this.assertInsideBackend(path.join(this.backendRoot, "MANIFEST.json"));
    if (!fs.existsSync(manifestPath)) {
      issues.push(`missing backend manifest: ${manifestPath}`);
    }

    const coreBinary = this.getCoreBinaryPath();
    if (!fs.existsSync(coreBinary)) {
      issues.push(`missing core binary for ${process.platform}: ${coreBinary}`);
    }

    const ruleEngine = this.getRuleEnginePath();
    if (!fs.existsSync(ruleEngine)) {
      issues.push(`missing python rule engine: ${ruleEngine}`);
    }

    const ruleConfig = this.getRuleConfigPath();
    if (!fs.existsSync(ruleConfig)) {
      issues.push(`missing rule config: ${ruleConfig}`);
    }

    if (enableSmartRules) {
      try {
        await this.resolvePythonCommand();
      } catch (error) {
        issues.push(error instanceof Error ? error.message : "python runtime not available");
      }
    }

    return {
      ok: issues.length === 0,
      issues,
    };
  }

  private runProcess(
    command: string,
    args: string[],
    cwd?: string,
    allowMissingBinary = false,
  ): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const child = cp.spawn(command, args, {
        cwd,
        shell: false,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        if (allowMissingBinary && (error as NodeJS.ErrnoException).code === "ENOENT") {
          resolve({ code: 127, stdout, stderr: `${stderr}${error.message}` });
          return;
        }
        reject(error);
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

  async resolveConflictFile(filePath: string, options: ResolveOptions): Promise<ResolveBundle> {
    const targetPath = path.resolve(filePath);
    const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "conflictcraft-"));
    const analysisPath = path.join(tempDir, "analysis.json");
    const rulesPath = path.join(tempDir, "rules.json");
    const resolvedPath = path.join(tempDir, "resolved.txt");
    const mergeCheckPath = path.join(tempDir, "merge-check.txt");

    const coreBinary = this.getCoreBinaryPath();
    const ruleEngine = this.getRuleEnginePath();
    const ruleConfig = this.getRuleConfigPath();

    try {
      const analyze = await this.runProcess(coreBinary, [
        "analyze",
        "--conflict-file",
        targetPath,
        "--out",
        analysisPath,
        "--file",
        path.basename(targetPath),
      ]);
      if (analyze.code !== 0) {
        throw new BackendExecutionError(
          `core analyze failed with code ${analyze.code}`,
          analyze.code,
          coreBinary,
          ["analyze", "--conflict-file", targetPath, "--out", analysisPath],
          analyze.stderr,
        );
      }

      const analysis = JSON.parse(await fs.promises.readFile(analysisPath, "utf8")) as AnalysisResult;

      let rules: RuleResult;
      let resolutionExitCode = 0;

      if (options.enableSmartRules) {
        const python = await this.resolvePythonCommand();
        const apply = await this.runProcess(python, [
          ruleEngine,
          "--analysis",
          analysisPath,
          "--out",
          rulesPath,
          "--config",
          ruleConfig,
          "--conflict-file",
          targetPath,
          "--resolved-out",
          resolvedPath,
        ]);

        if (apply.code !== 0) {
          throw new BackendExecutionError(
            `python rule engine failed with code ${apply.code}`,
            apply.code,
            python,
            [ruleEngine, "--analysis", analysisPath, "--out", rulesPath],
            apply.stderr,
          );
        }

        rules = JSON.parse(await fs.promises.readFile(rulesPath, "utf8")) as RuleResult;

        const mergeCheck = await this.runProcess(coreBinary, [
          "merge",
          "--conflict-file",
          resolvedPath,
          "--out",
          mergeCheckPath,
        ]);
        if (mergeCheck.code !== 0 && mergeCheck.code !== 2) {
          throw new BackendExecutionError(
            `core merge check failed with code ${mergeCheck.code}`,
            mergeCheck.code,
            coreBinary,
            ["merge", "--conflict-file", resolvedPath, "--out", mergeCheckPath],
            mergeCheck.stderr,
          );
        }
        resolutionExitCode = mergeCheck.code;
      } else {
        const merge = await this.runProcess(coreBinary, [
          "merge",
          "--conflict-file",
          targetPath,
          "--out",
          resolvedPath,
        ]);
        if (merge.code !== 0 && merge.code !== 2) {
          throw new BackendExecutionError(
            `core merge failed with code ${merge.code}`,
            merge.code,
            coreBinary,
            ["merge", "--conflict-file", targetPath, "--out", resolvedPath],
            merge.stderr,
          );
        }
        const conflictCount = analysis.hunks.filter((h) => h.is_conflict).length;
        rules = {
          suggestions: [],
          explanations: [],
          summary: {
            resolved_hunks: merge.code === 0 ? conflictCount : 0,
            manual_hunks: merge.code === 2 ? conflictCount : 0,
          },
        };
        resolutionExitCode = merge.code;
      }

      const resolvedText = await fs.promises.readFile(resolvedPath, "utf8");
      return {
        analysis,
        rules,
        resolvedText,
        resolutionExitCode,
      };
    } finally {
      await fs.promises.rm(tempDir, { recursive: true, force: true });
    }
  }
}
