/**
 * RenderSystem - Manages rendering of entities with RenderComponent
 */
import { System } from './core/system.js';
import { RenderComponent } from './RenderComponent.js';
import { TransformComponent } from './TransformComponent.js';

export class RenderSystem extends System {
    constructor(scene) {
        super();
        this.scene = scene;
    }

    /**
     * Update system - sync entity positions with Three.js objects
     * @param {number} deltaTime
     */
    update(deltaTime) {
        const entities = this.world.getEntitiesWithComponent(RenderComponent);
        
        entities.forEach(entity => {
            const renderComponent = entity.getComponent(RenderComponent);
            const transformComponent = entity.getComponent(TransformComponent);
            
            if (renderComponent && renderComponent.object3D && transformComponent) {
                // Sync position
                renderComponent.object3D.position.set(
                    transformComponent.position.x,
                    transformComponent.position.y,
                    transformComponent.position.z
                );
            }
        });
    }

    /**
     * Add an entity's render object to the scene
     * @param {Entity} entity
     */
    addToScene(entity) {
        const renderComponent = entity.getComponent(RenderComponent);
        if (renderComponent && renderComponent.object3D) {
            this.scene.add(renderComponent.object3D);
        }
    }

    /**
     * Remove an entity's render object from the scene
     * @param {Entity} entity
     */
    removeFromScene(entity) {
        const renderComponent = entity.getComponent(RenderComponent);
        if (renderComponent && renderComponent.object3D) {
            this.scene.remove(renderComponent.object3D);
        }
    }
}
