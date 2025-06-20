; SmartBlueprint Pro - Custom NSIS Installer Script
; Advanced Windows installer with system integration and service management

!include "MUI2.nsh"
!include "FileFunc.nsh"
!include "LogicLib.nsh"

; Installer configuration
!define PRODUCT_NAME "SmartBlueprint Pro"
!define PRODUCT_VERSION "1.0.0"
!define PRODUCT_PUBLISHER "SmartBlueprint Technologies"
!define PRODUCT_WEB_SITE "https://smartblueprint.pro"
!define PRODUCT_DIR_REGKEY "Software\Microsoft\Windows\CurrentVersion\App Paths\SmartBlueprint Pro.exe"
!define PRODUCT_UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${PRODUCT_NAME}"

; MUI Settings
!define MUI_ABORTWARNING
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\installer-sidebar.bmp"
!define MUI_UNWELCOMEFINISHPAGE_BITMAP "assets\installer-sidebar.bmp"

; Welcome page
!insertmacro MUI_PAGE_WELCOME

; License page
!insertmacro MUI_PAGE_LICENSE "LICENSE"

; Components page
!insertmacro MUI_PAGE_COMPONENTS

; Directory page
!insertmacro MUI_PAGE_DIRECTORY

; Instfiles page
!insertmacro MUI_PAGE_INSTFILES

; Finish page
!define MUI_FINISHPAGE_RUN "$INSTDIR\SmartBlueprint Pro.exe"
!define MUI_FINISHPAGE_SHOWREADME "$INSTDIR\README.txt"
!insertmacro MUI_PAGE_FINISH

; Uninstaller pages
!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Language files
!insertmacro MUI_LANGUAGE "English"

; Reserve files for faster extraction
!insertmacro MUI_RESERVEFILE_LANGDLL

; Version information
VIProductVersion "${PRODUCT_VERSION}.0"
VIAddVersionKey "ProductName" "${PRODUCT_NAME}"
VIAddVersionKey "ProductVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "CompanyName" "${PRODUCT_PUBLISHER}"
VIAddVersionKey "FileVersion" "${PRODUCT_VERSION}"
VIAddVersionKey "FileDescription" "${PRODUCT_NAME} Installer"
VIAddVersionKey "LegalCopyright" "© ${PRODUCT_PUBLISHER}"

; Installer sections
Section "SmartBlueprint Pro (Required)" SEC01
    SectionIn RO
    
    ; Set output path to the installation directory
    SetOutPath "$INSTDIR"
    
    ; Install main application files
    File /r "*.*"
    
    ; Create shortcuts
    CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
    CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\SmartBlueprint Pro.exe"
    CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
    CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\SmartBlueprint Pro.exe"
    
    ; Register application
    WriteRegStr HKLM "${PRODUCT_DIR_REGKEY}" "" "$INSTDIR\SmartBlueprint Pro.exe"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayName" "$(^Name)"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayIcon" "$INSTDIR\SmartBlueprint Pro.exe"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "DisplayVersion" "${PRODUCT_VERSION}"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "Publisher" "${PRODUCT_PUBLISHER}"
    WriteRegStr HKLM "${PRODUCT_UNINST_KEY}" "URLInfoAbout" "${PRODUCT_WEB_SITE}"
    
    ; Calculate and write installation size
    ${GetSize} "$INSTDIR" "/S=0K" $0 $1 $2
    IntFmt $0 "0x%08X" $0
    WriteRegDWORD HKLM "${PRODUCT_UNINST_KEY}" "EstimatedSize" "$0"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Desktop Agent Service" SEC02
    ; Install Windows service for background monitoring
    DetailPrint "Installing Desktop Agent Service..."
    
    ; Copy service executable
    SetOutPath "$INSTDIR\service"
    File "desktop-agent-service.exe"
    
    ; Install service
    ExecWait '"$INSTDIR\service\desktop-agent-service.exe" --install' $0
    ${If} $0 == 0
        DetailPrint "Desktop Agent Service installed successfully"
    ${Else}
        DetailPrint "Warning: Desktop Agent Service installation failed"
    ${EndIf}
SectionEnd

