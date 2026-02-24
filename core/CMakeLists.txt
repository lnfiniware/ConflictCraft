cmake_minimum_required(VERSION 3.20)
project(conflictcraft_core LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_library(conflictcraft_lib
  src/parser.cpp
  src/diff3.cpp
  src/graph.cpp
  src/hash.cpp
  src/serializer.cpp
  src/resolve.cpp
)

target_include_directories(conflictcraft_lib
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

add_executable(conflictcraft_core src/main.cpp)
target_link_libraries(conflictcraft_core PRIVATE conflictcraft_lib)

enable_testing()

add_executable(test_parser tests/test_parser.cpp)
target_link_libraries(test_parser PRIVATE conflictcraft_lib)
add_test(NAME test_parser COMMAND test_parser)

add_executable(test_diff3 tests/test_diff3.cpp)
target_link_libraries(test_diff3 PRIVATE conflictcraft_lib)
add_test(NAME test_diff3 COMMAND test_diff3)

add_executable(test_graph tests/test_graph.cpp)
target_link_libraries(test_graph PRIVATE conflictcraft_lib)
add_test(NAME test_graph COMMAND test_graph)

add_executable(test_resolve tests/test_resolve.cpp)
target_link_libraries(test_resolve PRIVATE conflictcraft_lib)
add_test(NAME test_resolve COMMAND test_resolve)
