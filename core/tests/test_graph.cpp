#include <vector>

#include "conflictcraft/graph.hpp"
#include "test_common.hpp"

int main() {
  conflictcraft::Hunk h1;
  h1.id = "hunk_1";
  h1.type = "conflict";
  h1.base_range = {0, 2};
  h1.ours_lines = {"int value = 1;"};

  conflictcraft::Hunk h2;
  h2.id = "hunk_2";
  h2.type = "change";
  h2.base_range = {2, 4};
  h2.ours_lines = {"value += 1;"};

  std::vector<conflictcraft::Hunk> hunks = {h1, h2};
  auto graph = conflictcraft::build_conflict_graph(hunks);

  REQUIRE_EQ(graph.nodes.size(), static_cast<size_t>(2));
  REQUIRE_TRUE(!graph.edges.empty());

  bool found_ordering = false;
  for (const auto& edge : graph.edges) {
    if (edge.reason == "ordering") {
      found_ordering = true;
      break;
    }
  }

  REQUIRE_TRUE(found_ordering);
  return 0;
}
