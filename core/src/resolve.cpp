#include "conflictcraft/resolve.hpp"

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

}  // namespace conflictcraft
