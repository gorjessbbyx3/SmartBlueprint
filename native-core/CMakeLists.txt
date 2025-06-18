cmake_minimum_required(VERSION 3.16)
project(SmartBlueprintPro)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build configuration
if(NOT CMAKE_BUILD_TYPE)
    set(CMAKE_BUILD_TYPE Release)
endif()

# Platform-specific configurations
if(WIN32)
    # Windows compatibility settings
    add_definitions(-D_WIN32_WINNT=0x0601 -DWIN32_LEAN_AND_MEAN -DNOMINMAX)
    set(PLATFORM_LIBS ws2_32 iphlpapi winmm user32 kernel32)
    
    # Architecture detection and targeting
    if(CMAKE_SIZEOF_VOID_P EQUAL 8)
        message(STATUS "Building for Windows x64")
        set(PLATFORM_ARCH "x64")
    else()
        message(STATUS "Building for Windows x86")
        set(PLATFORM_ARCH "x86")
    endif()
    
    # Static linking for standalone executable
    if(MSVC)
        set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
        set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} /MT /O2 /GL")
        set(CMAKE_EXE_LINKER_FLAGS_RELEASE "${CMAKE_EXE_LINKER_FLAGS_RELEASE} /LTCG /OPT:REF /OPT:ICF")
    endif()
    
elseif(APPLE)
    find_library(CORE_WLAN CoreWLAN)
    find_library(SYSTEM_CONFIG SystemConfiguration)
    find_library(FOUNDATION Foundation)
    set(PLATFORM_LIBS ${CORE_WLAN} ${SYSTEM_CONFIG} ${FOUNDATION})
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -x objective-c++")
elseif(ANDROID)
    find_library(LOG_LIB log)
    set(PLATFORM_LIBS ${LOG_LIB})
else()
    # Linux
    set(PLATFORM_LIBS pthread dl)
endif()

# Core library
add_library(SmartBlueprintCore STATIC
    SmartBlueprintCore.cpp
    NetworkScanner.cpp
    MLEngine.cpp
    DeviceClassifier.cpp
    SignalProcessor.cpp
)

target_link_libraries(SmartBlueprintCore ${PLATFORM_LIBS})

# Desktop application
add_executable(SmartBlueprintDesktop
    main_new.cpp
    DesktopUI.cpp
    NetworkScanner.cpp
    MLEngine.cpp
    DeviceClassifier.cpp
    SignalProcessor.cpp
    SmartBlueprintCore.cpp
)

target_link_libraries(SmartBlueprintDesktop ${PLATFORM_LIBS})

# Set output properties for Windows executable
if(WIN32)
    set_target_properties(SmartBlueprintDesktop PROPERTIES
        OUTPUT_NAME "SmartBlueprint-${PLATFORM_ARCH}"
        LINK_FLAGS "/SUBSYSTEM:CONSOLE"
    )
    
    # Add manifest for Windows compatibility
    if(MSVC)
        set_target_properties(SmartBlueprintDesktop PROPERTIES
            LINK_FLAGS "/MANIFEST:EMBED /MANIFESTINPUT:${CMAKE_CURRENT_SOURCE_DIR}/app.manifest"
        )
    endif()
endif()

# Android library
if(ANDROID)
    add_library(SmartBlueprintAndroid SHARED
        android/JNIWrapper.cpp
    )
    target_link_libraries(SmartBlueprintAndroid SmartBlueprintCore ${PLATFORM_LIBS})
endif()

# iOS framework
if(APPLE AND CMAKE_SYSTEM_NAME STREQUAL "iOS")
    add_library(SmartBlueprintFramework SHARED
        ios/IOSWrapper.mm
    )
    target_link_libraries(SmartBlueprintFramework SmartBlueprintCore ${PLATFORM_LIBS})
    
    set_target_properties(SmartBlueprintFramework PROPERTIES
        FRAMEWORK TRUE
        FRAMEWORK_VERSION A
        MACOSX_FRAMEWORK_IDENTIFIER com.smartblueprint.framework
        VERSION 1.0.0
        SOVERSION 1.0.0
    )
endif()