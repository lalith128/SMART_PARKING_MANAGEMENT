const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const generateFavicon = async () => {
  // Create an SVG with a car icon in a circle
  const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="256" fill="#0D9488"/>
      <path d="M384 288v48c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-16H192v16c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-48c-17.7 0-32-14.3-32-32v-96c0-26.5 21.5-48 48-48h224c26.5 0 48 21.5 48 48v96c0 17.7-14.3 32-32 32zm-64-88c0-13.3-10.7-24-24-24s-24 10.7-24 24s10.7 24 24 24s24-10.7 24-24zm-192 0c0-13.3-10.7-24-24-24s-24 10.7-24 24s10.7 24 24 24s24-10.7 24-24zm48-24c-13.3 0-24 10.7-24 24s10.7 24 24 24s24-10.7 24-24s-10.7-24-24-24z" fill="white"/>
    </svg>
  `;

  // Ensure the public directory exists
  const publicDir = path.join(__dirname, '..', 'public');
  await fs.mkdir(publicDir, { recursive: true });

  // Write the SVG file
  await fs.writeFile(path.join(publicDir, 'favicon.svg'), svg);

  // Generate different sizes
  const sizes = {
    'favicon-16x16.png': 16,
    'favicon-32x32.png': 32,
    'favicon.ico': 32,
    'apple-touch-icon.png': 180,
    'android-chrome-192x192.png': 192,
    'android-chrome-512x512.png': 512
  };

  for (const [filename, size] of Object.entries(sizes)) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .toFile(path.join(publicDir, filename));
  }

  // Generate Safari pinned tab icon (black and white)
  const safariSvg = `
    <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M384 288v48c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-16H192v16c0 8.8-7.2 16-16 16h-32c-8.8 0-16-7.2-16-16v-48c-17.7 0-32-14.3-32-32v-96c0-26.5 21.5-48 48-48h224c26.5 0 48 21.5 48 48v96c0 17.7-14.3 32-32 32zm-64-88c0-13.3-10.7-24-24-24s-24 10.7-24 24s10.7 24 24 24s24-10.7 24-24zm-192 0c0-13.3-10.7-24-24-24s-24 10.7-24 24s10.7 24 24 24s24-10.7 24-24zm48-24c-13.3 0-24 10.7-24 24s10.7 24 24 24s24-10.7 24-24s-10.7-24-24-24z" fill="black"/>
    </svg>
  `;

  await fs.writeFile(path.join(publicDir, 'safari-pinned-tab.svg'), safariSvg);

  console.log('Favicon files generated successfully!');
};

generateFavicon().catch(console.error);
