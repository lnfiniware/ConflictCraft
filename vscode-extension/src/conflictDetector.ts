import { TextDocument } from "vscode";

const CONFLICT_MARKER = /^<{7}|^={7}|^>{7}|^\|{7}/m;

export function documentHasConflicts(document: TextDocument): boolean {
  return CONFLICT_MARKER.test(document.getText());
}
