# SmartBlueprint Pro - Professional CMake Build System
# Supports Visual Studio, MinGW, and cross-platform compilation

cmake_minimum_required(VERSION 3.16)
project(SmartBlueprintPro VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Build configuration options
option(BUILD_GUI "Build GUI version with Dear ImGui" ON)
option(BUILD_CONSOLE "Build console version" ON)
option(ENABLE_IPV6 "Enable IPv6 support" ON)
option(STATIC_LINKING "Use static linking for dependencies" ON)

# Platform-specific settings
if(WIN32)
    add_definitions(-DWIN32_LEAN_AND_MEAN -DNOMINMAX)
    set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()

# Set output directories
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/bin)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_BINARY_DIR}/lib)

# Find required packages
if(WIN32)
    # Windows-specific libraries
    find_library(WS2_32_LIB ws2_32)
    find_library(IPHLPAPI_LIB iphlpapi)
    find_library(ICMP_LIB icmp)
    find_library(WLANAPI_LIB wlanapi)
    find_library(USER32_LIB user32)
    find_library(KERNEL32_LIB kernel32)
    find_library(GDI32_LIB gdi32)
    find_library(OPENGL32_LIB opengl32)
    
    set(PLATFORM_LIBS 
        ${WS2_32_LIB} 
        ${IPHLPAPI_LIB} 
        ${ICMP_LIB} 
        ${WLANAPI_LIB}
        ${USER32_LIB}
        ${KERNEL32_LIB}
        ${GDI32_LIB}
        ${OPENGL32_LIB}
    )
endif()

# Dear ImGui setup for GUI version
if(BUILD_GUI)
    set(IMGUI_DIR ${CMAKE_SOURCE_DIR}/imgui)
    if(NOT EXISTS ${IMGUI_DIR})
        message(STATUS "Dear ImGui not found. Downloading...")
        file(DOWNLOAD 
            "https://github.com/ocornut/imgui/archive/v1.90.1.zip"
            "${CMAKE_BINARY_DIR}/imgui.zip"
        )
        execute_process(
            COMMAND ${CMAKE_COMMAND} -E tar xzf imgui.zip
            WORKING_DIRECTORY ${CMAKE_BINARY_DIR}
        )
        file(RENAME "${CMAKE_BINARY_DIR}/imgui-1.90.1" ${IMGUI_DIR})
    endif()
    
    set(IMGUI_SOURCES
        ${IMGUI_DIR}/imgui.cpp
        ${IMGUI_DIR}/imgui_demo.cpp
        ${IMGUI_DIR}/imgui_draw.cpp
        ${IMGUI_DIR}/imgui_tables.cpp
        ${IMGUI_DIR}/imgui_widgets.cpp
        ${IMGUI_DIR}/backends/imgui_impl_win32.cpp
        ${IMGUI_DIR}/backends/imgui_impl_opengl3.cpp
    )
endif()

# Source files
set(COMMON_SOURCES
    SmartBlueprint-Core.cpp
)

set(CONSOLE_SOURCES
    SmartBlueprint-Professional.cpp
)

set(GUI_SOURCES
    SmartBlueprint-GUI.cpp
    ${IMGUI_SOURCES}
)

# Console application
if(BUILD_CONSOLE)
    add_executable(SmartBlueprint-Console ${CONSOLE_SOURCES})
    target_link_libraries(SmartBlueprint-Console ${PLATFORM_LIBS})
    
    if(ENABLE_IPV6)
        target_compile_definitions(SmartBlueprint-Console PRIVATE ENABLE_IPV6=1)
    endif()
    
    if(STATIC_LINKING AND WIN32)
        target_compile_options(SmartBlueprint-Console PRIVATE /MT)
    endif()
    
    # Set executable properties
    set_target_properties(SmartBlueprint-Console PROPERTIES
        OUTPUT_NAME "SmartBlueprint-Pro-Console"
        DEBUG_POSTFIX "_debug"
    )
endif()

