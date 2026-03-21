const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '..', 'assets', 'images');

const conversions = [
  { input: 'icon.svg', output: 'icon.png', size: 1024 },
  { input: 'android-icon-foreground.svg', output: 'android-icon-foreground.png', size: 1024 },
  { input: 'android-icon-background.svg', output: 'android-icon-background.png', size: 1024 },
  { input: 'android-icon-monochrome.svg', output: 'android-icon-monochrome.png', size: 1024 },
  { input: 'splash-icon.svg', output: 'splash-icon.png', size: 200 },
  { input: 'favicon.svg', output: 'favicon.png', size: 48 },
];

async function convert() {
  for (const { input, output, size } of conversions) {
    const inputPath = path.join(assetsDir, input);
    const outputPath = path.join(assetsDir, output);

    await sharp(inputPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`Converted ${input} -> ${output} (${size}x${size})`);
  }
  console.log('Done!');
}

convert().catch(console.error);
