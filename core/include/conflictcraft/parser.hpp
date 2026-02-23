#pragma once

#include <string>
#include <vector>

#include "conflictcraft/types.hpp"

namespace conflictcraft {

bool read_file_lines(const std::string& path, std::vector<std::string>* out_lines, std::string* error);
bool write_file_text(const std::string& path, const std::string& content, std::string* error);

bool parse_conflict_markers(const std::vector<std::string>& lines, ParsedConflictFile* parsed, std::string* error);

std::vector<Hunk> build_hunks_from_three_way(
    const std::vector<std::string>& base,
    const std::vector<std::string>& ours,
    const std::vector<std::string>& theirs);

}  // namespace conflictcraft