# GUI application
if(BUILD_GUI)
    add_executable(SmartBlueprint-GUI WIN32 ${GUI_SOURCES})
    target_link_libraries(SmartBlueprint-GUI ${PLATFORM_LIBS})
    
    target_include_directories(SmartBlueprint-GUI PRIVATE 
        ${IMGUI_DIR}
        ${IMGUI_DIR}/backends
    )
    
    if(ENABLE_IPV6)
        target_compile_definitions(SmartBlueprint-GUI PRIVATE ENABLE_IPV6=1)
    endif()
    
    if(STATIC_LINKING AND WIN32)
        target_compile_options(SmartBlueprint-GUI PRIVATE /MT)
    endif()
    
    # Set executable properties
    set_target_properties(SmartBlueprint-GUI PROPERTIES
        OUTPUT_NAME "SmartBlueprint-Pro-GUI"
        DEBUG_POSTFIX "_debug"
        WIN32_EXECUTABLE TRUE
    )
endif()

# Install targets
install(TARGETS 
    $<$<BOOL:${BUILD_CONSOLE}>:SmartBlueprint-Console>
    $<$<BOOL:${BUILD_GUI}>:SmartBlueprint-GUI>
    RUNTIME DESTINATION bin
)

# Install configuration files
install(FILES 
    settings.ini
    README.md
    DESTINATION .
)

# CPack configuration for installer creation
set(CPACK_PACKAGE_NAME "SmartBlueprint Pro")
set(CPACK_PACKAGE_VERSION_MAJOR ${PROJECT_VERSION_MAJOR})
set(CPACK_PACKAGE_VERSION_MINOR ${PROJECT_VERSION_MINOR})
set(CPACK_PACKAGE_VERSION_PATCH ${PROJECT_VERSION_PATCH})
set(CPACK_PACKAGE_DESCRIPTION_SUMMARY "Professional Network Monitoring and Device Analysis")
set(CPACK_PACKAGE_VENDOR "SmartBlueprint Technologies")

if(WIN32)
    set(CPACK_GENERATOR "NSIS")
    set(CPACK_NSIS_DISPLAY_NAME "SmartBlueprint Pro")
    set(CPACK_NSIS_PACKAGE_NAME "SmartBlueprint Pro")
    set(CPACK_NSIS_CONTACT "support@smartblueprint.com")
    set(CPACK_NSIS_MODIFY_PATH ON)
endif()

include(CPack)

# Custom targets for easy building
add_custom_target(build-all
    DEPENDS 
        $<$<BOOL:${BUILD_CONSOLE}>:SmartBlueprint-Console>
        $<$<BOOL:${BUILD_GUI}>:SmartBlueprint-GUI>
    COMMENT "Building all SmartBlueprint Pro applications"
)

# Configure build information
configure_file(
    "${CMAKE_SOURCE_DIR}/BuildInfo.h.in"
    "${CMAKE_BINARY_DIR}/BuildInfo.h"
)

# Create build information header
file(WRITE "${CMAKE_SOURCE_DIR}/BuildInfo.h.in"
"#pragma once
#define BUILD_VERSION \"${PROJECT_VERSION}\"
#define BUILD_TIMESTAMP \"@BUILD_TIMESTAMP@\"
#define BUILD_TYPE \"@CMAKE_BUILD_TYPE@\"
#define BUILD_COMPILER \"@CMAKE_CXX_COMPILER_ID@\"
#define BUILD_IPV6_SUPPORT @ENABLE_IPV6@
#define BUILD_GUI_SUPPORT @BUILD_GUI@
")

string(TIMESTAMP BUILD_TIMESTAMP "%Y-%m-%d %H:%M:%S UTC" UTC)
configure_file(
    "${CMAKE_SOURCE_DIR}/BuildInfo.h.in"
    "${CMAKE_BINARY_DIR}/BuildInfo.h"
    @ONLY
)

message(STATUS "SmartBlueprint Pro Build Configuration:")
message(STATUS "  Console Application: ${BUILD_CONSOLE}")
message(STATUS "  GUI Application: ${BUILD_GUI}")
message(STATUS "  IPv6 Support: ${ENABLE_IPV6}")
message(STATUS "  Static Linking: ${STATIC_LINKING}")
message(STATUS "  Build Type: ${CMAKE_BUILD_TYPE}")