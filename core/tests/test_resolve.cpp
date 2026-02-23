#include <vector>

#include "conflictcraft/resolve.hpp"
#include "test_common.hpp"

int main() {
  std::vector<std::string> clean = {"a", "b"};
  std::vector<std::string> conflicted = {"<<<<<<< HEAD", "x", "=======", "y", ">>>>>>> main"};

  REQUIRE_TRUE(!conflictcraft::contains_conflict_markers(clean));
  REQUIRE_TRUE(conflictcraft::contains_conflict_markers(conflicted));
  REQUIRE_EQ(conflictcraft::join_lines(clean), "a\nb");

  return 0;
}
