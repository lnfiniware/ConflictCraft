#pragma once

#include <string>
#include <vector>

#include "conflictcraft/types.hpp"

namespace conflictcraft {

bool contains_conflict_markers(const std::vector<std::string>& lines);
std::string join_lines(const std::vector<std::string>& lines);
std::vector<std::string> merge_three_way_lines(
    const std::vector<std::string>& base,
    const std::vector<std::string>& ours,
    const std::vector<std::string>& theirs,
    const std::string& ours_label = "ours",
    const std::string& theirs_label = "theirs");

}  // namespace conflictcraft
