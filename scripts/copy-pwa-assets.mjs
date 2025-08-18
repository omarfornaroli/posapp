
// scripts/copy-pwa-assets.mjs
import fs from 'fs/promises';
import path from 'path';

const sourceDir = path.join(process.cwd(), 'src', 'assets', 'icons');
const destDir = path.join(process.cwd(), 'public', 'icons');

async function copyFiles() {
  try {
    // Ensure destination directory exists
    await fs.mkdir(destDir, { recursive: true });

    // Read all files from the source directory
    const files = await fs.readdir(sourceDir);

    // Copy each file to the destination
    for (const file of files) {
      const srcFile = path.join(sourceDir, file);
      const destFile = path.join(destDir, file);
      await fs.copyFile(srcFile, destFile);
      console.log(`Copied ${srcFile} to ${destFile}`);
    }

    console.log('PWA assets copied successfully!');
  } catch (error) {
    console.error('Error copying PWA assets:', error);
    process.exit(1); // Exit with an error code
  }
}

copyFiles();
