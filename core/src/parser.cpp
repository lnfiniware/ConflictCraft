#include "conflictcraft/parser.hpp"

#include <algorithm>
#include <fstream>
#include <sstream>

#include "conflictcraft/diff3.hpp"

namespace {

std::string strip_cr(std::string line) {
  if (!line.empty() && line.back() == '\r') {
    line.pop_back();
  }
  return line;
}

bool starts_with(const std::string& value, const std::string& prefix) {
  return value.rfind(prefix, 0) == 0;
}

}  // namespace

namespace conflictcraft {

bool read_file_lines(const std::string& path, std::vector<std::string>* out_lines, std::string* error) {
  std::ifstream in(path);
  if (!in.is_open()) {
    if (error) {
      *error = "failed to open file: " + path;
    }
    return false;
  }

  out_lines->clear();
  std::string line;
  while (std::getline(in, line)) {
    out_lines->push_back(strip_cr(line));
  }
  return true;
}

bool write_file_text(const std::string& path, const std::string& content, std::string* error) {
  std::ofstream out(path, std::ios::binary);
  if (!out.is_open()) {
    if (error) {
      *error = "failed to write file: " + path;
    }
    return false;
  }
  out << content;
  return true;
}

bool parse_conflict_markers(const std::vector<std::string>& lines, ParsedConflictFile* parsed, std::string* error) {
  enum class State {
    kNormal,
    kOurs,
    kBase,
    kTheirs,
  };

  State state = State::kNormal;
  parsed->base_lines.clear();
  parsed->ours_lines.clear();
  parsed->theirs_lines.clear();

  std::vector<std::string> ours_chunk;
  std::vector<std::string> base_chunk;
  std::vector<std::string> theirs_chunk;

  for (const auto& raw_line : lines) {
    const std::string line = strip_cr(raw_line);

    if (state == State::kNormal) {
      if (starts_with(line, "<<<<<<<")) {
        state = State::kOurs;
        ours_chunk.clear();
        base_chunk.clear();
        theirs_chunk.clear();
      } else {
        parsed->base_lines.push_back(line);
        parsed->ours_lines.push_back(line);
        parsed->theirs_lines.push_back(line);
      }
      continue;
    }

    if (state == State::kOurs) {
      if (starts_with(line, "|||||||")) {
        state = State::kBase;
      } else if (starts_with(line, "=======")) {
        state = State::kTheirs;
      } else if (starts_with(line, ">>>>>>>")) {
        if (error) {
          *error = "invalid conflict block: missing ======= separator";
        }
        return false;
      } else {
        ours_chunk.push_back(line);
      }
      continue;
    }

    if (state == State::kBase) {
      if (starts_with(line, "=======")) {
        state = State::kTheirs;
      } else {
        base_chunk.push_back(line);
      }
      continue;
    }

    if (state == State::kTheirs) {
      if (starts_with(line, ">>>>>>>")) {
        if (base_chunk.empty()) {
          // Without an explicit diff3 base section, use ours as synthetic base.
          base_chunk = ours_chunk;
        }

        parsed->base_lines.insert(parsed->base_lines.end(), base_chunk.begin(), base_chunk.end());
        parsed->ours_lines.insert(parsed->ours_lines.end(), ours_chunk.begin(), ours_chunk.end());
        parsed->theirs_lines.insert(parsed->theirs_lines.end(), theirs_chunk.begin(), theirs_chunk.end());

        ours_chunk.clear();
        base_chunk.clear();
        theirs_chunk.clear();
        state = State::kNormal;
      } else {
        theirs_chunk.push_back(line);
      }
      continue;
    }
  }

  if (state != State::kNormal) {
    if (error) {
      *error = "unterminated conflict block";
    }
    return false;
  }

  return true;
}

std::vector<Hunk> build_hunks_from_three_way(
    const std::vector<std::string>& base,
    const std::vector<std::string>& ours,
    const std::vector<std::string>& theirs) {
  return diff3_line_hunks(base, ours, theirs);
}

}  // namespace conflictcraft
