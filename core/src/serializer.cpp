#include "conflictcraft/serializer.hpp"

#include <sstream>

namespace {

std::string escape_json(const std::string& input) {
  std::ostringstream out;
  for (const char c : input) {
    switch (c) {
      case '\\':
        out << "\\\\";
        break;
      case '"':
        out << "\\\"";
        break;
      case '\n':
        out << "\\n";
        break;
      case '\r':
        out << "\\r";
        break;
      case '\t':
        out << "\\t";
        break;
      default:
        out << c;
        break;
    }
  }
  return out.str();
}

void write_string_array(std::ostringstream& out, const std::vector<std::string>& values) {
  out << "[";
  for (std::size_t i = 0; i < values.size(); ++i) {
    if (i > 0) {
      out << ",";
    }
    out << "\"" << escape_json(values[i]) << "\"";
  }
  out << "]";
}

void write_range(std::ostringstream& out, const conflictcraft::Range& range) {
  out << "{\"start\":" << range.start << ",\"end\":" << range.end << "}";
}

}  // namespace

namespace conflictcraft {

std::string to_json(const AnalysisResult& result) {
  std::ostringstream out;
  out << "{";
  out << "\"schema_version\":\"" << escape_json(result.schema_version) << "\",";
  out << "\"protocol_version\":\"" << escape_json(result.protocol_version) << "\",";
  out << "\"file\":\"" << escape_json(result.file) << "\",";
  out << "\"encoding\":\"" << escape_json(result.encoding) << "\",";

  out << "\"hunks\":[";
  for (std::size_t i = 0; i < result.hunks.size(); ++i) {
    const auto& h = result.hunks[i];
    if (i > 0) {
      out << ",";
    }
    out << "{";
    out << "\"id\":\"" << escape_json(h.id) << "\",";
    out << "\"type\":\"" << escape_json(h.type) << "\",";
    out << "\"base_range\":";
    write_range(out, h.base_range);
    out << ",\"ours_range\":";
    write_range(out, h.ours_range);
    out << ",\"theirs_range\":";
    write_range(out, h.theirs_range);
    out << ",\"base_lines\":";
    write_string_array(out, h.base_lines);
    out << ",\"ours_lines\":";
    write_string_array(out, h.ours_lines);
    out << ",\"theirs_lines\":";
    write_string_array(out, h.theirs_lines);
    out << ",\"is_conflict\":" << (h.is_conflict ? "true" : "false");
    out << ",\"metadata\":{\"symbol\":\"" << escape_json(h.symbol) << "\"}";
    out << "}";
  }
  out << "],";

  out << "\"graph\":{";
  out << "\"nodes\":[";
  for (std::size_t i = 0; i < result.graph.nodes.size(); ++i) {
    const auto& node = result.graph.nodes[i];
    if (i > 0) {
      out << ",";
    }
    out << "{";
    out << "\"node_id\":\"" << escape_json(node.node_id) << "\",";
    out << "\"hunk_id\":\"" << escape_json(node.hunk_id) << "\",";
    out << "\"category\":\"" << escape_json(node.category) << "\",";
    out << "\"depends_on\":";
    write_string_array(out, node.depends_on);
    out << "}";
  }
  out << "],";

  out << "\"edges\":[";
  for (std::size_t i = 0; i < result.graph.edges.size(); ++i) {
    const auto& edge = result.graph.edges[i];
    if (i > 0) {
      out << ",";
    }
    out << "{";
    out << "\"from\":\"" << escape_json(edge.from) << "\",";
    out << "\"to\":\"" << escape_json(edge.to) << "\",";
    out << "\"reason\":\"" << escape_json(edge.reason) << "\"";
    out << "}";
  }
  out << "]";
  out << "},";

  out << "\"analysis_required\":" << (result.analysis_required ? "true" : "false") << ",";
  out << "\"meta\":{";
  out << "\"engine_version\":\"" << escape_json(result.engine_version) << "\",";
  out << "\"generated_at\":\"" << escape_json(result.generated_at) << "\"";
  out << "}";

  out << "}";
  return out.str();
}

}  // namespace conflictcraft
