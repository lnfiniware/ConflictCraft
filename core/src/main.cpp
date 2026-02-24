#include <chrono>
#include <ctime>
#include <filesystem>
#include <iostream>
#include <map>
#include <string>
#include <vector>

#include "conflictcraft/graph.hpp"
#include "conflictcraft/parser.hpp"
#include "conflictcraft/resolve.hpp"
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
      "  conflictcraft_core analyze --base <path> --ours <path> --theirs <path> --out <json> [--file <name>]\n"
      "  conflictcraft_core merge --conflict-file <path> [--out <path>] [--ours-label <name>] [--theirs-label <name>]\n"
      "  conflictcraft_core merge --base <path> --ours <path> --theirs <path> [--out <path>] [--ours-label <name>] [--theirs-label <name>]\n";
}

bool load_three_way_inputs(
    const std::map<std::string, std::string>& flags,
    std::vector<std::string>* base,
    std::vector<std::string>* ours,
    std::vector<std::string>* theirs,
    std::string* file_name,
    std::string* error) {
  const auto conflict_file_it = flags.find("--conflict-file");
  if (conflict_file_it != flags.end()) {
    std::vector<std::string> conflict_lines;
    if (!conflictcraft::read_file_lines(conflict_file_it->second, &conflict_lines, error)) {
      return false;
    }

    conflictcraft::ParsedConflictFile parsed;
    if (!conflictcraft::parse_conflict_markers(conflict_lines, &parsed, error)) {
      return false;
    }

    *base = std::move(parsed.base_lines);
    *ours = std::move(parsed.ours_lines);
    *theirs = std::move(parsed.theirs_lines);

    const auto explicit_file = flags.find("--file");
    if (explicit_file != flags.end() && !explicit_file->second.empty()) {
      *file_name = explicit_file->second;
    } else {
      *file_name = std::filesystem::path(conflict_file_it->second).filename().string();
    }
    return true;
  }

  const auto base_it = flags.find("--base");
  const auto ours_it = flags.find("--ours");
  const auto theirs_it = flags.find("--theirs");

  if (base_it == flags.end() || ours_it == flags.end() || theirs_it == flags.end()) {
    if (error) {
      *error = "missing required flags for explicit mode";
    }
    return false;
  }

  if (!conflictcraft::read_file_lines(base_it->second, base, error) ||
      !conflictcraft::read_file_lines(ours_it->second, ours, error) ||
      !conflictcraft::read_file_lines(theirs_it->second, theirs, error)) {
    return false;
  }

  const auto explicit_file = flags.find("--file");
  if (explicit_file != flags.end() && !explicit_file->second.empty()) {
    *file_name = explicit_file->second;
  } else {
    *file_name = std::filesystem::path(ours_it->second).filename().string();
  }
  return true;
}

}  // namespace

int main(int argc, char** argv) {
  if (argc < 2) {
    std::cerr << usage();
    return 1;
  }

  const std::string command = argv[1];
  if (command != "analyze" && command != "merge") {
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

  if (!load_three_way_inputs(flags, &base, &ours, &theirs, &file_name, &error)) {
    if (error == "missing required flags for explicit mode") {
      std::cerr << error << "\n";
      std::cerr << usage();
      return 1;
    }
    std::cerr << error << "\n";
    return 1;
  }

  if (command == "analyze") {
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

  std::string ours_label = "ours";
  std::string theirs_label = "theirs";
  const auto ours_label_it = flags.find("--ours-label");
  const auto theirs_label_it = flags.find("--theirs-label");
  if (ours_label_it != flags.end() && !ours_label_it->second.empty()) {
    ours_label = ours_label_it->second;
  }
  if (theirs_label_it != flags.end() && !theirs_label_it->second.empty()) {
    theirs_label = theirs_label_it->second;
  }

  const auto merged_lines = conflictcraft::merge_three_way_lines(base, ours, theirs, ours_label, theirs_label);
  const std::string merged_text = conflictcraft::join_lines(merged_lines);
  const auto out_it = flags.find("--out");
  if (out_it == flags.end() || out_it->second.empty()) {
    std::cout << merged_text << "\n";
  } else if (!conflictcraft::write_file_text(out_it->second, merged_text, &error)) {
    std::cerr << error << "\n";
    return 1;
  }

  if (conflictcraft::contains_conflict_markers(merged_lines)) {
    return 2;
  }
  return 0;
}
