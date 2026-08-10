/**
 * build-installer.js
 * Builds a single standalone WorkCountdownWidgetSetup.exe installer!
 */
const electronInstaller = require('electron-winstaller');
const path = require('path');

async function buildInstaller() {
  console.log('📦 Building standalone single WorkCountdownWidgetSetup.exe...');
  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: path.join(__dirname, 'dist_build', 'WorkCountdownWidget-win32-x64'),
      outputDirectory: path.join(__dirname, 'dist', 'installer'),
      authors: 'Skylim',
      exe: 'WorkCountdownWidget.exe',
      setupExe: 'WorkCountdownWidgetSetup.exe',
      noMsi: true,
      title: 'Work Countdown Widget'
    });
    console.log('✅ Successfully created WorkCountdownWidgetSetup.exe installer!');
  } catch (e) {
    console.error('❌ Failed to build installer:', e.message);
  }
}

buildInstaller();
