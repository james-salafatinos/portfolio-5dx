/**
 * InputComponent - Handles input state
 */
import { Component } from './core/component.js';
import * as THREE from '/modules/three.module.js';

export class InputComponent extends Component {
    constructor() {
        super();
        
        // Input state
        this.keys = {};
        this.isMoving = false;
        this.isRunning = false;
        this.targetPosition = new THREE.Vector3();
    }

    /**
     * Reset all key states
     */
    resetKeys() {
        this.keys = {};
        this.updateMovementState();
    }

    /**
     * Set a key state
     * @param {string} key - The key code
     * @param {boolean} isPressed - Whether the key is pressed
     */
    setKey(key, isPressed) {
        this.keys[key] = isPressed;
        this.updateMovementState();
    }

    /**
     * Check if a key is pressed
     * @param {string} key - The key code
     * @returns {boolean} - Whether the key is pressed
     */
    isKeyPressed(key) {
        return this.keys[key] === true;
    }

    /**
     * Update the movement state based on key presses
     */
    updateMovementState() {
        // Check if any movement keys are pressed
        const movementKeys = ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'];
        this.isMoving = movementKeys.some(key => this.isKeyPressed(key));
        
        // Check if shift is pressed for running
        this.isRunning = this.isKeyPressed('Shift') && this.isMoving;
    }

    /**
     * Set the target position for click-to-move
     * @param {THREE.Vector3} position 
     */
    setTargetPosition(position) {
        this.targetPosition.copy(position);
    }
}
