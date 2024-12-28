# Local vs. World


**` `** 


## Coordinate Spaces
The **`positionLocal`** is the object's material's local coordinate space. The object's geometry may be adjusted, but that doesn't change the positionLocal of the material.

Now, you could adjust the **`positionLocal`** of the material - youre basically displacing the whole visual pipeline, such that it appears based on the adjustment of the positionLocal. 

For example, you could have a sphere geometry initialized at 0,0,0, along with a material. Then you adjust the positionLocal of the material by adding a vec3(1,0,0), essentially *displacing* the material one unit *x*. The geometry is still at 0,0,0, but the displaced material shader (which really is the culmination of the whole visual pipeline) will make it *look* like the sphere has moved to 1,0,0. 

