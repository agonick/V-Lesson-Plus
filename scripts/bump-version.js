#!/usr/bin/env node
// Bumps the patch segment of the semver version in manifest.json.
// Writes the updated manifest in-place and prints the new version to stdout.

'use strict';

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.resolve(__dirname, '..', 'manifest.json');
const SEMVER_RE = /^\d+\.\d+\.\d+$/;

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const current = manifest.version;

if (!SEMVER_RE.test(current)) {
  process.stderr.write(`Invalid semver in manifest.json: "${current}"\n`);
  process.exit(1);
}

const [major, minor, patch] = current.split('.').map(Number);
manifest.version = `${major}.${minor}.${patch + 1}`;

fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
process.stdout.write(manifest.version + '\n');
