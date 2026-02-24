#include "conflictcraft/diff3.hpp"

#include <algorithm>
#include <sstream>

#include "conflictcraft/hash.hpp"

namespace {

const std::string& line_at(const std::vector<std::string>& lines, std::size_t index) {
  static const std::string kEmpty;
  if (index >= lines.size()) {
    return kEmpty;
  }
  return lines[index];
}

std::vector<std::string> slice(const std::vector<std::string>& lines, std::size_t start, std::size_t end) {
  if (start >= lines.size()) {
    return {};
  }
  const std::size_t bounded_end = std::min(end, lines.size());
  if (start >= bounded_end) {
    return {};
  }
  return std::vector<std::string>(lines.begin() + static_cast<std::ptrdiff_t>(start),
                                  lines.begin() + static_cast<std::ptrdiff_t>(bounded_end));
}

std::string canonical_hunk_payload(
    const std::vector<std::string>& base_lines,
    const std::vector<std::string>& ours_lines,
    const std::vector<std::string>& theirs_lines) {
  std::ostringstream out;
  out << "base\n";
  for (const auto& line : base_lines) {
    out << line << "\n";
  }
  out << "---\nours\n";
  for (const auto& line : ours_lines) {
    out << line << "\n";
  }
  out << "---\ntheirs\n";
  for (const auto& line : theirs_lines) {
    out << line << "\n";
  }
  return out.str();
}

}  // namespace

namespace conflictcraft {

std::vector<Hunk> diff3_line_hunks(
    const std::vector<std::string>& base,
    const std::vector<std::string>& ours,
    const std::vector<std::string>& theirs) {
  const std::size_t max_len = std::max(base.size(), std::max(ours.size(), theirs.size()));
  std::vector<Hunk> hunks;

  auto changed_at = [&](std::size_t idx) {
    const std::string& b = line_at(base, idx);
    const std::string& o = line_at(ours, idx);
    const std::string& t = line_at(theirs, idx);
    return b != o || b != t || o != t;
  };

  std::size_t i = 0;
  int hunk_id = 1;
  while (i < max_len) {
    if (!changed_at(i)) {
      ++i;
      continue;
    }

    const std::size_t start = i;
    while (i < max_len && changed_at(i)) {
      ++i;
    }
    const std::size_t end = i;

    Hunk hunk;
    hunk.id = "hunk_" + std::to_string(hunk_id++);
    hunk.base_range = {static_cast<int>(start), static_cast<int>(end)};
    hunk.ours_range = {static_cast<int>(start), static_cast<int>(end)};
    hunk.theirs_range = {static_cast<int>(start), static_cast<int>(end)};

    hunk.base_lines = slice(base, start, end);
    hunk.ours_lines = slice(ours, start, end);
    hunk.theirs_lines = slice(theirs, start, end);
    hunk.hunk_id = sha256_hex(canonical_hunk_payload(hunk.base_lines, hunk.ours_lines, hunk.theirs_lines));

    const bool same_ours_theirs = hunk.ours_lines == hunk.theirs_lines;
    const bool ours_matches_base = hunk.ours_lines == hunk.base_lines;
    const bool theirs_matches_base = hunk.theirs_lines == hunk.base_lines;

    hunk.is_conflict = !(same_ours_theirs || ours_matches_base || theirs_matches_base);
    hunk.type = hunk.is_conflict ? "conflict" : "change";

    hunks.push_back(std::move(hunk));
  }

  return hunks;
}

}  // namespace conflictcraft
