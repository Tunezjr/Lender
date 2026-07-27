const { execFileSync } = require("child_process");
const { readFileSync, statSync } = require("fs");

const trackedFiles = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const binaryFiles = trackedFiles.filter((filePath) => {
  if (!statSync(filePath).isFile()) {
    return false;
  }

  return readFileSync(filePath).subarray(0, 8192).includes(0);
});

if (binaryFiles.length > 0) {
  console.error(`Binary files are not allowed in this repository:\n${binaryFiles.map((filePath) => `- ${filePath}`).join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${trackedFiles.length} tracked files; no binary files found.`);
}
