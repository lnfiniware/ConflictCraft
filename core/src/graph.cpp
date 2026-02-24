#include "conflictcraft/graph.hpp"

#include <regex>
#include <set>
#include <unordered_set>

namespace {

std::unordered_set<std::string> extract_symbols(const conflictcraft::Hunk& hunk) {
  std::unordered_set<std::string> symbols;
  static const std::regex identifier_regex("[A-Za-z_][A-Za-z0-9_]*");

  auto collect = [&](const std::vector<std::string>& lines) {
    for (const auto& line : lines) {
      for (auto it = std::sregex_iterator(line.begin(), line.end(), identifier_regex);
           it != std::sregex_iterator(); ++it) {
        symbols.insert(it->str());
      }
    }
  };

  collect(hunk.base_lines);
  collect(hunk.ours_lines);
  collect(hunk.theirs_lines);

  return symbols;
}

}  // namespace

namespace conflictcraft {

ConflictGraph build_conflict_graph(const std::vector<Hunk>& hunks) {
  ConflictGraph graph;
  graph.nodes.reserve(hunks.size());

  for (std::size_t i = 0; i < hunks.size(); ++i) {
    GraphNode node;
    node.node_id = "node_" + std::to_string(i + 1);
    node.hunk_id = hunks[i].hunk_id.empty() ? hunks[i].id : hunks[i].hunk_id;
    node.category = hunks[i].type;
    graph.nodes.push_back(std::move(node));
  }

  std::set<std::string> edge_keys;

  auto add_edge = [&](const std::string& from, const std::string& to, const std::string& reason) {
    const std::string key = from + "|" + to + "|" + reason;
    if (!edge_keys.insert(key).second) {
      return;
    }
    graph.edges.push_back({from, to, reason});
    for (auto& node : graph.nodes) {
      if (node.node_id == to) {
        node.depends_on.push_back(from);
      }
    }
  };

  for (std::size_t i = 1; i < hunks.size(); ++i) {
    add_edge(graph.nodes[i - 1].node_id, graph.nodes[i].node_id, "ordering");

    const auto& prev = hunks[i - 1];
    const auto& curr = hunks[i];
    if (curr.base_range.start <= prev.base_range.end + 1) {
      add_edge(graph.nodes[i - 1].node_id, graph.nodes[i].node_id, "adjacent");
    }
  }

  std::vector<std::unordered_set<std::string>> symbols;
  symbols.reserve(hunks.size());
  for (const auto& h : hunks) {
    symbols.push_back(extract_symbols(h));
  }

  for (std::size_t i = 0; i < symbols.size(); ++i) {
    for (std::size_t j = i + 1; j < symbols.size(); ++j) {
      bool overlap = false;
      for (const auto& symbol : symbols[i]) {
        if (symbols[j].count(symbol) > 0) {
          overlap = true;
          break;
        }
      }
      if (overlap) {
        add_edge(graph.nodes[i].node_id, graph.nodes[j].node_id, "symbol_overlap");
      }
    }
  }

  return graph;
}

}  // namespace conflictcraft
