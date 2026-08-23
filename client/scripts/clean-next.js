const fs = require('fs');
const path = require('path');

const nextDirectory = path.resolve(__dirname, '..', '.next');

try {
  fs.rmSync(nextDirectory, { recursive: true, force: true });
} catch (error) {
  console.error(`Unable to clean ${nextDirectory}:`, error.message);
  process.exitCode = 1;
}
