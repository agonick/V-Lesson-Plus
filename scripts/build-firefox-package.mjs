import { cpSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const sourceDir = "dist/firefox-package";
const artifactDir = "web-ext-artifacts";

rmSync(sourceDir, { recursive: true, force: true });
mkdirSync(`${sourceDir}/icons`, { recursive: true });
mkdirSync(`${sourceDir}/dist`, { recursive: true });
mkdirSync(`${sourceDir}/src/popup`, { recursive: true });

cpSync("manifest.json", `${sourceDir}/manifest.json`);
cpSync("icons/icon16.png", `${sourceDir}/icons/icon16.png`);
cpSync("icons/icon32.png", `${sourceDir}/icons/icon32.png`);
cpSync("icons/icon48.png", `${sourceDir}/icons/icon48.png`);
cpSync("icons/icon128.png", `${sourceDir}/icons/icon128.png`);
cpSync("dist/content.js", `${sourceDir}/dist/content.js`);
cpSync("dist/logic.js", `${sourceDir}/dist/logic.js`);
cpSync("dist/popup-bundled.js", `${sourceDir}/dist/popup-bundled.js`);
cpSync("src/popup/popup.css", `${sourceDir}/src/popup/popup.css`);
cpSync("src/popup/popup.html", `${sourceDir}/src/popup/popup.html`);

execFileSync(
  "web-ext",
  [
    "build",
    "--overwrite-dest",
    "--source-dir",
    sourceDir,
    "--artifacts-dir",
    artifactDir,
  ],
  { stdio: "inherit" },
);
