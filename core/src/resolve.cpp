#include "conflictcraft/resolve.hpp"

#include <algorithm>
#include <sstream>

namespace conflictcraft {

bool contains_conflict_markers(const std::vector<std::string>& lines) {
  for (const auto& line : lines) {
    if (line.rfind("<<<<<<<", 0) == 0 || line.rfind("=======", 0) == 0 || line.rfind(">>>>>>>", 0) == 0) {
      return true;
    }
  }
  return false;
}

std::string join_lines(const std::vector<std::string>& lines) {
  std::ostringstream out;
  for (std::size_t i = 0; i < lines.size(); ++i) {
    out << lines[i];
    if (i + 1 < lines.size()) {
      out << "\n";
    }
  }
  return out.str();
}

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

void append_lines(std::vector<std::string>* out, const std::vector<std::string>& lines) {
  out->insert(out->end(), lines.begin(), lines.end());
}

}  // namespace

std::vector<std::string> merge_three_way_lines(
    const std::vector<std::string>& base,
    const std::vector<std::string>& ours,
    const std::vector<std::string>& theirs,
    const std::string& ours_label,
    const std::string& theirs_label) {
  const std::size_t max_len = std::max(base.size(), std::max(ours.size(), theirs.size()));
  std::vector<std::string> out;
  out.reserve(max_len + 8);

  auto changed_at = [&](std::size_t idx) {
    const std::string& b = line_at(base, idx);
    const std::string& o = line_at(ours, idx);
    const std::string& t = line_at(theirs, idx);
    return b != o || b != t || o != t;
  };

  std::size_t i = 0;
  while (i < max_len) {
    if (!changed_at(i)) {
      if (i < ours.size()) {
        out.push_back(ours[i]);
      } else if (i < base.size()) {
        out.push_back(base[i]);
      } else if (i < theirs.size()) {
        out.push_back(theirs[i]);
      }
      ++i;
      continue;
    }

    const std::size_t start = i;
    while (i < max_len && changed_at(i)) {
      ++i;
    }
    const std::size_t end = i;

    const std::vector<std::string> b = slice(base, start, end);
    const std::vector<std::string> o = slice(ours, start, end);
    const std::vector<std::string> t = slice(theirs, start, end);

    const bool same_ours_theirs = o == t;
    const bool ours_matches_base = o == b;
    const bool theirs_matches_base = t == b;

    if (same_ours_theirs) {
      append_lines(&out, o);
      continue;
    }

    if (ours_matches_base) {
      append_lines(&out, t);
      continue;
    }

    if (theirs_matches_base) {
      append_lines(&out, o);
      continue;
    }

    out.push_back("<<<<<<< " + ours_label);
    append_lines(&out, o);
    out.push_back("=======");
    append_lines(&out, t);
    out.push_back(">>>>>>> " + theirs_label);
  }

  return out;
}

}  // namespace conflictcraft
