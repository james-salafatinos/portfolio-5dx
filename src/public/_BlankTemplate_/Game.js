import * as THREE from "/modules/three.webgpu.js";
import {
  float,
  If,
  PI,
  color,
  cos,
  instanceIndex,
  Loop,
  sqrt,
  mix,
  mod,
  sin,
  instancedArray,
  Fn,
  uint,
  uniform,
  uniformArray,
  hash,
  vec3,
  vec4,
} from "/modules/three.tsl.js";

import { GUI } from "/modules/lil-gui.module.min.js";
import { OrbitControls } from "/modules/OrbitControls.js";
import { AxesHelper } from "/components/AxesHelper.webgpu.js";
import { GridHelper } from "/components/GridHelper.webgpu.js";


class Game {

  constructor(scene) {
    this.scene = scene;
  }

  create() {


  }

  
  update() {
  
  }

  _private(){
    
  }

}

export { Game };
