const fs = require('fs');
const path = require('path');

// Read base64 files
const img1 = fs.readFileSync('img/IMG_0687.txt', 'utf8').trim();
const img2 = fs.readFileSync('img/IMG_0688.txt', 'utf8').trim();

// Read config file
let config = fs.readFileSync('js/modules/config.js', 'utf8');

// Replace image paths with base64 data URIs
config = config.replace(
  'image: { src: "img/IMG_0687.jpg", alt: "Retrato de Nandi Mar con tambor chamánico", tone: "fuego" }',
  `image: { src: "data:image/jpeg;base64,${img1}", alt: "Retrato de Nandi Mar con tambor chamánico", tone: "fuego" }`
);

config = config.replace(
  'image: { src: "img/IMG_0688.jpg", alt: "Tambor y charango sobre una manta tejida", tone: "tierra" }',
  `image: { src: "data:image/jpeg;base64,${img2}", alt: "Tambor y charango sobre una manta tejida", tone: "tierra" }`
);

// Write updated config
fs.writeFileSync('js/modules/config.js', config);
console.log('Images converted to base64 and config updated');
