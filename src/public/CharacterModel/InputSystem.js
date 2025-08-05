/**
 * InputSystem - Processes input events and updates InputComponents
 */
import { System } from './core/system.js';
import { InputComponent } from './InputComponent.js';

export class InputSystem extends System {
    constructor(renderer) {
        super();
        this.renderer = renderer;
        this.setupInputListeners();
    }

    /**
     * Set up DOM event listeners for input
     */
    setupInputListeners() {
        // Keyboard input
        window.addEventListener('keydown', (event) => {
            this.handleKeyEvent(event.key.toLowerCase(), true);
        });

        window.addEventListener('keyup', (event) => {
            this.handleKeyEvent(event.key.toLowerCase(), false);
        });

        // Mouse input for click-to-move (if needed)
        if (this.renderer) {
            this.renderer.domElement.addEventListener('click', (event) => {
                this.handleMouseClick(event);
            });
        }
    }

    /**
     * Handle keyboard events
     * @param {string} key - The key that was pressed/released
     * @param {boolean} isPressed - Whether the key was pressed (true) or released (false)
     */
    handleKeyEvent(key, isPressed) {
        console.log(this.world)
        // Process all entities with InputComponent
        this.world.getEntitiesWithComponent(InputComponent).forEach(entity => {
            const inputComponent = entity.getComponent(InputComponent);
            inputComponent.setKey(key, isPressed);
        });
    }

    /**
     * Handle mouse click events for click-to-move
     * @param {MouseEvent} event - The mouse event
     */
    handleMouseClick(event) {
        // This would be implemented if click-to-move is needed
        // For now, it's a placeholder for future functionality
    }

    /**
     * Update method called each frame
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Any per-frame input processing can be done here
        // For example, gamepad input or continuous input checks
    }
}
