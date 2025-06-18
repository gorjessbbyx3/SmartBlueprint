# SmartBlueprint Pro - Unified Build Interface
# Cross-platform build system for all components

.PHONY: all desktop android ios python test clean help

# Default target
all: desktop android ios python

# Help target
help:
	@echo "SmartBlueprint Pro Build System"
	@echo "=============================="
	@echo "Available targets:"
	@echo "  all        - Build all platforms"
	@echo "  desktop    - Build native desktop application"
	@echo "  android    - Build Android APK"
	@echo "  ios        - Build iOS application (macOS only)"
	@echo "  python     - Install Python ML dependencies"
	@echo "  test       - Run all tests"
	@echo "  clean      - Clean all build artifacts"
	@echo "  help       - Show this help message"
	@echo ""
	@echo "Platform-specific builds:"
	@echo "  desktop-windows - Windows executable"
	@echo "  desktop-macos   - macOS application"
	@echo "  desktop-linux   - Linux binary"

# Desktop application builds
desktop: desktop-detect

desktop-detect:
	@echo "Detecting platform and building desktop application..."
ifeq ($(OS),Windows_NT)
	$(MAKE) desktop-windows
else
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Linux)
		$(MAKE) desktop-linux
	endif
	ifeq ($(UNAME_S),Darwin)
		$(MAKE) desktop-macos
	endif
endif

desktop-windows:
	@echo "Building Windows desktop application..."
	cd native-core && \
	cmake -B build -DCMAKE_BUILD_TYPE=Release -G "Visual Studio 17 2022" && \
	cmake --build build --config Release && \
	echo "Windows build complete: native-core/build/Release/SmartBlueprintDesktop.exe"

desktop-macos:
	@echo "Building macOS desktop application..."
	cd native-core && \
	cmake -B build -DCMAKE_BUILD_TYPE=Release && \
	cmake --build build --config Release && \
	echo "macOS build complete: native-core/build/SmartBlueprintDesktop"

desktop-linux:
	@echo "Building Linux desktop application..."
	cd native-core && \
	cmake -B build -DCMAKE_BUILD_TYPE=Release && \
	cmake --build build --config Release && \
	echo "Linux build complete: native-core/build/SmartBlueprintDesktop"

# Android application
android:
	@echo "Building Android application..."
	@if [ ! -d "mobile/android" ]; then \
		echo "Error: Android project not found at mobile/android"; \
		exit 1; \
	fi
	cd mobile/android && \
	chmod +x gradlew && \
	./gradlew assembleDebug && \
	echo "Android build complete: mobile/android/app/build/outputs/apk/debug/app-debug.apk"

android-release:
	@echo "Building Android release APK..."
	cd mobile/android && \
	chmod +x gradlew && \
	./gradlew assembleRelease && \
	echo "Android release build complete: mobile/android/app/build/outputs/apk/release/app-release.apk"

# iOS application (macOS only)
ios:
	@echo "Building iOS application..."
ifeq ($(shell uname -s),Darwin)
	@if [ ! -d "mobile/ios" ]; then \
		echo "Error: iOS project not found at mobile/ios"; \
		exit 1; \
	fi
	cd mobile/ios && \
	xcodebuild -project SmartBlueprint.xcodeproj -scheme SmartBlueprint -destination 'platform=iOS Simulator,name=iPhone 14' build && \
	echo "iOS build complete"
else
	@echo "Error: iOS builds require macOS with Xcode"
	@exit 1
endif

# Python ML services
python:
	@echo "Installing Python ML dependencies..."
	python -m pip install --upgrade pip
	pip install pytest pytest-cov numpy scipy scikit-learn
	@if [ -f "pyproject.toml" ]; then \
		pip install -e .; \
	fi
	@echo "Python dependencies installed"

# Testing targets
test: test-native test-android test-ios test-python

test-native:
	@echo "Running native core tests..."
	@if [ -d "native-core/build" ]; then \
		cd native-core/build && ctest --output-on-failure; \
	else \
		echo "Native core not built. Run 'make desktop' first."; \
	fi

