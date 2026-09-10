/**
 * build-installer.js
 * Builds a single standalone WorkCountdownWidgetSetup.exe installer!
 */
const electronInstaller = require('electron-winstaller');
const path = require('path');
const fs = require('fs');

async function buildInstaller() {
  console.log('📦 Building standalone single WorkCountdownWidgetSetup.exe...');
  try {
    const appDir = path.join(__dirname, '..', 'dist', 'win-unpacked');
    fs.copyFileSync(path.join(appDir, 'LICENSE.electron.txt'), path.join(appDir, 'LICENSE'));
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, '..', 'dist', 'win-unpacked'),
      outputDirectory: path.join(__dirname, '..', 'dist', 'installer'),
      authors: 'Skylim',
      additionalFiles: [{src:'LICENSES.chromium.html',target:'lib/net45/LICENSES.chromium.html'}],
      exe: 'WorkCountdownWidget.exe',
      setupExe: 'WorkCountdownWidgetSetup.exe',
      noMsi: true,
      setupIcon: path.join(__dirname, '..', 'src', 'icon.ico'),
      title: 'Work Countdown Widget'
    });
    console.log('✅ Successfully created WorkCountdownWidgetSetup.exe installer!');
  } catch (e) {
    console.error('❌ Failed to build installer:', e.message);
    process.exitCode = 1;
  }
}

buildInstaller();
