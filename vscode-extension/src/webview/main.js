(function () {
  const vscode = acquireVsCodeApi();

  const basePane = document.getElementById("basePane");
  const oursPane = document.getElementById("oursPane");
  const theirsPane = document.getElementById("theirsPane");
  const resultPane = document.getElementById("resultPane");

  const suggestionList = document.getElementById("suggestionList");
  const explainPanel = document.getElementById("explainPanel");
  const explainContent = document.getElementById("explainContent");
  const graphSummary = document.getElementById("graphSummary");
  const summary = document.getElementById("summary");

  const saveBtn = document.getElementById("saveBtn");
  const undoBtn = document.getElementById("undoBtn");
  const redoBtn = document.getElementById("redoBtn");
  const toggleExplainBtn = document.getElementById("toggleExplainBtn");

  const undoStack = [];
  const redoStack = [];

  let state = {
    explainVisible: false,
    suggestions: [],
    explanations: [],
  };

  function pushUndo(value) {
    undoStack.push(value);
    redoStack.length = 0;
  }

  function renderGraph(payload) {
    graphSummary.textContent = "Nodes: " + payload.nodes + " | Edges: " + payload.edges;
  }

  function renderExplain(explanations) {
    explainContent.innerHTML = "";
    if (!explanations || explanations.length === 0) {
      explainContent.textContent = "No explanations available.";
      return;
    }

    explanations.forEach(function (item) {
      const block = document.createElement("div");
      block.className = "suggestion";
      block.innerHTML =
        "<strong>" + item.hunk_id + "</strong><br/>" +
        "Why: " + item.why_conflict + "<br/>" +
        "Base: " + item.base_summary + "<br/>" +
        "Ours: " + item.ours_summary + "<br/>" +
        "Theirs: " + item.theirs_summary + "<br/>" +
        "Valid: " + item.why_suggestion_valid;
      explainContent.appendChild(block);
    });
  }

  function applySuggestion(suggestion) {
    pushUndo(resultPane.value);
    resultPane.value = (suggestion.resolved_lines || []).join("\n");
  }

  function renderSuggestions(items) {
    suggestionList.innerHTML = "";
    if (!items || items.length === 0) {
      suggestionList.textContent = "No suggestions.";
      return;
    }

    items.forEach(function (item) {
      const card = document.createElement("div");
      const canAutoApply = item.safe_to_apply && item.confidence >= 0.95;
      card.className = "suggestion " + (canAutoApply ? "safe" : "manual");

      const title = document.createElement("div");
      title.className = "suggestion-title";
      title.textContent =
        item.hunk_id + " | " + item.rule_id +
        " | confidence=" + Number(item.confidence).toFixed(2) +
        " | safe=" + (item.safe_to_apply ? "yes" : "no");

      const notes = document.createElement("div");
      notes.className = "suggestion-notes";
      notes.textContent = item.notes || "";

      const applyBtn = document.createElement("button");
      applyBtn.textContent = "Apply";
      applyBtn.disabled = !canAutoApply;
      applyBtn.addEventListener("click", function () {
        applySuggestion(item);
      });

      card.appendChild(title);
      card.appendChild(notes);
      card.appendChild(applyBtn);
      suggestionList.appendChild(card);
    });
  }

  function render(payload) {
    basePane.value = payload.baseText || "";
    oursPane.value = payload.oursText || "";
    theirsPane.value = payload.theirsText || "";
    resultPane.value = payload.resultText || "";

    state.suggestions = payload.suggestions || [];
    state.explanations = payload.explanations || [];

    renderSuggestions(state.suggestions);
    renderExplain(state.explanations);
    renderGraph(payload.graphSummary || { nodes: 0, edges: 0 });
    state.explainVisible = Boolean(payload.explainVisible);
    explainPanel.classList.toggle("hidden", !state.explainVisible);

    summary.textContent =
      "Resolved hunks: " + (payload.summary?.resolved_hunks || 0) +
      " | Manual hunks: " + (payload.summary?.manual_hunks || 0);
  }

  saveBtn.addEventListener("click", function () {
    vscode.postMessage({
      type: "saveResult",
      payload: { text: resultPane.value },
    });
  });

  toggleExplainBtn.addEventListener("click", function () {
    state.explainVisible = !state.explainVisible;
    explainPanel.classList.toggle("hidden", !state.explainVisible);
  });

  undoBtn.addEventListener("click", function () {
    if (undoStack.length === 0) {
      return;
    }
    const previous = undoStack.pop();
    redoStack.push(resultPane.value);
    resultPane.value = previous;
  });

  redoBtn.addEventListener("click", function () {
    if (redoStack.length === 0) {
      return;
    }
    const next = redoStack.pop();
    pushUndo(resultPane.value);
    resultPane.value = next;
  });

  resultPane.addEventListener("input", function () {
    // Keep manual edits in undo history with lightweight snapshots.
    if (undoStack.length === 0 || undoStack[undoStack.length - 1] !== resultPane.value) {
      pushUndo(resultPane.value);
    }
  });

  window.addEventListener("message", function (event) {
    const msg = event.data;
    if (!msg || !msg.type) {
      return;
    }

    if (msg.type === "init") {
      render(msg.payload || {});
    }

    if (msg.type === "toggleExplain") {
      state.explainVisible = !state.explainVisible;
      explainPanel.classList.toggle("hidden", !state.explainVisible);
    }

    if (msg.type === "undo") {
      undoBtn.click();
    }

    if (msg.type === "redo") {
      redoBtn.click();
    }
  });

  vscode.postMessage({ type: "requestInit" });
})();