test-android:
	@echo "Running Android tests..."
	@if [ -d "mobile/android" ]; then \
		cd mobile/android && ./gradlew test; \
	else \
		echo "Android project not found."; \
	fi

test-ios:
	@echo "Running iOS tests..."
ifeq ($(shell uname -s),Darwin)
	@if [ -d "mobile/ios" ]; then \
		cd mobile/ios && xcodebuild test -project SmartBlueprint.xcodeproj -scheme SmartBlueprint -destination 'platform=iOS Simulator,name=iPhone 14'; \
	else \
		echo "iOS project not found."; \
	fi
else
	@echo "Skipping iOS tests (requires macOS)"
endif

test-python:
	@echo "Running Python tests..."
	@if [ -d "tests/python" ]; then \
		pytest tests/python/ -v; \
	else \
		echo "Python tests not found."; \
	fi

# Package targets
package: package-desktop package-android

package-desktop:
	@echo "Packaging desktop applications..."
	cd native-core/build && \
	cpack -G TGZ && \
	echo "Desktop packages created in native-core/build/"

package-android:
	@echo "Packaging Android application..."
	cd mobile/android && \
	./gradlew bundleRelease && \
	echo "Android bundle created: mobile/android/app/build/outputs/bundle/release/app-release.aab"

# Development setup
setup:
	@echo "Setting up development environment..."
	@echo "Checking dependencies..."
	@which cmake > /dev/null || (echo "Error: CMake not found. Please install CMake 3.16+"; exit 1)
	@which python3 > /dev/null || (echo "Error: Python 3 not found. Please install Python 3.11+"; exit 1)
	@echo "Creating build directories..."
	@mkdir -p native-core/build
	@mkdir -p mobile/android/app/build
	@mkdir -p mobile/ios/build
	@echo "Development environment setup complete"

# Clean targets
clean: clean-desktop clean-android clean-ios clean-python

clean-desktop:
	@echo "Cleaning desktop build artifacts..."
	@rm -rf native-core/build

clean-android:
	@echo "Cleaning Android build artifacts..."
	@if [ -d "mobile/android" ]; then \
		cd mobile/android && ./gradlew clean; \
	fi

clean-ios:
	@echo "Cleaning iOS build artifacts..."
	@if [ -d "mobile/ios" ]; then \
		cd mobile/ios && xcodebuild clean -project SmartBlueprint.xcodeproj -scheme SmartBlueprint || true; \
	fi

clean-python:
	@echo "Cleaning Python artifacts..."
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
	@rm -rf .pytest_cache
	@rm -rf htmlcov

# Development helpers
format:
	@echo "Formatting code..."
	@if command -v clang-format >/dev/null 2>&1; then \
		find native-core -name "*.cpp" -o -name "*.h" | xargs clang-format -i; \
		echo "C++ code formatted"; \
	fi
	@if command -v black >/dev/null 2>&1; then \
		black tests/python/ --line-length 100; \
		echo "Python code formatted"; \
	fi

install:
	@echo "Installing SmartBlueprint Pro..."
	$(MAKE) all
	@echo "Installation complete. Applications available in build directories."

# Debug builds
debug: debug-desktop debug-android

debug-desktop:
	@echo "Building desktop application with debug symbols..."
	cd native-core && \
	cmake -B build-debug -DCMAKE_BUILD_TYPE=Debug && \
	cmake --build build-debug && \
	echo "Debug build complete: native-core/build-debug/SmartBlueprintDesktop"

debug-android:
	@echo "Building Android debug APK..."
	cd mobile/android && \
	./gradlew assembleDebug && \
	echo "Debug APK: mobile/android/app/build/outputs/apk/debug/app-debug.apk"

# Performance profiling
profile:
	@echo "Building with profiling enabled..."
	cd native-core && \
	cmake -B build-profile -DCMAKE_BUILD_TYPE=RelWithDebInfo -DENABLE_PROFILING=ON && \
	cmake --build build-profile && \
	echo "Profile build complete: native-core/build-profile/SmartBlueprintDesktop"