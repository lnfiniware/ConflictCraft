ifeq ($(OS),Windows_NT)
  PYTHON ?= python
  CMAKE_GEN ?= MinGW Makefiles
  MAKE_BIN ?= mingw32-make
else
  PYTHON ?= python3
  CMAKE_GEN ?= Unix Makefiles
  MAKE_BIN ?= make
endif

.PHONY: all core python extension test core-test python-test extension-test clean

all: core python extension

core:
	cmake -S core -B core/build -G "$(CMAKE_GEN)"
	cmake --build core/build

python:
	$(PYTHON) -m pip install -r python_engine/requirements.txt

extension:
	cd vscode-extension && npm install && npm run compile

test: core-test python-test extension-test

core-test: core
	ctest --test-dir core/build --output-on-failure

python-test:
	$(PYTHON) -m pytest python_engine/tests

extension-test:
	cd vscode-extension && npm run test

clean:
	rm -rf core/build vscode-extension/out
