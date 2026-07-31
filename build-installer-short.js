/**
 * build-installer-short.js
 * Uses short path C:\wcw to avoid Windows 260-char path limit.
 */
const electronInstaller = require('electron-winstaller');
const path = require('path');
const fs = require('fs');

async function buildInstaller() {
  console.log('📦 Building standalone single WorkCountdownWidgetSetup.exe...');
  const outDir = 'C:\\wcw-out';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  try {
    await electronInstaller.createWindowsInstaller({
      appDirectory: 'C:\\wcw',
      outputDirectory: outDir,
      authors: 'Skylim',
      exe: 'WorkCountdownWidget.exe',
      setupExe: 'WorkCountdownWidgetSetup.exe',
      noMsi: true,
      title: 'Work Countdown Widget'
    });
    // Copy result to dist/installer
    const destDir = path.join(__dirname, 'dist', 'installer');
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(
      path.join(outDir, 'WorkCountdownWidgetSetup.exe'),
      path.join(destDir, 'WorkCountdownWidgetSetup.exe')
    );
    console.log('✅ Successfully created WorkCountdownWidgetSetup.exe installer!');
  } catch (e) {
    console.error('❌ Failed to build installer:', e.message);
  }
}

buildInstaller();
