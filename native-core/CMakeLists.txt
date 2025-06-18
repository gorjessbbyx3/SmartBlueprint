cmake_minimum_required(VERSION 3.16)
project(SmartBlueprintPro)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Platform-specific configurations
if(WIN32)
    add_definitions(-D_WIN32_WINNT=0x0601)
    set(PLATFORM_LIBS ws2_32 iphlpapi)
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
    set(PLATFORM_LIBS pthread)
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
    main.cpp
    DesktopUI.cpp
)

target_link_libraries(SmartBlueprintDesktop SmartBlueprintCore)

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