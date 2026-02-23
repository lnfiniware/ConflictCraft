#include <vector>

#include "conflictcraft/parser.hpp"
#include "test_common.hpp"

int main() {
  std::vector<std::string> lines = {
      "const a = 1;",
      "<<<<<<< HEAD",
      "import x from 'x';",
      "||||||| base",
      "import a from 'a';",
      "=======",
      "import b from 'b';",
      ">>>>>>> feature",
      "const b = 2;",
  };

  conflictcraft::ParsedConflictFile parsed;
  std::string error;

  REQUIRE_TRUE(conflictcraft::parse_conflict_markers(lines, &parsed, &error));
  REQUIRE_TRUE(error.empty());

  REQUIRE_EQ(parsed.ours_lines.size(), static_cast<size_t>(3));
  REQUIRE_EQ(parsed.base_lines.size(), static_cast<size_t>(3));
  REQUIRE_EQ(parsed.theirs_lines.size(), static_cast<size_t>(3));

  REQUIRE_EQ(parsed.ours_lines[1], "import x from 'x';");
  REQUIRE_EQ(parsed.base_lines[1], "import a from 'a';");
  REQUIRE_EQ(parsed.theirs_lines[1], "import b from 'b';");

  return 0;
}
