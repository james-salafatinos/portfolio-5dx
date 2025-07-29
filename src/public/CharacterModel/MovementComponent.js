/**
 * MovementComponent - Handles movement state and target position
 */
import { Component } from './core/component.js';
import * as THREE from '/modules/three.module.js';

export class MovementComponent extends Component {
    constructor() {
        super();
        this.isMoving = false;
        this.targetPosition = new THREE.Vector3();
        this.speed = 6.5; // Units per second
        this.rotationSpeed = 20.0; // Radians per second
        this.stoppingDistance = 0.1; // How close to target before stopping
        this.hasTarget = false;
        this.direction = new THREE.Vector3();
    }

    /**
     * Set the target position to move towards
     * @param {THREE.Vector3} position 
     */
    setTargetPosition(position) {
        this.targetPosition.copy(position);
        this.hasTarget = true;
    }

    /**
     * Update the movement based on input and transform
     * @param {number} deltaTime 
     * @param {object} input 
     * @param {THREE.Object3D} object3D 
     */
    update(deltaTime, input, object3D) {
        if (!object3D) return;
        
        // Handle keyboard-based movement (WASD)
        if (input && input.isMoving) {
            this.isMoving = true;
            
            // Calculate movement direction based on input
            this.direction.set(0, 0, 0);
            
            // Map WASD keys to directions
            if (input.keys) {
                if (input.keys['w']) this.direction.z -= 1;
                if (input.keys['s']) this.direction.z += 1;
                if (input.keys['a']) this.direction.x -= 1;
                if (input.keys['d']) this.direction.x += 1;
                
                // Debug log for movement direction
                if (this.direction.lengthSq() > 0) {
                    console.log(`Moving in direction: ${this.direction.x.toFixed(2)}, ${this.direction.z.toFixed(2)}`);
                }
            }
            
            // Normalize direction vector
            if (this.direction.lengthSq() > 0) {
                this.direction.normalize();
                
                // Apply movement speed
                const actualSpeed = input.isRunning ? this.speed * 2 : this.speed;
                const movement = this.direction.clone().multiplyScalar(actualSpeed * deltaTime);
                
                // Update position
                object3D.position.add(movement);
                
                // Rotate character to face movement direction
                if (this.direction.lengthSq() > 0) {
                    const targetRotation = Math.atan2(this.direction.x, this.direction.z);
                    const currentRotation = object3D.rotation.y;
                    
                    // Smooth rotation
                    const rotationDelta = this.rotationSpeed * deltaTime;
                    const angleDiff = targetRotation - currentRotation;
                    
                    // Normalize angle difference
                    let normalizedDiff = angleDiff;
                    while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
                    while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
                    
                    // Apply rotation
                    if (Math.abs(normalizedDiff) < rotationDelta) {
                        object3D.rotation.y = targetRotation;
                    } else {
                        object3D.rotation.y += Math.sign(normalizedDiff) * rotationDelta;
                    }
                }
            }
        } else {
            this.isMoving = false;
        }
    }
}
