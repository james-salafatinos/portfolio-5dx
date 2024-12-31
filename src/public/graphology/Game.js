import * as THREE from "/modules/webgpu/three.webgpu.js";
import { GLTFLoader } from "/modules/GLTFLoader.js";
import {
  texture,
  uv,
  mix,
  time,
  sin,
  vec4,
  vec3,
  cos,
  uniform,
  modelWorldMatrix,
  positionLocal,
  positionWorld,
  positionView,
  positionViewDirection,
  positionWorldDirection,
  positionGeometry,
} from "/modules/webgpu/three.tsl.js";
import * as Graphology from "./graphology.js";
import * as GraphologyLibrary from "./graphology-library.js";
import { FontLoader } from "/modules/webgpu/FontLoader.js";
import { TextGeometry } from "/modules/webgpu/TextGeometry.js";

console.log(graphologyLibrary);
class Game {
  constructor(scene, camera) {
    this.scene = scene;
    this.objects = [];
    this.camera = camera;
    this.G;
    this.create();
  }

  create() {
    this.graphologyGraph = this._initializeTestGraph();
    this.graph = new ThreeGraph(this.scene, this.graphologyGraph, this.camera);
    this.graph.create();
  }

  update() {
    this.graph.update(this.camera);
  }

  _initializeTestGraph() {
    const graph = new graphology.Graph({
      multi: true,
      allowSelfLoops: false,
      type: "mixed",
    }); //directed, or mixed
    graph.addNode("Connie");
    graph.addNode("Sebastian");
    graph.addNode("James");
    graph.addNode("Samantha");
    graph.addNode("Evelynn");
    graph.addNode("Matt");
    graph.addNode("Rachel");
    graph.addNode("Erin");

    graph.addEdge("Sebastian", "Connie");
    graph.addEdge("James", "Samantha");
    graph.addEdge("James", "Evelynn");
    graph.addEdge("James", "Matt");
    graph.addEdge("Matt", "Evelynn");
    graph.addEdge("Samantha", "Evelynn");
    graph.addEdge("Samantha", "Connie");
    graph.addEdge("Rachel", "Evelynn");
    graph.addEdge("Erin", "Evelynn");

    // Using the callback methods
    graph.forEachEdge(
      (
        edge,
        attributes,
        source,
        target,
        sourceAttributes,
        targetAttributes
      ) => {
        console.log(`Edge from ${source} to ${target}`);
      }
    );
    return graph;
  }
}

class ThreeGraph {
  constructor(scene, graph, camera) {
    this.scene = scene;
    this.graph = graph;
    this.objects = [];
    this.camera = camera;

    this.textLabels = []
  }
  async create() {
    await this._createNodes(this.scene, this.graph, this.objects);
    this._createEdges(this.scene, this.graph, this.objects);
  }
  update(camera) {
    // Make text labels face the camera
    this.textLabels.forEach((textLabel) => {
      textLabel.lookAt(camera.position); // Orient text to face the camera
    });
  }
  async _createNodes(scene, graph, objects) {
    const font = await this._loadFont();
    const material = new THREE.MeshBasicNodeMaterial();
    // material.colorNode = vec4(positionWorld, 1);
    material.colorNode = vec4(1);
    const sphereGeometry = new THREE.SphereGeometry(0.2, 8);

    graphologyLibrary.layout.random.assign(graph);
    graphologyLibrary.layoutForceAtlas2.assign(graph, { iterations: 50 });

    graph.forEachNode((node, attributes) => {
      console.log(node, attributes);

      const sphere = new THREE.Mesh(sphereGeometry, material);

      sphere.position.x += attributes.x;
      sphere.position.y += attributes.y;
      sphere.position.z += 0;
      sphere.receiveShadow = true;
      scene.add(sphere);
      objects.push(sphere);
      // Create text label
      const text = this._createTextLabel(node, attributes, font);
      scene.add(text);
      this.textLabels.push(text); // Track text labels
    });
  }
  _createTextLabel(textContent, attributes, font) {
    const textSize = 0.1; // Customize size
    const textHeight = 0.02; // Customize height
    const textMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

    const geometry = new TextGeometry(textContent, {
      font: font,
      size: textSize,
      depth: textHeight,
    });

    const textMesh = new THREE.Mesh(geometry, textMaterial);
    textMesh.position.set(attributes.x, attributes.y + 0.3, attributes.z || 0); // Offset above the node
    return textMesh;
  }
  async _loadFont() {
    const loader = new FontLoader();
    return new Promise((resolve, reject) => {
      loader.load(
        // "https://unpkg.com/three@0.77.0/examples/fonts/helvetiker_regular.typeface.json",
        "/modules/helvetiker_regular.typeface.json",
        (font) => resolve(font),
        undefined,
        reject
      );
    });
  }

  _createEdges(scene, graph, objects) {
    const material = new THREE.LineBasicMaterial({ color: 0x0000ff });

    graph.forEachEdge((edge, attributes, source, target) => {
      // Get the positions of the source and target nodes
      const sourceAttributes = graph.getNodeAttributes(source);
      const targetAttributes = graph.getNodeAttributes(target);

      const sourcePosition = new THREE.Vector3(
        sourceAttributes.x,
        sourceAttributes.y,
        sourceAttributes.z || 0 // Default Z to 0 if not set
      );

      const targetPosition = new THREE.Vector3(
        targetAttributes.x,
        targetAttributes.y,
        targetAttributes.z || 0 // Default Z to 0 if not set
      );

      // Create a geometry to represent the edge
      const geometry = new THREE.BufferGeometry().setFromPoints([
        sourcePosition,
        targetPosition,
      ]);

      // Create the line and add it to the scene
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      objects.push(line);
    });
  }
}
export { Game };
