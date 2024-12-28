import * as THREE from "/modules/three.webgpu.js";
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
  positionGeometry
} from "/modules/three.tsl.js";

class Game {
  constructor(scene) {
    this.scene = scene;
    this.objects = [];
    this.uniforms = {
      freqX: uniform(10),
      freqY: uniform(5),
    };
  }

  _createTestCustomMaterial() {
    const material = new THREE.MeshBasicNodeMaterial();
    console.log(material)

    material.positionNode = positionLocal.add(vec3(sin(time), cos(time), sin(time)));

    material.colorNode = vec4(positionLocal, 1);

    return material;
  }

  
  _createTestCustomMaterial2() {
    const material = new THREE.MeshBasicNodeMaterial();

    const modelPosition = modelWorldMatrix.mul(vec4(positionLocal, 1));


    const elevation = sin(modelPosition.x.mul(this.uniforms.freqX).sub(time)).mul(.1).add(sin(modelPosition.z.mul(this.uniforms.freqY).sub(time)).mul(.1))
    material.positionNode = positionLocal.add(vec3(sin(time).add(4),cos(time), sin(time).add(elevation)))
    material.colorNode = vec4(positionWorld, 1);

    return material;
  }

  _createTestCustomMaterial3() {
    const material = new THREE.MeshBasicNodeMaterial();

    // const modelPosition = modelWorldMatrix.mul(vec4(positionLocal, 1));
    const modelPosition = positionView

    const elevation = sin(modelPosition.x.mul(this.uniforms.freqX).sub(time)).mul(.1).add(sin(modelPosition.z.mul(this.uniforms.freqY).sub(time)).mul(.1))
    material.positionNode = positionLocal.add(vec3(sin(time),cos(time), sin(time).add(elevation)))
    material.colorNode = vec4(positionLocal, 1);

    return material;
  }

  create() {
    const customTestMaterial = this._createTestCustomMaterial();
    const customTestMaterial2 = this._createTestCustomMaterial2();
    const customTestMaterial3 = this._createTestCustomMaterial3();

    // Add plane geometry as the floor
    const planeGeometry = new THREE.PlaneGeometry(4, 4, 512, 512);
    const plane = new THREE.Mesh(planeGeometry, customTestMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    plane.receiveShadow = true;
    this.scene.add(plane);


    const plane2 = new THREE.Mesh(planeGeometry, customTestMaterial2);
    plane2.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    plane2.receiveShadow = true;
    this.scene.add(plane2);

    const plane3 = new THREE.Mesh(planeGeometry, customTestMaterial3);
    plane3.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    plane3.receiveShadow = true;
    this.scene.add(plane3);
  }

  

  update() {

  }
}

export { Game };
