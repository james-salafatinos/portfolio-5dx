import * as THREE from "/modules/three.module.js";

class AxesHelper {

  constructor(scene) {
    this.scene = scene;
    this.axesHelper;
    this.create();
  }

  create() {
    this.axesHelper = new THREE.AxesHelper(1);
    this.scene.add(this.axesHelper);
  }

  
  update() {
  
  }

}

export { AxesHelper };
