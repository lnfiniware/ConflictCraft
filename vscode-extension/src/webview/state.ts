export interface Suggestion {
  hunk_id: string;
  rule_id: string;
  action: string;
  resolved_lines: string[];
  confidence: number;
  safe_to_apply: boolean;
  notes?: string;
}

export interface Explanation {
  hunk_id: string;
  why_conflict: string;
  base_summary: string;
  ours_summary: string;
  theirs_summary: string;
  why_suggestion_valid: string;
}

export interface ViewState {
  filePath: string;
  baseText: string;
  oursText: string;
  theirsText: string;
  resultText: string;
  graphSummary: {
    nodes: number;
    edges: number;
  };
  suggestions: Suggestion[];
  explanations: Explanation[];
  summary: {
    resolved_hunks: number;
    manual_hunks: number;
  };
  explainVisible: boolean;
}

export const initialState: ViewState = {
  filePath: "",
  baseText: "",
  oursText: "",
  theirsText: "",
  resultText: "",
  graphSummary: { nodes: 0, edges: 0 },
  suggestions: [],
  explanations: [],
  summary: { resolved_hunks: 0, manual_hunks: 0 },
  explainVisible: false,
};
