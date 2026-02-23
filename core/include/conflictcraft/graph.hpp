#pragma once

#include <vector>

#include "conflictcraft/types.hpp"

namespace conflictcraft {

ConflictGraph build_conflict_graph(const std::vector<Hunk>& hunks);

}  // namespace conflictcraft
