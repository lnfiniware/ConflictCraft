#pragma once

#include <vector>

#include "conflictcraft/types.hpp"

namespace conflictcraft {

std::vector<Hunk> diff3_line_hunks(
    const std::vector<std::string>& base,
    const std::vector<std::string>& ours,
    const std::vector<std::string>& theirs);

}  // namespace conflictcraft
