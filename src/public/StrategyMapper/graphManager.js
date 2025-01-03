import { registerCustomNodes } from "./nodeDefinitions.js";

class GraphManager {
  constructor(canvasSelector) {
    this.canvasElement = document.querySelector(canvasSelector);
    this.graph = new LGraph();
    this.canvas = new LGraphCanvas(canvasSelector, this.graph);

    // Register custom nodes
    registerCustomNodes();

    this.create();
  }

  create() {
    this.createInitialNodes();
  }

  createInitialNodes() {
    // Create and configure initial nodes if needed
  }

  update() {
    this.graph.runStep(); // Update the graph
    requestAnimationFrame(() => this.update()); // Loop using requestAnimationFrame
  }

  // Save the graph to localStorage with a given name
  saveGraph(graphName) {
    const data = JSON.stringify(this.graph.serialize());
    // Save the graph data under the key 'graphData_<graphName>'
    localStorage.setItem(`graphData_${graphName}`, data);

    // Update the list of saved graph names
    let savedGraphNames =
      JSON.parse(localStorage.getItem("savedGraphNames")) || [];
    if (!savedGraphNames.includes(graphName)) {
      savedGraphNames.push(graphName);
      localStorage.setItem("savedGraphNames", JSON.stringify(savedGraphNames));
    }

    alert(`Graph '${graphName}' saved successfully.`);
  }

  // Load the graph from localStorage with a given name
  loadGraph(graphName) {
    const data = localStorage.getItem(`graphData_${graphName}`);
    if (data) {
      this.graph.clear();
      this.graph.configure(JSON.parse(data));
      alert(`Graph '${graphName}' loaded successfully.`);
    } else {
      alert(`Graph '${graphName}' not found in local storage.`);
    }
  }

  // Get the list of saved graph names from localStorage
  getSavedGraphNames() {
    return JSON.parse(localStorage.getItem("savedGraphNames")) || [];
  }



  // Download the current graph as a JSON file
  downloadGraph() {
    const data = JSON.stringify(this.graph.serialize(), null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const element = document.createElement("a");
    element.setAttribute("href", url);
    element.setAttribute("download", "graph.json");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    // Release the object URL after some time
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000 * 60); // 1 minute
  }

  // Upload and load a graph from a JSON file
  uploadGraph(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target.result;
      try {
        const graphData = JSON.parse(data);
        this.graph.clear();
        this.graph.configure(graphData);
        alert("Graph uploaded successfully.");
      } catch (error) {
        alert("Error parsing graph data: " + error.message);
      }
    };
    reader.readAsText(file);
  }

  getGraphData() {
    return this.graph.serialize(); // Return graph data in serialized form
  }
}

export default GraphManager;
