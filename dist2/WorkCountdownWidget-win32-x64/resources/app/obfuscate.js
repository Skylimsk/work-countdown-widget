/**
 * obfuscate.js — Run before packaging to protect source code.
 * Usage: node obfuscate.js
 * Obfuscates all app JS files into ./obfuscated/ folder, which is then packaged.
 */
const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

const FILES_TO_OBFUSCATE = [
  'main.js',
  'renderer.js',
  'store.js',
  'quotaService.js',
  'telegramBotService.js',
  'spotifyService.js',
  'spotifyAuth.js',
];

const OBFUSCATE_OPTIONS = {
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  stringArray: true,
  stringArrayThreshold: 0.75,
  unicodeEscapeSequence: false,
};

const srcDir = __dirname;

console.log('🔐 Obfuscating source files...');

FILES_TO_OBFUSCATE.forEach(file => {
  const srcPath = path.join(srcDir, file);
  if (!fs.existsSync(srcPath)) {
    console.warn(`  ⚠️  Skipped (not found): ${file}`);
    return;
  }
  const src = fs.readFileSync(srcPath, 'utf-8');
  const result = JavaScriptObfuscator.obfuscate(src, OBFUSCATE_OPTIONS);
  fs.writeFileSync(srcPath + '.bak', src, 'utf-8'); // keep backup
  fs.writeFileSync(srcPath, result.getObfuscatedCode(), 'utf-8');
  console.log(`  ✅ Obfuscated: ${file}`);
});

console.log('\n✅ All files obfuscated. Run packager now.');
console.log('💡 To restore originals: rename .js.bak files back to .js');
