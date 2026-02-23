#pragma once

#include <string>
#include <vector>

namespace conflictcraft {

bool contains_conflict_markers(const std::vector<std::string>& lines);
std::string join_lines(const std::vector<std::string>& lines);

}  // namespace conflictcraft
