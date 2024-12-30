// server.js
const express = require("express");
const port = 3000;
const app = express();
const path = require("path");
const dotenv = require("dotenv").config();
const fs = require("fs");

app.use(express.json()); // For parsing application/json
// Home Route - Dynamic App List
app.get("/", (req, res) => {
  const srcPath = path.join(__dirname, "src", "public");
  const markdownPath = path.join(srcPath, "markdown");
  const homePath = path.join(__dirname, "src", "views", "home.html");

  fs.readdir(srcPath, { withFileTypes: true }, (err, entries) => {
    if (err) {
      console.error("Error reading public directory:", err);
      res.status(500).send("Internal Server Error");
      return;
    }

    // Gather app folders (exclude markdown folder)
    const appsHtml = entries
      .filter((entry) => entry.isDirectory() && entry.name !== "markdown")
      .map(
        (folder) =>
          `<li><a href="/${folder.name}">${folder.name}</a></li>`
      )
      .join("");

    // Gather Markdown pages
    fs.readdir(markdownPath, { withFileTypes: true }, (err, files) => {
      if (err) {
        console.error("Error reading markdown directory:", err);
        res.status(500).send("Internal Server Error");
        return;
      }

      const markdownLinks = files
        .filter((file) => file.isFile() && file.name.endsWith(".md"))
        .map((file) => {
          const pageName = file.name.replace(".md", "");
          return `<li><a href="/markdown/${pageName}">${pageName}</a></li>`;
        })
        .join("");

      // Read the home template and inject the content
      fs.readFile(homePath, "utf8", (err, html) => {
        if (err) {
          console.error("Error reading home.html:", err);
          res.status(500).send("Error loading home page");
          return;
        }

        // Replace placeholders with separate columns
        const updatedHtml = html
          .replace("${appsHtml}", appsHtml)
          .replace("${markdownHtml}", markdownLinks);

        res.send(updatedHtml);
      });
    });
  });
});

app.get("/:appName", function (request, response) {
  const appName = request.params.appName;

  // Serve static assets for the app
  app.use("/components", express.static("./src/components"));
  app.use("/public", express.static("./src/public"));
  app.use("/modules", express.static("./src/modules"));
  app.use("/resources", express.static("./src/resources"));
  app.use("/views", express.static("./src/views"));

  const indexPath = path.join(__dirname, "src", "views", "index.html");

  fs.readFile(indexPath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading index.html:", err);
      response.status(500).send("Internal Server Error");
      return;
    }

    // Replace placeholders in index.html
    const updatedHtml = data
      .replace("${appName}", appName) // Replace appName placeholder
      .replace(
        "<!-- APP_NAME_PLACEHOLDER -->",
        `<script type="module" src="/public/${appName}/App.js"></script>`
      )
      .replace(
        "<!-- NOTES_SRC_PLACEHOLDER -->",
        `<zero-md src="/public/${appName}/notes.md" no-shadow></zero-md>`
      );

    response.send(updatedHtml);
  });
});

// Route to serve plain Markdown pages
app.get("/markdown/:pageName", (req, res) => {
  const pageName = req.params.pageName;
  const markdownPath = path.join(__dirname, "src", "public", "markdown", `${pageName}.md`);
  const markdownTemplatePath = path.join(__dirname, "src", "views", "markdown_template.html");

  // Check if Markdown file exists
  if (!fs.existsSync(markdownPath)) {
    return res.status(404).send("Page not found");
  }

  fs.readFile(markdownTemplatePath, "utf8", (err, template) => {
    if (err) {
      console.error("Error reading markdown_template.html:", err);
      res.status(500).send("Internal Server Error");
      return;
    }

    // Inject Markdown file into the template
    const updatedHtml = template.replace(
      "<!-- MARKDOWN_CONTENT_PLACEHOLDER -->",
      `<zero-md src="/public/markdown/${pageName}.md" no-shadow></zero-md>`
    );
    res.send(updatedHtml);
  });
});

var server = app.listen(process.env.PORT || port, listen);

// This call back just tells us that the server has started
function listen() {
  var host = server.address().address;
  var port = server.address().port;
  console.log("App listening at http://" + host + ":" + port);
  console.log("App listening at http://localhost:" + port);
}
