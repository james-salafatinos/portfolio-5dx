// server.js
const express = require("express");
const port = 8080;
const app = express();
const path = require("path");
const dotenv = require("dotenv").config();
const fs = require("fs");

// Import the Submission model
const Submission = require("./models/datasetObject.model.js");
// Poopva uses a plain JSON file for persistence (no MongoDB).
const { readDb, writeDb } = require("./src/poopvaDb.js");
const mongoose = require("mongoose");
const dbURI = process.env.MONGO_URI;

// Function to connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to db");
  } catch (err) {
    console.error("Error on connection with MongoDB:", err.message);
    console.error("Proceeding without database connection...");
  }
}

// Call the database connection function
connectToDatabase();

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
      .map((folder) => `<li><a href="/${folder.name}">${folder.name}</a></li>`)
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

// ===================== Poopva API =====================
// All routes are defined BEFORE the "/:appName" catch-all so Express
// matches them first. Poopva is "Strava, but for pooping" — multi-user,
// backed by a plain JSON file (data/poopva.json) via readDb/writeDb.

// GET all logs, newest first, capped at 100.
app.get("/api/poopva/logs", (req, res) => {
  try {
    const db = readDb();
    const logs = [...db.logs]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 100);
    res.json(logs);
  } catch (err) {
    console.error("Poopva: error fetching logs:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// POST a new log.
app.post("/api/poopva/logs", (req, res) => {
  try {
    const {
      logId,
      userId,
      username,
      bristolType,
      feeling,
      duration,
      spot,
      notes,
      photoBase64,
      timestamp,
    } = req.body;

    if (!logId || !userId || !username || !bristolType) {
      return res
        .status(400)
        .json({ error: "Missing required fields (logId, userId, username, bristolType)" });
    }

    const db = readDb();
    const log = {
      logId,
      userId,
      username,
      bristolType,
      feeling: feeling || "",
      duration: duration || "",
      spot: spot || "",
      notes: notes || "",
      photoBase64: photoBase64 || null,
      timestamp: timestamp || new Date().toISOString(),
      poodos: [],
      comments: [],
    };

    db.logs.push(log);
    writeDb(db);
    res.status(201).json(log);
  } catch (err) {
    console.error("Poopva: error creating log:", err);
    res.status(500).json({ error: "Failed to create log" });
  }
});

// DELETE a log — only the owner may remove it.
app.delete("/api/poopva/logs/:logId", (req, res) => {
  try {
    const { userId } = req.body || {};
    const db = readDb();
    const log = db.logs.find((l) => l.logId === req.params.logId);
    if (!log) return res.status(404).json({ error: "Log not found" });
    if (log.userId !== userId) {
      return res.status(403).json({ error: "You can only delete your own logs" });
    }
    db.logs = db.logs.filter((l) => l.logId !== req.params.logId);
    writeDb(db);
    res.json({ message: "Deleted", logId: req.params.logId });
  } catch (err) {
    console.error("Poopva: error deleting log:", err);
    res.status(500).json({ error: "Failed to delete log" });
  }
});

// POST toggle a Poodo (kudos). Add userId if absent, remove if present.
app.post("/api/poopva/logs/:logId/poodo", (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    const db = readDb();
    const log = db.logs.find((l) => l.logId === req.params.logId);
    if (!log) return res.status(404).json({ error: "Log not found" });

    if (!Array.isArray(log.poodos)) log.poodos = [];
    const idx = log.poodos.indexOf(userId);
    if (idx >= 0) {
      log.poodos.splice(idx, 1);
    } else {
      log.poodos.push(userId);
    }
    writeDb(db);
    res.json(log);
  } catch (err) {
    console.error("Poopva: error toggling poodo:", err);
    res.status(500).json({ error: "Failed to toggle poodo" });
  }
});

// POST add a comment.
app.post("/api/poopva/logs/:logId/comments", (req, res) => {
  try {
    const { userId, username, text } = req.body || {};
    if (!userId || !username || !text || !text.trim()) {
      return res.status(400).json({ error: "Missing userId, username, or text" });
    }
    const db = readDb();
    const log = db.logs.find((l) => l.logId === req.params.logId);
    if (!log) return res.status(404).json({ error: "Log not found" });

    if (!Array.isArray(log.comments)) log.comments = [];
    log.comments.push({
      userId,
      username,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    });
    writeDb(db);
    res.json(log);
  } catch (err) {
    console.error("Poopva: error adding comment:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// GET aggregate stats for one user.
app.get("/api/poopva/users/:userId/stats", (req, res) => {
  try {
    const userId = req.params.userId;
    const db = readDb();
    const logs = db.logs.filter((l) => l.userId === userId);

    const totalLogs = logs.length;
    const totalPoodos = logs.reduce(
      (s, l) => s + (l.poodos ? l.poodos.length : 0),
      0
    );

    // Day-by-day streak ending today.
    const dayKey = (d) =>
      d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
    const days = new Set(logs.map((l) => dayKey(new Date(l.timestamp))));
    let streak = 0;
    const cur = new Date();
    while (days.has(dayKey(cur))) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    }

    const weekAgo = Date.now() - 7 * 864e5;
    const weekCount = logs.filter(
      (l) => new Date(l.timestamp).getTime() >= weekAgo
    ).length;

    const counts = {};
    for (let t = 1; t <= 7; t++) counts[t] = 0;
    logs.forEach((l) => {
      if (l.bristolType >= 1 && l.bristolType <= 7) {
        counts[l.bristolType]++;
      }
    });
    const bristolBreakdown = [];
    for (let t = 1; t <= 7; t++) {
      bristolBreakdown.push({ type: t, count: counts[t] });
    }

    res.json({ totalLogs, totalPoodos, streak, weekCount, bristolBreakdown });
  } catch (err) {
    console.error("Poopva: error fetching stats:", err);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});
// =================== End Poopva API ===================

app.get("/:appName", function (request, response) {
  const appName = request.params.appName;

  // Serve static assets for the app
  app.use("/components", express.static("./src/components"));
  app.use("/public", express.static("./src/public"));
  app.use("/modules", express.static("./src/modules"));
  app.use("/resources", express.static("./src/resources"));
  app.use("/views", express.static("./src/views"));

  if (appName == "StrategyMapper") {
    const indexPath = path.join(
      __dirname,
      "src",
      "views",
      "strategyMapper.html"
    );

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
        );

      response.send(updatedHtml);
      return;
    });
  } else if (appName == "EmotionWheel") {
    const indexPath = path.join(
      __dirname,
      "src",
      "views",
      "emotionsWheel.html"
    );

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
        );

      response.send(updatedHtml);
      return;
    });
  } else if (appName == "Transcribe") {
    const indexPath = path.join(
      __dirname,
      "src",
      "views",
      "transcribeService.html"
    );

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
        );

      response.send(updatedHtml);
      return;
    });
  } else if (appName == "Poopva") {
    // Poopva is a complete standalone HTML app — serve it directly.
    const indexPath = path.join(__dirname, "src", "views", "poopva.html");

    fs.readFile(indexPath, "utf8", (err, data) => {
      if (err) {
        console.error("Error reading poopva.html:", err);
        response.status(500).send("Internal Server Error");
        return;
      }

      response.send(data);
      return;
    });
  } else {
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
      return;
    });
  }
});

// Route to serve plain Markdown pages
app.get("/markdown/:pageName", (req, res) => {
  const pageName = req.params.pageName;
  const markdownPath = path.join(
    __dirname,
    "src",
    "public",
    "markdown",
    `${pageName}.md`
  );
  const markdownTemplatePath = path.join(
    __dirname,
    "src",
    "views",
    "markdown_template.html"
  );

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

app.post("/api/submit", async (req, res) => {
  const { emotions, transcription, timestamp } = req.body;

  if (!emotions || !Array.isArray(emotions)) {
    return res.status(400).json({ error: "Invalid or missing emotions data" });
  }

  try {
    const submission = new Submission({ emotions, transcription, timestamp });
    const result = await submission.save();

    console.log("Submission saved to database:", result);
    res
      .status(200)
      .json({ message: "Submission successful", submission: result });
  } catch (error) {
    console.error("Error saving to database:", error);
    res.status(500).json({ error: "Failed to save submission to database" });
  }
});

var server = app.listen(process.env.PORT || port, listen);

// This call back just tells us that the server has started
function listen() {
  var host = server.address().address;
  var port = server.address().port;
  console.log("App listening at http://" + host + ":" + port);
  console.log("App listening at http://localhost:" + port);
}
