/**
 * RenderComponent - Represents a renderable object in Three.js
 */
import { Component } from './core/component.js';

export class RenderComponent extends Component {
    constructor(object3D = null) {
        super();
        this.object3D = object3D;  // Three.js Object3D (mesh, group, etc.)
        this.visible = true;
        this.castShadow = true;
        this.receiveShadow = true;
    }

    /**
     * Set the Three.js object
     * @param {THREE.Object3D} object3D
     */
    setObject3D(object3D) {
        this.object3D = object3D;
        if (object3D) {
            object3D.visible = this.visible;
            object3D.castShadow = this.castShadow;
            object3D.receiveShadow = this.receiveShadow;
        }
    }

    /**
     * Set visibility
     * @param {boolean} visible
     */
    setVisible(visible) {
        this.visible = visible;
        if (this.object3D) {
            this.object3D.visible = visible;
        }
    }
}
