#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const versionFilePath = path.join(__dirname, '..', 'src', 'constants', 'version.ts');

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const fullVersion = packageJson.version;
  
  // Extract the major version number (e.g., "1.0.0-beta.1" -> "1")
  const majorVersion = fullVersion.split('.')[0];
  
  // Extract all version numbers and concatenate them
  // "1.0.0-beta.1" -> ["1", "0", "0-beta", "1"] -> "1" + "0" + "0" + "1" = "1001"
  const versionParts = fullVersion.split('.');
  const concatenatedNumbers = versionParts
    .map(part => {
      // Extract only the numeric part from each segment
      const numericMatch = part.match(/\d+/);
      return numericMatch ? numericMatch[0] : '0';
    })
    .join('');
  
  // Format as "1.1001"
  const buildVersion = `${majorVersion}.${concatenatedNumbers}`;
  
  // Update the version file
  const versionContent = `// This file can be updated during build process to reflect the current version
export const APP_VERSION = "${buildVersion}";
`;
  
  fs.writeFileSync(versionFilePath, versionContent);
  console.log(`✅ Updated version to Build ${buildVersion} (from ${fullVersion})`);
} catch (error) {
  console.error('❌ Error updating version:', error.message);
  process.exit(1);
} 