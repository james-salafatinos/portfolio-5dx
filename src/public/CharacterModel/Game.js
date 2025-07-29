import * as THREE from "/modules/three.module.js";
import { FBXLoader } from "/modules/FBXLoader.js";
// import { CharacterFSM } from "./StateMachine.js";
import { RenderSystem } from './RenderSystem.js';
import { World } from './core/index.js';
import { RenderComponent } from './RenderComponent.js';
import { TransformComponent } from './TransformComponent.js';
import { CharacterComponent } from './CharacterComponent.js';
import { MovementComponent } from './MovementComponent.js';

class Game {


    constructor(scene, camera, renderer) {
      this.scene = scene;
      this.camera = camera;
      this.renderer = renderer;
      this.objects = [];
      
      // Initialize ECS World
      this.world = new World();
      
      this.renderSystem = new RenderSystem(scene);
      this.world.registerSystem(this.renderSystem);
      
      // Initialize systems
      this.world.init();
      
      // Input state
      this.input = {
        isMoving: false,
        isRunning: false,
        targetPosition: new THREE.Vector3(),
        keys: {}
      };
      
      // Animation mixer
      this.mixer = null;
      
      // Model and animations
      this.model = null;
      this.animations = {};
      
      // Create character entity and add components BEFORE loading model
      // Store the entity ID to ensure we always reference the same entity
      this.createCharacterEntity();
      
      // Set up input listeners
      this.setupInputListeners();
      
      // Load character model and animations
      this.loadCharacterModel();
      
      // Clock for animation and updates
      this.clock = new THREE.Clock();
  }

  createCharacterEntity() {
    // Create character entity
    this.characterEntity = this.world.createEntity();
    
    // Create components and store direct references
    this.renderComponent = new RenderComponent();
    this.transformComponent = new TransformComponent();
    this.characterComponent = new CharacterComponent();
    this.movementComponent = new MovementComponent();
    
    
    // Add components to entity
    this.characterEntity.addComponent(this.renderComponent);
    this.characterEntity.addComponent(this.transformComponent);
    this.characterEntity.addComponent(this.characterComponent);
    this.characterEntity.addComponent(this.movementComponent);
   
    // Store the entity ID for consistent reference
    this.characterEntityId = this.characterEntity.id;

  }
  
  create() {
    // Add plane geometry as the floor
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    plane.receiveShadow = true;
    this.scene.add(plane);
  }

  // Helper method to get the character entity using the stored ID
  getCharacterEntity() {
    // If we have a stored ID, find the entity by ID
    if (this.characterEntityId !== undefined) {
      // Find the entity in the world by its ID
      const entity = this.world.entities.find(e => e.id === this.characterEntityId);
      if (entity) {
        return entity;
      } else {
        console.error(`[Game] Could not find entity with ID ${this.characterEntityId}`);
      }
    }
    
    // Fallback to the direct reference (though this might be stale)
    return this.characterEntity;
  }
  
  update() {
    // Get delta time
    const deltaTime = this.clock.getDelta() / 2;
    
    // Update animation mixer
    if (this.mixer) {
      // Only log mixer updates occasionally to avoid console spam
      const shouldLog = Math.random() < 0.01; // Log approximately 1% of updates
      
      if (shouldLog) {
        console.log(`[Game] Updating mixer with deltaTime: ${deltaTime.toFixed(4)}`);
        console.log(`[Game] Mixer stats:`, {
          time: this.mixer.time,
          timeScale: this.mixer.timeScale,
          hasActiveTracks: this.mixer._actions && this.mixer._actions.length > 0
        });
      }
      
      this.mixer.update(deltaTime);
      
      if (shouldLog && this.characterComponent) {
        console.log(`[Game] Current animation state: ${this.characterComponent.stateMachine.currentState}`);
        console.log(`[Game] Current animation: ${this.characterComponent.currentAnimation}`);
      }
    } else {
      console.warn('[Game] No mixer available for update');
    }
    
    // Update character components with input using direct references
    
    // Update character component (animations)
    if (this.characterComponent) {
      this.characterComponent.update(deltaTime, this.input);
    } else {
      console.warn('[Game] CharacterComponent not available during update');
    }
    
    // Update movement component (position/rotation)
    if (this.movementComponent && this.model) {
      this.movementComponent.update(deltaTime, this.input, this.model);
    } else if (!this.movementComponent) {
      console.warn('[Game] MovementComponent not available during update');
    } else if (!this.model) {
      console.warn('[Game] Model not available for MovementComponent update');
    }
    
 
    // Update world systems
    this.world.update(deltaTime);
  }
  