Section "Windows Firewall Rules" SEC03
    ; Configure Windows Firewall for network scanning
    DetailPrint "Configuring Windows Firewall..."
    
    ; Add firewall rule for incoming connections
    ExecWait 'netsh advfirewall firewall add rule name="${PRODUCT_NAME} Inbound" dir=in action=allow program="$INSTDIR\SmartBlueprint Pro.exe"' $0
    
    ; Add firewall rule for outgoing connections  
    ExecWait 'netsh advfirewall firewall add rule name="${PRODUCT_NAME} Outbound" dir=out action=allow program="$INSTDIR\SmartBlueprint Pro.exe"' $0
    
    ${If} $0 == 0
        DetailPrint "Firewall rules configured successfully"
    ${Else}
        DetailPrint "Warning: Firewall configuration failed (requires administrator privileges)"
    ${EndIf}
SectionEnd

Section "Visual C++ Redistributable" SEC04
    ; Install required Visual C++ runtime
    DetailPrint "Installing Visual C++ Redistributable..."
    
    SetOutPath "$TEMP"
    File "vcredist_x64.exe"
    
    ExecWait '"$TEMP\vcredist_x64.exe" /quiet /norestart' $0
    Delete "$TEMP\vcredist_x64.exe"
    
    ${If} $0 == 0
        DetailPrint "Visual C++ Redistributable installed successfully"
    ${Else}
        DetailPrint "Visual C++ Redistributable installation completed with code $0"
    ${EndIf}
SectionEnd

; Section descriptions
!insertmacro MUI_FUNCTION_DESCRIPTION_BEGIN
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC01} "Core SmartBlueprint Pro application and required files"
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC02} "Background service for continuous network monitoring"
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC03} "Configure Windows Firewall for network discovery features"
    !insertmacro MUI_DESCRIPTION_TEXT ${SEC04} "Microsoft Visual C++ Runtime (required for ML components)"
!insertmacro MUI_FUNCTION_DESCRIPTION_END

; Installer functions
Function .onInit
    ; Check Windows version
    ${If} ${AtLeastWin10}
        ; Windows 10 or later - proceed
    ${ElseIf} ${AtLeastWin7}
        MessageBox MB_YESNO|MB_ICONQUESTION "SmartBlueprint Pro is optimized for Windows 10 or later. Continue installation on Windows 7/8?" IDYES proceed
        Abort
        proceed:
    ${Else}
        MessageBox MB_OK|MB_ICONSTOP "SmartBlueprint Pro requires Windows 7 or later."
        Abort
    ${EndIf}
    
    ; Check if application is already running
    System::Call 'kernel32::OpenMutex(i 0x100000, b 0, t "SmartBlueprintProMutex") i .R0'
    IntCmp $R0 0 notRunning
        System::Call 'kernel32::CloseHandle(i $R0)'
        MessageBox MB_OK|MB_ICONEXCLAMATION "SmartBlueprint Pro is currently running. Please close it before installation."
        Abort
    notRunning:
    
    ; Check for admin privileges for service installation
    UserInfo::GetAccountType
    Pop $0
    ${If} $0 != "Admin"
        MessageBox MB_YESNO|MB_ICONQUESTION "Administrator privileges are recommended for full installation. Continue with limited installation?" IDYES continueInstall
        Abort
        continueInstall:
        ; Disable service section if not admin
        SectionSetFlags ${SEC02} ${SF_RO}
        SectionSetFlags ${SEC03} ${SF_RO}
    ${EndIf}
FunctionEnd

; Uninstaller section
Section Uninstall
    ; Stop and remove service if installed
    ExecWait '"$INSTDIR\service\desktop-agent-service.exe" --stop' $0
    ExecWait '"$INSTDIR\service\desktop-agent-service.exe" --uninstall' $0
    
    ; Remove firewall rules
    ExecWait 'netsh advfirewall firewall delete rule name="${PRODUCT_NAME} Inbound"' $0
    ExecWait 'netsh advfirewall firewall delete rule name="${PRODUCT_NAME} Outbound"' $0
    
    ; Remove shortcuts
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
    Delete "$SMPROGRAMS\${PRODUCT_NAME}\Uninstall.lnk"
    Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
    RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
    
    ; Remove installation directory
    RMDir /r "$INSTDIR"
    
    ; Remove registry entries
    DeleteRegKey HKLM "${PRODUCT_UNINST_KEY}"
    DeleteRegKey HKLM "${PRODUCT_DIR_REGKEY}"
    
    SetAutoClose true
SectionEnd

Function un.onInit
    MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove $(^Name) and all of its components?" IDYES +2
    Abort
FunctionEnd

Function un.onUninstSuccess
    HideWindow
    MessageBox MB_ICONINFORMATION|MB_OK "$(^Name) was successfully removed from your computer."
FunctionEnd