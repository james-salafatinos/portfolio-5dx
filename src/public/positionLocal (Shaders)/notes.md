# Local vs. World


**` `** 


## Coordinate Spaces
The **`positionLocal`** is the object's material's local coordinate space. The object's geometry may be adjusted, but that doesn't change the positionLocal of the material.

Now, you could adjust the **`positionLocal`** of the material - youre basically displacing the whole visual pipeline, such that it appears based on the adjustment of the positionLocal. 

For example, you could have a sphere geometry initialized at 0,0,0, along with a material. Then you adjust the positionLocal of the material by adding a vec3(1,0,0), essentially *displacing* the material one unit *x*. The geometry is still at 0,0,0, but the displaced material shader (which really is the culmination of the whole visual pipeline) will make it *look* like the sphere has moved to 1,0,0. 


So in this simulation, you see two spheres.

Each mesh is being rotated about the x axis at a constant rate.

The oscilating sphere is colored based on **`positionWorld`**. This means that the material is essentially offering a lens into the underlying field set in the **`World`**, regardless of its orientation onto the mesh. 

Even still, the mesh position is 0,0,0. The material shader's position node is being manipulated.

```javascript

  _createTestCustomMaterial1() {
    const material = new THREE.MeshBasicNodeMaterial();

    material.positionNode = positionLocal.add(vec3(sin(time),0,0));


    material.colorNode = vec4(positionWorld, 1);

    return material;
  }


```

The NON-oscilating sphere is colored based on **`positionLocal`**. This means that the material has 'baked' the underlying world field of color, onto its **`Local`** coordinates, matching the orientation of the mesh.

Even still, the mesh position is 0,0,0. The material shader's position node is being manipulated.

```javascript
  _createTestCustomMaterial2() {
    const material = new THREE.MeshBasicNodeMaterial();

    material.positionNode = positionLocal.add(vec3(-2,0,0));


    material.colorNode = vec4(positionLocal, 1);

    return material;
  }

```