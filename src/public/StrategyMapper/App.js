import GraphManager from "./graphManager.js";

// Adjust canvas size dynamically, considering the toolbar height
function resizeCanvas() {
  const canvas = document.getElementById("mycanvas");
  const toolbarHeight = document.getElementById("toolbar").offsetHeight;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - toolbarHeight;
  canvas.style.top = toolbarHeight + "px";
}

// Initialize the app
function initializeApp() {
  resizeCanvas();
  const graphManager = new GraphManager("#mycanvas");
  graphManager.update(); // Start the update loop

  // Add listeners for toolbar buttons
  setupToolbar(graphManager);

  // Event listener for switching views
  document.getElementById("toggleGraphView").addEventListener("click", () => {
    document.getElementById("tableContainer").style.display = "none";
    document.getElementById("mycanvas").style.display = "block";
  });

  document
    .getElementById("toolbar")
    .appendChild(createTableViewButton(graphManager));
}

// Set up toolbar buttons for save/load/download/upload
function setupToolbar(graphManager) {
  document.getElementById("saveButton").addEventListener("click", () => {
    const graphName = document.getElementById("graphNameInput").value.trim();
    if (graphName) {
      graphManager.saveGraph(graphName);
      updateSavedGraphsDropdown(graphManager);
    } else {
      alert("Please enter a name for the graph.");
    }
  });

  document.getElementById("loadButton").addEventListener("click", () => {
    const graphName = document.getElementById("savedGraphsDropdown").value;
    if (graphName) {
      graphManager.loadGraph(graphName);
    } else {
      alert("Please select a graph to load.");
    }
  });

  document.getElementById("downloadButton").addEventListener("click", () => {
    graphManager.downloadGraph();
  });

  document.getElementById("uploadButton").addEventListener("click", () => {
    document.getElementById("uploadInput").click();
  });

  document.getElementById("uploadInput").addEventListener("change", (event) => {
    const file = event.target.files[0];
    graphManager.uploadGraph(file);
    updateSavedGraphsDropdown(graphManager);
  });

  // Populate the saved graphs dropdown
  updateSavedGraphsDropdown(graphManager);

}


// Update the saved graphs dropdown
function updateSavedGraphsDropdown(graphManager) {
  const dropdown = document.getElementById("savedGraphsDropdown");
  dropdown.innerHTML = '<option value="">Select Graph to Load</option>';
  const savedGraphs = graphManager.getSavedGraphNames();
  savedGraphs.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    dropdown.appendChild(option);
  });
}

// Create "Switch to Table View" button
function createTableViewButton(graphManager) {
  const tableViewButton = document.createElement("button");
  tableViewButton.textContent = "Switch to Table View";
  tableViewButton.addEventListener("click", () => {
    const tableContainer = document.getElementById("tableContainer");
    const canvas = document.getElementById("mycanvas");
    tableContainer.style.display = "block";
    canvas.style.display = "none";

    populateTable(graphManager.getGraphData());
  });
  return tableViewButton;
}

// Populate the table with graph data
function populateTable(graphData) {
  const table = document.getElementById("dataTable");
  const thead = table.querySelector("thead tr");
  const tbody = table.querySelector("tbody");

  // Clear existing rows and headers
  thead.innerHTML = "";
  tbody.innerHTML = "";

  // Extract unique keys for headers
  const headers = new Set();
  graphData.nodes.forEach((node) => {
    Object.keys(node.properties || {}).forEach((key) => headers.add(key));
    headers.add("Type");
  });

  // Create headers
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    thead.appendChild(th);
  });

  // Create rows
  graphData.nodes.forEach((node) => {
    const tr = document.createElement("tr");
    headers.forEach((header) => {
      const td = document.createElement("td");
      if (header === "Type") {
        td.textContent = node.type;
      } else if (Array.isArray(node.properties?.[header])) {
        const button = document.createElement("button");
        button.textContent = `View ${header}`;
        button.addEventListener("click", () => {
          alert(`Navigating to related nodes for: ${header}`);
          // Add logic for graph traversal if needed
        });
        td.appendChild(button);
      } else {
        td.textContent = node.properties?.[header] || "";
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// Resize the canvas on window resize
window.addEventListener("resize", resizeCanvas);

// Initialize app when the page loads
document.addEventListener("DOMContentLoaded", initializeApp);