  setupInputListeners() {
    // Keyboard state
    this.keys = {};
    
    // Set up keyboard listeners
    window.addEventListener('keydown', (event) => {
      this.keys[event.key.toLowerCase()] = true;
      this.updateInputState();
    });
    
    window.addEventListener('keyup', (event) => {
      this.keys[event.key.toLowerCase()] = false;
      this.updateInputState();
    });
    
    // Mouse click for movement target
    window.addEventListener('click', (event) => {
      // Convert screen position to world position (simplified)
      // In a real implementation, you'd use raycasting to find the click point on the ground
      console.log('Click detected');
      
      // Example: trigger dance animation on click
      if (this.characterEntity) {
        const characterComponent = this.characterEntity.getComponent(CharacterComponent);
        if (characterComponent) {
          characterComponent.changeState('dance');
        }
      }
    });
  }
  
  updateInputState() {
    // Update movement state based on WASD keys
    const isW = this.keys['w'] || false;
    const isA = this.keys['a'] || false;
    const isS = this.keys['s'] || false;
    const isD = this.keys['d'] || false;
    
    // Character is moving if any movement key is pressed
    const wasMoving = this.input.isMoving;
    this.input.isMoving = isW || isA || isS || isD;
    
    // Character is running if shift is held
    const wasRunning = this.input.isRunning;
    this.input.isRunning = this.keys['shift'] || false;
    
    // Update the input.keys object
    this.input.keys = { ...this.keys };
    
    // Only log when state changes to avoid console spam
    if (wasMoving !== this.input.isMoving || wasRunning !== this.input.isRunning) {
      console.log(`Input state changed: moving=${this.input.isMoving}, running=${this.input.isRunning}`);
      
      // Force state update on character component when movement state changes
      if (this.characterEntity) {
        const characterComponent = this.characterEntity.getComponent(CharacterComponent);
        if (characterComponent) {
          if (this.input.isMoving && !wasMoving) {
            characterComponent.changeState(this.input.isRunning ? 'run' : 'walk');
          } else if (!this.input.isMoving && wasMoving) {
            characterComponent.changeState('idle');
          } else if (this.input.isMoving && this.input.isRunning !== wasRunning) {
            characterComponent.changeState(this.input.isRunning ? 'run' : 'walk');
          }
        }
      }
    }
  }
  
  loadCharacterModel() {
    const fbxLoader = new FBXLoader();
    
    console.log('[Game] Loading character model...');
    fbxLoader.load(
      './public/CharacterModel/models/model.fbx',
      (fbx) => {
        console.log('[Game] Character model loaded successfully');
        
        // Set up the model
        this.model = fbx;
        this.model.scale.setScalar(0.01); // Scale down the model
        this.model.position.set(0, 0, 0); // Position at origin
        
        // Add to scene
        this.scene.add(this.model);
        console.log('[Game] Model added to scene');
        
        // Create animation mixer
        this.mixer = new THREE.AnimationMixer(this.model);
        console.log('[Game] Animation mixer created:', this.mixer);
        
        // Connect to character component using direct references
        console.log('[Game] Connecting to character components using direct references');
        
        // Set animation mixer on character component
        if (this.characterComponent) {
          console.log('[Game] Setting animation mixer on CharacterComponent');
          this.characterComponent.setAnimationMixer(this.mixer);
        } else {
          console.error('[Game] CharacterComponent reference not available');
        }
        
        // Connect the model to the render component
        if (this.renderComponent) {
          console.log('[Game] Setting model on RenderComponent');
          this.renderComponent.setObject3D(this.model);
        } else {
          console.error('[Game] RenderComponent reference not available');
        }
        
        // Update transform component with model position
        if (this.transformComponent) {
          console.log('[Game] Updating TransformComponent with model transform');
          this.transformComponent.setPosition(this.model.position);
          this.transformComponent.setRotation(this.model.rotation);
          this.transformComponent.setScale(this.model.scale);
        } else {
          console.error('[Game] TransformComponent reference not available');
        }
        
        // Load animations
        this.loadAnimations();
      },
      (progress) => {
        console.log('Loading model: ' + (progress.loaded / progress.total * 100) + '%');
      },
      (error) => {
        console.error('Error loading character model:', error);
      }
    );
  }
  
