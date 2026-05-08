const fs = require('fs');
const path = require('path');

// Copy frontend/dist → desktop/renderer so electron-builder can include it
const src = path.join(__dirname, '..', '..', 'frontend', 'dist');
const dest = path.join(__dirname, '..', 'renderer');

function copyRecursive(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    console.error('ERROR: frontend/dist does not exist. Run "vite build" first.');
    process.exit(1);
  }

  // Clean destination
  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(src, dest);
console.log('✓ Copied frontend/dist → desktop/renderer');
