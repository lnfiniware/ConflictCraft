export class HistoryStack {
  private undoStack: string[] = [];
  private redoStack: string[] = [];

  push(value: string): void {
    this.undoStack.push(value);
    this.redoStack = [];
  }

  undo(current: string): string | null {
    const previous = this.undoStack.pop();
    if (previous === undefined) {
      return null;
    }
    this.redoStack.push(current);
    return previous;
  }

  redo(current: string): string | null {
    const next = this.redoStack.pop();
    if (next === undefined) {
      return null;
    }
    this.undoStack.push(current);
    return next;
  }
}