  loadAnimations() {
    const fbxLoader = new FBXLoader();
    const animations = [
      { name: 'idle', path: './public/CharacterModel/models/idle.fbx' },
      { name: 'walk', path: './public/CharacterModel/models/walk.fbx' },
      { name: 'run', path: './public/CharacterModel/models/run.fbx' },
      { name: 'dance', path: './public/CharacterModel/models/dance.fbx' }
    ];
    
    console.log('[Game] Starting to load animations:', animations.map(a => a.name));
    
    let loadedCount = 0;
    let idleClipLoaded = false;
    
    animations.forEach(animation => {
      console.log(`[Game] Loading animation: ${animation.name} from ${animation.path}`);
      
      fbxLoader.load(
        animation.path,
        (animFbx) => {
          console.log(`[Game] Animation ${animation.name} loaded successfully`);
          
          // Get the animation clip
          const clip = animFbx.animations[0];
          if (clip) {
            console.log(`[Game] Found animation clip in ${animation.name}:`, clip);
            
            // Rename the clip to match our state names
            clip.name = animation.name;
            
            // Add to character component using direct reference
            if (this.characterComponent) {
              console.log(`[Game] Adding ${animation.name} animation to CharacterComponent`);
              this.characterComponent.addAnimation(animation.name, clip);
              
              // If this is the idle animation, play it immediately
              if (animation.name === 'idle' && !idleClipLoaded) {
                console.log('[Game] Playing idle animation immediately');
                this.characterComponent.playAnimation('idle');
                idleClipLoaded = true;
                
                // Force mixer update to ensure animation starts playing
                if (this.mixer) {
                  console.log('[Game] Forcing initial mixer update');
                  this.mixer.update(0.01);
                }
              }
            } else {
              console.error('[Game] CharacterComponent reference not available when adding animation');
            }
            
            // Check if all animations are loaded
            loadedCount++;
            console.log(`[Game] Animation ${animation.name} processed. ${loadedCount}/${animations.length} loaded`);
            
            if (loadedCount === animations.length) {
              console.log('[Game] All animations loaded');
              // Explicitly set idle state using direct component reference
              if (this.characterComponent) {
                console.log('[Game] Setting initial state to idle');
                
                // Make sure the state machine is properly initialized
                this.characterComponent.stateMachine.currentState = 'idle';
                
                // Explicitly call changeState to trigger the enter handler
                this.characterComponent.changeState('idle');
                
                // Force mixer update again after all animations are loaded
                if (this.mixer) {
                  console.log('[Game] Forcing final mixer update after all animations loaded');
                  this.mixer.update(0.01);
                  
                  // Additional debug info
                  console.log('[Game] Animation state after initialization:', {
                    currentState: this.characterComponent.stateMachine.currentState,
                    currentAnimation: this.characterComponent.currentAnimation,
                    hasAnimations: Object.keys(this.characterComponent.animations).length > 0,
                    animationNames: Object.keys(this.characterComponent.animations)
                  });
                }
              } else {
                console.error('[Game] CharacterComponent reference not available when setting initial state');
              }
            }
          } else {
            console.warn(`[Game] No animation found in ${animation.path}`);
            console.log('[Game] FBX content:', animFbx);
          }
        },
        (progress) => {
          const percent = Math.round(progress.loaded / progress.total * 100);
          console.log(`[Game] Loading ${animation.name}: ${percent}%`);
        },
        (error) => {
          console.error(`[Game] Error loading ${animation.name} animation:`, error);
        }
      );
    });
  }
}

export { Game };

