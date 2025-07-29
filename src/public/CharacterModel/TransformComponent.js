/**
 * TransformComponent - Handles position, rotation, and scale
 */
import { Component } from './core/component.js';
import * as THREE from '/modules/three.module.js ';

export class TransformComponent extends Component {
    constructor(x = 0, y = 0, z = 0) {
        super();
        this.position = new THREE.Vector3(x, y, z);
        this.rotation = new THREE.Euler(0, 0, 0);
        this.scale = new THREE.Vector3(1, 1, 1);
    }

    /**
     * Set position
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    setPosition(x, y, z) {
        this.position.set(x, y, z);
    }

    /**
     * Set rotation from Euler angles
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    setRotation(x, y, z) {
        this.rotation.set(x, y, z);
    }

    /**
     * Set scale
     * @param {number} x 
     * @param {number} y 
     * @param {number} z 
     */
    setScale(x, y, z) {
        this.scale.set(x, y, z);
    }
}
