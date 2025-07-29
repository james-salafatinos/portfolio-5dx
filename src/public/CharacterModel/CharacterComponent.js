/**
 * CharacterComponent - Handles character-specific properties and state
 */
import { Component } from './core/component.js';
import * as THREE from '/modules/three.module.js';

export class CharacterComponent extends Component {
    constructor(data = {}) {
        super();
        
        // Character properties
        this.health = data.health || 100;
        this.maxHealth = data.maxHealth || 100;
        this.speed = data.speed || 5;
    
        // Character state
        this.isGrounded = true;
        
        // Animation properties
        this.currentAnimation = 'idle';
        this.animationMixer = null;
        this.animations = {};
        
        // State machine
        this.stateMachine = {
            currentState: 'idle',
            states: {
                idle: {
                    enter: () => this.playAnimation('idle'),
                    update: (input) => {
                        if (input && input.isMoving) {
                            this.changeState('walk');
                        }
                    },
                    exit: () => {}
                },
                walk: {
                    enter: () => this.playAnimation('walk'),
                    update: (input) => {
                        if (input && !input.isMoving) {
                            this.changeState('idle');
                        } else if (input && input.isRunning) {
                            this.changeState('run');
                        }
                    },
                    exit: () => {}
                },
                run: {
                    enter: () => this.playAnimation('run'),
                    update: (input) => {
                        if (input && !input.isMoving) {
                            this.changeState('idle');
                        } else if (input && !input.isRunning) {
                            this.changeState('walk');
                        }
                    },
                    exit: () => {}
                },
                dance: {
                    enter: () => {
                        this.playAnimation('dance');
                        // Set up a one-shot animation that returns to idle
                        if (this.animations['dance']) {
                            const action = this.animations['dance'];
                            action.setLoop(THREE.LoopOnce, 1);
                            action.clampWhenFinished = true;
                            
                            // Set up callback to return to idle when finished
                            const mixer = action.getMixer();
                            const onFinished = () => {
                                mixer.removeEventListener('finished', onFinished);
                                this.changeState('idle');
                            };
                            mixer.addEventListener('finished', onFinished);
                        }
                    },
                    update: () => {},
                    exit: () => {}
                }
            }
        };
    }

    /**
     * Change the current state
     * @param {string} newState - The name of the state to change to
     */
    changeState(newState) {
        console.log(`[CharacterComponent] Attempting to change state from ${this.stateMachine.currentState} to ${newState}`);
        
        if (!this.stateMachine.states[newState]) {
            console.warn(`[CharacterComponent] State '${newState}' not found`);
            return;
        }
        
        if (this.stateMachine.currentState === newState) {
            console.log(`[CharacterComponent] Already in state ${newState}, no change needed`);
            return;
        }
        
        // Exit current state
        const currentState = this.stateMachine.states[this.stateMachine.currentState];
        if (currentState && currentState.exit) {
            console.log(`[CharacterComponent] Exiting state ${this.stateMachine.currentState}`);
            currentState.exit();
        }
        
        // Enter new state
        const nextState = this.stateMachine.states[newState];
        if (nextState && nextState.enter) {
            console.log(`[CharacterComponent] Entering state ${newState}`);
            nextState.enter();
        }
        
        this.stateMachine.currentState = newState;
        console.log(`[CharacterComponent] State changed to ${newState}`);
    }

    /**
     * Update the state machine
     * @param {number} deltaTime - Time since last update
     * @param {object} input - Input data for state transitions
     */
    update(deltaTime, input) {
        // Update the current state
        const currentState = this.stateMachine.states[this.stateMachine.currentState];
        if (currentState && currentState.update) {
            currentState.update(input, deltaTime);
        }
        
        // Update animation mixer if it exists
        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }
    }

    /**
     * Set the character's health
     * @param {number} health 
     */
    setHealth(health) {
        this.health = Math.min(Math.max(0, health), this.maxHealth);
    }

    /**
     * Damage the character
     * @param {number} amount 
     */
    damage(amount) {
        this.setHealth(this.health - amount);
    }

    /**
     * Heal the character
     * @param {number} amount 
     */
    heal(amount) {
        this.setHealth(this.health + amount);
    }

    /**
     * Set the character's movement speed
     * @param {number} speed 
     */
    setSpeed(speed) {
        this.speed = speed;
    }

    /**
     * Set the animation mixer for this character
     * @param {THREE.AnimationMixer} mixer 
     */
    setAnimationMixer(mixer) {
        this.animationMixer = mixer;
        console.log('[CharacterComponent] Animation mixer set');
    }

    /**
     * Add an animation clip
     * @param {string} name 
     * @param {THREE.AnimationClip} clip 
     */
    addAnimation(name, clip) {
        if (this.animationMixer) {
            console.log(`[CharacterComponent] Adding animation: ${name}`);
            this.animations[name] = this.animationMixer.clipAction(clip);
            console.log(`[CharacterComponent] Animation added: ${name}, action:`, this.animations[name]);
        } else {
            console.error(`[CharacterComponent] Cannot add animation ${name}: mixer not set`);
        }
    }

    /**
     * Play an animation
     * @param {string} name 
     * @param {number} crossFadeDuration - Time to blend between animations
     */
    playAnimation(name, crossFadeDuration = 0.2) {
        console.log(`[CharacterComponent] Attempting to play animation: ${name}`);
        
        if (!this.animations[name]) {
            console.warn(`[CharacterComponent] Animation '${name}' not found`);
            console.log(`[CharacterComponent] Available animations:`, Object.keys(this.animations));
            return;
        }
        
        const current = this.animations[this.currentAnimation];
        const next = this.animations[name];
        
        console.log(`[CharacterComponent] Current animation: ${this.currentAnimation}, Next animation: ${name}`);
        
        if (current && current !== next) {
            console.log(`[CharacterComponent] Fading out current animation: ${this.currentAnimation}`);
            current.fadeOut(crossFadeDuration);
        }
        
        console.log(`[CharacterComponent] Playing animation: ${name}`);
        next.reset();
        next.fadeIn(crossFadeDuration);
        next.play();
        this.currentAnimation = name;
        
        // Ensure animation is enabled and weighted properly
        next.enabled = true;
        next.setEffectiveWeight(1.0);
        next.setEffectiveTimeScale(1.0);
        
        console.log(`[CharacterComponent] Animation state after play:`, {
            enabled: next.enabled,
            weight: next.getEffectiveWeight(),
            timeScale: next.getEffectiveTimeScale(),
            paused: next.paused
        });
    }
}
