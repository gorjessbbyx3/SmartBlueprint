module.exports = {
  appId: "com.smartblueprint.desktop",
  productName: "SmartBlueprint",
  directories: {
    output: "release"
  },
  files: [
    "**/*"
  ],
  win: {
    target: "nsis",
    icon: "icon.ico"
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: true
  }
};