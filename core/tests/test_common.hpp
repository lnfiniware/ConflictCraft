#pragma once

#include <iostream>
#include <string>

inline int fail(const std::string& message) {
  std::cerr << "TEST FAILED: " << message << "\n";
  return 1;
}

#define REQUIRE_TRUE(expr) \
  do {                     \
    if (!(expr)) {         \
      return fail(#expr);  \
    }                      \
  } while (0)

#define REQUIRE_EQ(lhs, rhs)             \
  do {                                   \
    if (!((lhs) == (rhs))) {             \
      return fail(std::string(#lhs) +    \
                  " != " + std::string(#rhs)); \
    }                                    \
  } while (0)
