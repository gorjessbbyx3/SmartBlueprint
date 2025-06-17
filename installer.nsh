; SmartBlueprint Pro Desktop - Custom NSIS Installer Script

!define APPNAME "SmartBlueprint Pro"
!define COMPANYNAME "SmartBlueprint Technologies"
!define DESCRIPTION "Smart Home Device Mapping and Network Optimization Platform"

; Windows Registry keys for uninstaller
!define UNINST_KEY "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"

Section "Desktop Agent Service" SecService
    ; Install Windows Service capability
    DetailPrint "Configuring desktop agent service..."
    
    ; Create service wrapper script
    FileOpen $0 "$INSTDIR\install-service.bat" w
    FileWrite $0 '@echo off$\r$\n'
    FileWrite $0 'echo Installing SmartBlueprint Desktop Agent as Windows Service...$\r$\n'
    FileWrite $0 'sc create "SmartBlueprintAgent" binPath= "$INSTDIR\SmartBlueprint Pro.exe --service" start= auto DisplayName= "SmartBlueprint Pro Desktop Agent"$\r$\n'
    FileWrite $0 'sc description "SmartBlueprintAgent" "SmartBlueprint Pro Desktop Agent - Automatic network monitoring and device discovery"$\r$\n'
    FileWrite $0 'echo Service installed successfully!$\r$\n'
    FileWrite $0 'echo The agent will start automatically with Windows.$\r$\n'
    FileWrite $0 'pause$\r$\n'
    FileClose $0
    
    ; Create service removal script
    FileOpen $0 "$INSTDIR\remove-service.bat" w
    FileWrite $0 '@echo off$\r$\n'
    FileWrite $0 'echo Removing SmartBlueprint Desktop Agent service...$\r$\n'
    FileWrite $0 'sc stop "SmartBlueprintAgent"$\r$\n'
    FileWrite $0 'sc delete "SmartBlueprintAgent"$\r$\n'
    FileWrite $0 'echo Service removed successfully!$\r$\n'
    FileWrite $0 'pause$\r$\n'
    FileClose $0
    
    ; Add to Start Menu
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortcut "$SMPROGRAMS\${APPNAME}\Install as Service.lnk" "$INSTDIR\install-service.bat"
    CreateShortcut "$SMPROGRAMS\${APPNAME}\Remove Service.lnk" "$INSTDIR\remove-service.bat"
    
SectionEnd

Section "Firewall Configuration" SecFirewall
    DetailPrint "Configuring Windows Firewall..."
    
    ; Allow outbound connections for SmartBlueprint
    ExecWait 'netsh advfirewall firewall add rule name="SmartBlueprint Pro" dir=out action=allow program="$INSTDIR\SmartBlueprint Pro.exe"'
    ExecWait 'netsh advfirewall firewall add rule name="SmartBlueprint HTTPS" dir=out action=allow protocol=TCP remoteport=443'
    ExecWait 'netsh advfirewall firewall add rule name="SmartBlueprint WebSocket" dir=out action=allow protocol=TCP remoteport=80'
    
SectionEnd

Section "Registry Settings" SecRegistry
    DetailPrint "Configuring registry settings..."
    
    ; Application registry entries
    WriteRegStr HKLM "Software\${COMPANYNAME}\${APPNAME}" "InstallPath" "$INSTDIR"
    WriteRegStr HKLM "Software\${COMPANYNAME}\${APPNAME}" "Version" "${VERSION}"
    WriteRegStr HKLM "Software\${COMPANYNAME}\${APPNAME}" "ServerURL" "https://smartplueprint.replit.app"
    
    ; Uninstaller registry entries
    WriteRegStr HKLM "${UNINST_KEY}" "DisplayName" "${APPNAME}"
    WriteRegStr HKLM "${UNINST_KEY}" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegStr HKLM "${UNINST_KEY}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "${UNINST_KEY}" "Publisher" "${COMPANYNAME}"
    WriteRegStr HKLM "${UNINST_KEY}" "DisplayVersion" "${VERSION}"
    WriteRegDWORD HKLM "${UNINST_KEY}" "NoModify" 1
    WriteRegDWORD HKLM "${UNINST_KEY}" "NoRepair" 1
    
SectionEnd

; Custom welcome page
Function .onInit
    MessageBox MB_YESNO|MB_ICONQUESTION "SmartBlueprint Pro will install a desktop agent for network monitoring and device discovery.$\n$\nThis application connects to smartplueprint.replit.app for cloud synchronization.$\n$\nContinue with installation?" IDYES proceed
    Quit
    proceed:
FunctionEnd

; Custom finish page
Function .onInstSuccess
    MessageBox MB_YESNO|MB_ICONQUESTION "Installation complete!$\n$\nWould you like to start SmartBlueprint Pro now?" IDNO end
    Exec "$INSTDIR\SmartBlueprint Pro.exe"
    end:
FunctionEnd

; Uninstaller section
Section "Uninstall"
    ; Stop and remove service if installed
    ExecWait 'sc stop "SmartBlueprintAgent"'
    ExecWait 'sc delete "SmartBlueprintAgent"'
    
    ; Remove firewall rules
    ExecWait 'netsh advfirewall firewall delete rule name="SmartBlueprint Pro"'
    ExecWait 'netsh advfirewall firewall delete rule name="SmartBlueprint HTTPS"'
    ExecWait 'netsh advfirewall firewall delete rule name="SmartBlueprint WebSocket"'
    
    ; Remove registry entries
    DeleteRegKey HKLM "Software\${COMPANYNAME}\${APPNAME}"
    DeleteRegKey HKLM "${UNINST_KEY}"
    
    ; Remove Start Menu entries
    RMDir /r "$SMPROGRAMS\${APPNAME}"
    
    ; Remove Desktop shortcut
    Delete "$DESKTOP\${APPNAME}.lnk"
    
    ; Remove installation directory
    RMDir /r "$INSTDIR"
    
SectionEnd