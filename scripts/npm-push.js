const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

try {
  // Get the current working directory
  const currentDir = process.cwd();
  console.log(`Current directory: ${currentDir}`);

  // Check if the current directory is a Git repository
  if (!fs.existsSync(path.join(currentDir, ".git"))) {
    console.error("Error: The current directory is not a Git repository.");
    console.error("Please run this command inside a valid Git repository.");
    process.exit(1);
  }

  console.log("Checking if a remote repository is set up...");
  const remotes = execSync("git remote -v").toString();

  if (!remotes.includes("origin")) {
    console.error("Error: No remote repository found. Set one up using:");
    console.error("  npm run git-setup <git-repo-uri>");
    process.exit(1);
  }

  console.log("Remote repository detected. Proceeding with the push.");

  console.log("Running `git add .`");
  execSync("git add .", { stdio: "inherit" });

  console.log("Running `git status`");
  execSync("git status", { stdio: "inherit" });

  rl.question("Proceed with commit and push? (y/n): ", (answer) => {
    if (answer.toLowerCase() === "y") {
      const date = new Date().toISOString();
      const commitMessage = `Update on ${date}`;

      console.log(`Running \`git commit -m "${commitMessage}"\``);
      execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });

      console.log("Running `git push origin master`");
      execSync("git push origin master", { stdio: "inherit" });
    } else {
      console.log("Aborted.");
    }
    rl.close();
  });
} catch (error) {
  console.error("An error occurred:", error.message);
  rl.close();
  process.exit(1);
}
