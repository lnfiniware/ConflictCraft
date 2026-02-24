#include <vector>

#include "conflictcraft/diff3.hpp"
#include "test_common.hpp"

int main() {
  std::vector<std::string> base = {
      "import a from 'a';",
      "const x = 1;",
      "return x;",
  };

  std::vector<std::string> ours = {
      "import a from 'a';",
      "const x = 2;",
      "return x;",
  };

  std::vector<std::string> theirs = {
      "import a from 'a';",
      "const x = 3;",
      "return x;",
  };

  auto hunks = conflictcraft::diff3_line_hunks(base, ours, theirs);

  REQUIRE_EQ(hunks.size(), static_cast<size_t>(1));
  REQUIRE_TRUE(hunks[0].is_conflict);
  REQUIRE_EQ(hunks[0].type, "conflict");
  REQUIRE_EQ(hunks[0].base_range.start, 1);
  REQUIRE_EQ(hunks[0].hunk_id.size(), static_cast<size_t>(64));
  auto second_run = conflictcraft::diff3_line_hunks(base, ours, theirs);
  REQUIRE_EQ(second_run[0].hunk_id, hunks[0].hunk_id);

  return 0;
}
