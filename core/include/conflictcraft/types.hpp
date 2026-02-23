#pragma once

#include <string>
#include <vector>

namespace conflictcraft {

struct Range {
  int start = 0;
  int end = 0;
};

struct Hunk {
  std::string id;
  std::string type;
  Range base_range;
  Range ours_range;
  Range theirs_range;
  std::vector<std::string> base_lines;
  std::vector<std::string> ours_lines;
  std::vector<std::string> theirs_lines;
  bool is_conflict = false;
  std::string symbol;
};

struct GraphNode {
  std::string node_id;
  std::string hunk_id;
  std::string category;
  std::vector<std::string> depends_on;
};

struct GraphEdge {
  std::string from;
  std::string to;
  std::string reason;
};

struct ConflictGraph {
  std::vector<GraphNode> nodes;
  std::vector<GraphEdge> edges;
};

struct AnalysisResult {
  std::string schema_version = "1.0.0";
  std::string protocol_version = "1.0.0";
  std::string file;
  std::string encoding = "utf-8";
  std::vector<Hunk> hunks;
  ConflictGraph graph;
  bool analysis_required = true;
  std::string engine_version = "0.1.0";
  std::string generated_at;
};

struct ParsedConflictFile {
  std::vector<std::string> base_lines;
  std::vector<std::string> ours_lines;
  std::vector<std::string> theirs_lines;
};

}  // namespace conflictcraft
