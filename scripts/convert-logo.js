import sharp from 'sharp';
import path from 'path';

async function convertLogos() {
  const sourceImage = path.resolve('public/images/app_logo.jpg');

  await sharp(sourceImage).resize(192, 192).png().toFile(path.resolve('public/pwa-192x192.png'));
  await sharp(sourceImage).resize(512, 512).png().toFile(path.resolve('public/pwa-512x512.png'));
  await sharp(sourceImage).resize(512, 512).png().toFile(path.resolve('public/pwa-maskable-512x512.png'));
  await sharp(sourceImage).resize(180, 180).png().toFile(path.resolve('public/apple-touch-icon.png'));
  await sharp(sourceImage).resize(32, 32).png().toFile(path.resolve('public/favicon.ico'));

  console.log('All PWA icon assets regenerated directly from app_logo.jpg!');
}

convertLogos().catch(err => {
  console.error('Error converting logos:', err);
  process.exit(1);
});
