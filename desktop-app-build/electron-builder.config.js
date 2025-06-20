module.exports = {
  appId: "com.smartblueprint.desktop",
  productName: "SmartBlueprint Pro",
  directories: {
    output: "release"
  },
  files: [
    "**/*"
  ],
  win: {
    target: "nsis",
    icon: "../generated-icon.png"
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  }
};