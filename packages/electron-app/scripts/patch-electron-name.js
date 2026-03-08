const fs = require('fs');
const path = require('path');

// Patch the Electron binary's Info.plist to show "TINT Viewer" in the macOS dock
if (process.platform !== 'darwin') process.exit(0);

const plistPath = path.join(
  path.dirname(require.resolve('electron/package.json')),
  'dist', 'Electron.app', 'Contents', 'Info.plist'
);

if (!fs.existsSync(plistPath)) {
  console.warn('Could not find Electron Info.plist to patch app name');
  process.exit(0);
}

let content = fs.readFileSync(plistPath, 'utf8');
const name = 'TINT Viewer';

content = content.replace(
  /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*/,
  `$1${name}`
);
content = content.replace(
  /(<key>CFBundleName<\/key>\s*<string>)[^<]*/,
  `$1${name}`
);

fs.writeFileSync(plistPath, content);
console.log('Patched Electron app name to "TINT Viewer"');
