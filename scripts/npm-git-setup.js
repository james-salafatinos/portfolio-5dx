const { execSync } = require("child_process");

const repoUri = process.argv[2];
if (!repoUri) {
  console.error("Please provide a repository URI.");
  process.exit(1);
}

console.log(`Adding remote origin: ${repoUri}`);
execSync(`git remote add origin ${repoUri}`, { stdio: "inherit" });
console.log("Remote origin added successfully.");
