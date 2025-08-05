/**
 * CharacterSystem - Handles character-related logic including model loading, animation, and updates
 */
import { System } from './core/system.js';
import { CharacterComponent } from './CharacterComponent.js';
import { MovementComponent } from './MovementComponent.js';
import { InputComponent } from './InputComponent.js';
import * as THREE from '/modules/three.module.js';
import { FBXLoader } from '/modules/FBXLoader.js';

export class CharacterSystem extends System {
    constructor(scene) {
        super();
        this.scene = scene;
        this.mixer = null;
        this.model = null;
        this.animations = {};
        this.clock = new THREE.Clock();
    }

    /**
     * Initialize the system
     */
    init() {
        console.log('[CharacterSystem] Initializing');
        // The world property is set by the ECS framework when the system is registered
        // We'll check for it here to ensure it's available
        if (!this.world) {
            console.warn('[CharacterSystem] World not available during initialization');
        } else {
            console.log('[CharacterSystem] World available:', this.world);
        }
    }

    /**
     * Load character model for an entity
     * @param {Entity} entity - The entity to load the model for
     */
    loadCharacterModel(entity) {
        console.log('[CharacterSystem] Loading character model for entity:', entity);
        
        if (!entity) {
            console.error('[CharacterSystem] No entity provided to loadCharacterModel');
            return;
        }
        
        // Check if entity has required components
        console.log('[CharacterSystem] Entity components:', Array.from(entity.components.keys()).map(c => c.name));
        
        let characterComponent;
        try {
            characterComponent = entity.getComponent(CharacterComponent);
            console.log('[CharacterSystem] CharacterComponent found:', characterComponent);
        } catch (error) {
            console.error('[CharacterSystem] Error getting CharacterComponent:', error);
        }
        
        if (!characterComponent) {
            console.error('[CharacterSystem] Entity is missing CharacterComponent');
            console.log('[CharacterSystem] Will attempt to continue with direct component reference from Game');
            
            // Try to get the component from Game instance if available
            if (window.game && window.game.characterComponent) {
                characterComponent = window.game.characterComponent;
                console.log('[CharacterSystem] Using CharacterComponent from Game instance');
            } else {
                console.error('[CharacterSystem] Cannot find CharacterComponent reference');
                return;
            }
        }

        const fbxLoader = new FBXLoader();
        
        fbxLoader.load(
            './public/CharacterModel/models/model.fbx',
            (fbx) => {
                console.log('[CharacterSystem] Character model loaded successfully');
                
                // Set up the model
                this.model = fbx;
                this.model.scale.setScalar(0.01); // Scale down the model
                this.model.position.set(0, 0, 0); // Position at origin
                
                // Add to scene
                this.scene.add(this.model);
                console.log('[CharacterSystem] Model added to scene');
                
                // Create animation mixer
                this.mixer = new THREE.AnimationMixer(this.model);
                console.log('[CharacterSystem] Animation mixer created:', this.mixer);
                
                // Set animation mixer on character component
                characterComponent.setAnimationMixer(this.mixer);
                
                // Load animations
                this.loadAnimations(entity);
            },
            (progress) => {
                console.log('Loading model: ' + (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.error('[CharacterSystem] Error loading character model:', error);
            }
        );
    }

    /**
     * Load animations for an entity
     * @param {Entity} entity - The entity to load animations for
     */
    loadAnimations(entity) {
        const characterComponent = entity.getComponent(CharacterComponent);
        if (!characterComponent) {
            console.error('[CharacterSystem] Entity is missing CharacterComponent');
            return;
        }

        const fbxLoader = new FBXLoader();
        const animations = [
            { name: 'idle', path: './public/CharacterModel/models/idle.fbx' },
            { name: 'walk', path: './public/CharacterModel/models/walk.fbx' },
            { name: 'run', path: './public/CharacterModel/models/run.fbx' },
            { name: 'dance', path: './public/CharacterModel/models/dance.fbx' }
        ];
        
        console.log('[CharacterSystem] Starting to load animations:', animations.map(a => a.name));
        
        let loadedCount = 0;
        let idleClipLoaded = false;
        
        animations.forEach(animation => {
            console.log(`[CharacterSystem] Loading animation: ${animation.name} from ${animation.path}`);
            
            fbxLoader.load(
                animation.path,
                (animFbx) => {
                    console.log(`[CharacterSystem] Animation ${animation.name} loaded successfully`);
                    
                    // Get the animation clip
                    const clip = animFbx.animations[0];
                    if (clip) {
                        console.log(`[CharacterSystem] Found animation clip in ${animation.name}:`, clip);
                        
                        // Rename the clip to match our state names
                        clip.name = animation.name;
                        
                        // Add to character component
                        characterComponent.addAnimation(animation.name, clip);
                        
                        // If this is the idle animation, play it immediately
                        if (animation.name === 'idle' && !idleClipLoaded) {
                            console.log('[CharacterSystem] Playing idle animation immediately');
                            characterComponent.playAnimation('idle');
                            idleClipLoaded = true;
                            
                            // Force mixer update to ensure animation starts playing
                            if (this.mixer) {
                                console.log('[CharacterSystem] Forcing initial mixer update');
                                this.mixer.update(0.01);
                            }
                        }
                        
                        // Check if all animations are loaded
                        loadedCount++;
                        console.log(`[CharacterSystem] Animation ${animation.name} processed. ${loadedCount}/${animations.length} loaded`);
                        
                        if (loadedCount === animations.length) {
                            console.log('[CharacterSystem] All animations loaded');
                            
                            // Explicitly set idle state
                            console.log('[CharacterSystem] Setting initial state to idle');
                            
                            // Make sure the state machine is properly initialized
                            characterComponent.stateMachine.currentState = 'idle';
                            
                            // Explicitly call changeState to trigger the enter handler
                            characterComponent.changeState('idle');
                            
                            // Force mixer update again after all animations are loaded
                            if (this.mixer) {
                                console.log('[CharacterSystem] Forcing final mixer update after all animations loaded');
                                this.mixer.update(0.01);
                                
                                // Additional debug info
                                console.log('[CharacterSystem] Animation state after initialization:', {
                                    currentState: characterComponent.stateMachine.currentState,
                                    currentAnimation: characterComponent.currentAnimation,
                                    hasAnimations: Object.keys(characterComponent.animations).length > 0,
                                    animationNames: Object.keys(characterComponent.animations)
                                });
                            }
                        }
                    } else {
                        console.warn(`[CharacterSystem] No animation found in ${animation.path}`);
                    }
                },
                (progress) => {
                    const percent = Math.round(progress.loaded / progress.total * 100);
                    console.log(`[CharacterSystem] Loading ${animation.name}: ${percent}%`);
                },
                (error) => {
                    console.error(`[CharacterSystem] Error loading ${animation.name} animation:`, error);
                }
            );
        });
    }

    /**
     * Update method called each frame
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // If no deltaTime is provided, get it from the clock
        if (deltaTime === undefined) {
            deltaTime = this.clock.getDelta() / 2;
        }
        
        // Update animation mixer
        if (this.mixer) {
            // Only log mixer updates occasionally to avoid console spam
            const shouldLog = Math.random() < 0.01; // Log approximately 1% of updates
            
            if (shouldLog) {
                console.log(`[CharacterSystem] Updating mixer with deltaTime: ${deltaTime}`);
            }
            
            this.mixer.update(deltaTime);
        }
        
        // First try to process entities through the ECS world
        let processedEntities = false;
        
        if (this.world) {
            try {
                const entities = this.world.getEntitiesWith(CharacterComponent);
                
                if (entities && entities.length > 0) {
                    processedEntities = true;
                    
                    entities.forEach(entity => {
                        const characterComponent = entity.getComponent(CharacterComponent);
                        const movementComponent = entity.getComponent(MovementComponent);
                        const inputComponent = entity.getComponent(InputComponent);
                        
                        if (!characterComponent) return;
                        
                        // Get input state from InputComponent if available
                        const input = inputComponent ? {
                            isMoving: inputComponent.isMoving,
                            isRunning: inputComponent.isRunning,
                            keys: inputComponent.keys,
                            targetPosition: inputComponent.targetPosition
                        } : null;
                        
                        // Update character component with input
                        characterComponent.update(deltaTime, input);
                        
                        // Update movement component if available
                        if (movementComponent && this.model) {
                            movementComponent.update(deltaTime, input, this.model);
                        }
                    });
                }
            } catch (error) {
                console.warn('[CharacterSystem] Error processing entities through ECS world:', error);
            }
        } else {
            console.warn('[CharacterSystem] World reference is null in update method');
        }
        
        // If no entities were processed through ECS, fall back to direct component references
        if (!processedEntities && window.game) {
            const shouldLog = Math.random() < 0.01; // Log approximately 1% of updates
            if (shouldLog) {
                console.log('[CharacterSystem] Using direct component references from Game instance');
            }
            
            const game = window.game;
            const characterComponent = game.characterComponent;
            const movementComponent = game.movementComponent;
            const inputComponent = game.inputComponent;
            
            if (characterComponent) {
                // Get input state from InputComponent if available
                const input = inputComponent ? {
                    isMoving: inputComponent.isMoving,
                    isRunning: inputComponent.isRunning,
                    keys: inputComponent.keys,
                    targetPosition: inputComponent.targetPosition
                } : game.input; // Fall back to legacy input
                
                // Update character component with input
                characterComponent.update(deltaTime, input);
                
                // Update movement component if available
                if (movementComponent && this.model) {
                    movementComponent.update(deltaTime, input, this.model);
                }
            }
        }
    }
}
