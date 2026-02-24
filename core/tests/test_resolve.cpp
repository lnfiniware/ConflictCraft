#include <algorithm>
#include <vector>

#include "conflictcraft/resolve.hpp"
#include "test_common.hpp"

int main() {
  std::vector<std::string> clean = {"a", "b"};
  std::vector<std::string> conflicted = {"<<<<<<< HEAD", "x", "=======", "y", ">>>>>>> main"};

  REQUIRE_TRUE(!conflictcraft::contains_conflict_markers(clean));
  REQUIRE_TRUE(conflictcraft::contains_conflict_markers(conflicted));
  REQUIRE_EQ(conflictcraft::join_lines(clean), "a\nb");

  std::vector<std::string> base = {"line1", "x", "line3"};
  std::vector<std::string> ours = {"line1", "ours", "line3"};
  std::vector<std::string> theirs_same_base = {"line1", "x", "line3"};
  auto merged_safe = conflictcraft::merge_three_way_lines(base, ours, theirs_same_base, "HEAD", "main");
  REQUIRE_TRUE(!conflictcraft::contains_conflict_markers(merged_safe));
  REQUIRE_EQ(conflictcraft::join_lines(merged_safe), "line1\nours\nline3");

  std::vector<std::string> theirs_conflict = {"line1", "theirs", "line3"};
  auto merged_conflict = conflictcraft::merge_three_way_lines(base, ours, theirs_conflict, "HEAD", "main");
  REQUIRE_TRUE(conflictcraft::contains_conflict_markers(merged_conflict));
  REQUIRE_TRUE(std::find(merged_conflict.begin(), merged_conflict.end(), "ours") != merged_conflict.end());
  REQUIRE_TRUE(std::find(merged_conflict.begin(), merged_conflict.end(), "theirs") != merged_conflict.end());

  return 0;
}
