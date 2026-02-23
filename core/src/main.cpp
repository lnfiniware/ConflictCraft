#include <chrono>
#include <ctime>
#include <filesystem>
#include <iostream>
#include <map>
#include <string>
#include <vector>

#include "conflictcraft/graph.hpp"
#include "conflictcraft/parser.hpp"
#include "conflictcraft/serializer.hpp"

namespace {

std::string now_iso8601_utc() {
  const auto now = std::chrono::system_clock::now();
  const std::time_t now_c = std::chrono::system_clock::to_time_t(now);

  std::tm tm_utc{};
#ifdef _WIN32
  gmtime_s(&tm_utc, &now_c);
#else
  gmtime_r(&now_c, &tm_utc);
#endif

  char buffer[32] = {0};
  std::strftime(buffer, sizeof(buffer), "%Y-%m-%dT%H:%M:%SZ", &tm_utc);
  return std::string(buffer);
}

std::map<std::string, std::string> parse_flags(int argc, char** argv, int start_index) {
  std::map<std::string, std::string> flags;
  for (int i = start_index; i < argc; ++i) {
    const std::string key = argv[i];
    if (key.rfind("--", 0) != 0) {
      continue;
    }
    if (i + 1 < argc) {
      flags[key] = argv[i + 1];
      ++i;
    } else {
      flags[key] = "";
    }
  }
  return flags;
}

std::string usage() {
  return
      "Usage:\n"
      "  conflictcraft_core analyze --conflict-file <path> --out <json> [--file <name>]\n"
      "  conflictcraft_core analyze --base <path> --ours <path> --theirs <path> --out <json> [--file <name>]\n";
}

}  // namespace

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cerr << usage();
    return 1;
  }

  const std::string command = argv[1];
  if (command != "analyze") {
    std::cerr << "unsupported command: " << command << "\n";
    std::cerr << usage();
    return 1;
  }

  const auto flags = parse_flags(argc, argv, 2);
  std::string error;

  std::vector<std::string> base;
  std::vector<std::string> ours;
  std::vector<std::string> theirs;
  std::string file_name;

  const auto conflict_file_it = flags.find("--conflict-file");
  if (conflict_file_it != flags.end()) {
    std::vector<std::string> conflict_lines;
    if (!conflictcraft::read_file_lines(conflict_file_it->second, &conflict_lines, &error)) {
      std::cerr << error << "\n";
      return 1;
    }

    conflictcraft::ParsedConflictFile parsed;
    if (!conflictcraft::parse_conflict_markers(conflict_lines, &parsed, &error)) {
      std::cerr << error << "\n";
      return 1;
    }

    base = std::move(parsed.base_lines);
    ours = std::move(parsed.ours_lines);
    theirs = std::move(parsed.theirs_lines);

    const auto explicit_file = flags.find("--file");
    if (explicit_file != flags.end() && !explicit_file->second.empty()) {
      file_name = explicit_file->second;
    } else {
      file_name = std::filesystem::path(conflict_file_it->second).filename().string();
    }
  } else {
    const auto base_it = flags.find("--base");
    const auto ours_it = flags.find("--ours");
    const auto theirs_it = flags.find("--theirs");

    if (base_it == flags.end() || ours_it == flags.end() || theirs_it == flags.end()) {
      std::cerr << "missing required flags for explicit analyze mode\n";
      std::cerr << usage();
      return 1;
    }

    if (!conflictcraft::read_file_lines(base_it->second, &base, &error) ||
        !conflictcraft::read_file_lines(ours_it->second, &ours, &error) ||
        !conflictcraft::read_file_lines(theirs_it->second, &theirs, &error)) {
      std::cerr << error << "\n";
      return 1;
    }

    const auto explicit_file = flags.find("--file");
    if (explicit_file != flags.end() && !explicit_file->second.empty()) {
      file_name = explicit_file->second;
    } else {
      file_name = std::filesystem::path(ours_it->second).filename().string();
    }
  }

  conflictcraft::AnalysisResult result;
  result.file = file_name;
  result.hunks = conflictcraft::build_hunks_from_three_way(base, ours, theirs);
  result.graph = conflictcraft::build_conflict_graph(result.hunks);
  result.analysis_required = false;
  for (const auto& h : result.hunks) {
    if (h.is_conflict) {
      result.analysis_required = true;
      break;
    }
  }
  result.generated_at = now_iso8601_utc();

  const std::string json = conflictcraft::to_json(result);

  const auto out_it = flags.find("--out");
  if (out_it == flags.end() || out_it->second.empty()) {
    std::cout << json << "\n";
    return 0;
  }

  if (!conflictcraft::write_file_text(out_it->second, json, &error)) {
    std::cerr << error << "\n";
    return 1;
  }

  return 0;
}
