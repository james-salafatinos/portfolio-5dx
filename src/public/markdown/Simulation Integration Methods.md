## **Introduction**


When simulating $N$-body systems, we aim to numerically solve the equations of motion for a set of particles interacting under some force law (e.g., a gravitational $(1/r^2)$ attraction). The core challenge is how to step forward in time accurately and efficiently while maintaining numerical stability.

There are typically three we look at.

- **Semi-implicit (Sympaletic) Euler Integration** (the simplest, first-order method)  
- **Verlet Integration** (a widely used method in molecular dynamics, known for good stability and energy conservation properties)
- **Runge–Kutta (RK4) Integration** (a more accurate, fourth-order method)    


### **Comparison Table**

| **Feature**                 | **Semi-implicit (Sympaletic) Euler**                                           | **Runge–Kutta (RK4)**                                                                            | **Verlet**                                                                                 |
|-----------------------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| **Order of Accuracy**       | 1st-order                                           | 4th-order                                                                                        | 2nd-order (but symplectic)                                                                 |
| **Implementation Complexity** | Easiest (1 force evaluation/step)                 | Moderate (4 force evaluations/step + more code)                                                  | Moderate (2 force evaluations/step, half-step approach)                                    |
| **Stability & Energy**      | Least stable, can drift significantly              | Quite stable, but can still drift for very long simulations                                      | Generally good at conserving energy over long intervals (popular for orbital/molecular)   |
| **Computational Cost**      | Low (fast)                                         | Higher (needs 4x more force calculations per timestep)                                           | Moderate (2 force calculations per timestep)                                              |
| **Code Requirements**       | Minimal (just update $\mathbf{v}$ and $\mathbf{p}$) | More lines of code to handle k1, k2, k3, k4                                                       | Requires storing old accelerations or positions, plus half-step logic                      |                                           |
| **Best Use Cases**          | Quick tests, small timesteps, or simple prototypes | Problems requiring higher accuracy per step (e.g., stiff ODEs or sensitive chaotic systems)       | Long-term simulations where energy conservation and stability are crucial                  |

---


### **Semi-implicit (Sympaletic) Euler Integration**

1. **Overview**  
   Euler integration is the most straightforward numerical integration approach. Given position $p_i$ and velocity $v_i$ at time $t$, one updates:



    $v_{t+1} = v_t + a_t \Delta t$

    $p_{t+1} = p_t + v_{t+1} \Delta t$

    In computer graphics $\Delta t$ is going to be the animation frame rate or simulation time step -- in this code I've slowed time down with a `timeScale` parameter.

2. **In Code**
   ```javascript
      velocity_i.add(forceAccumulator.divideScalar(this.timeScale)); // Update velocity
      
      position_i.add(velocity_i); // Update position
   ```

3. **Advantages**  
   - Easiest to implement and understand.  
   - Fastest computationally (single evaluation per step).  
   - Good for quick prototypes or where high precision is not critical.

4. **Drawbacks**  
   - Least accurate of the three methods (first-order).  
   - Can exhibit significant numerical error or “energy drift,” especially in long-term simulations.  
   - Requires very small time steps ($\Delta t$) for stability.

---

### **Runge–Kutta (RK4) Integration**

1. **Overview**  
   Runge–Kutta methods are more advanced and accurate than Euler. They approximate the state at multiple sub-steps within each timestep, then combine those sub-steps into a single better approximation for $p_{i}(t+\Delta t)$ and $v_i(t+\Delta t)$.


    Runge-Kutta 4th order (often just “RK4”) is a higher-accuracy method. Conceptually, it takes four “guesses” (k1, k2, k3, k4) at where the solution is heading and then combines them:
     $$
     \mathbf{v}(t+\Delta t) 
       = \mathbf{v}(t) + \tfrac{1}{6} \left( k_1 + 2k_2 + 2k_3 + k_4 \right)
     $$

     $$
     \mathbf{p}(t+\Delta t) 
       = \mathbf{p}(t) + \tfrac{1}{6} \left( k_1 + 2k_2 + 2k_3 + k_4 \right)
     $$

     $$
        k_1 = f(\mathbf{x}_n) $$$$
        k_2 = f\Bigl(\mathbf{x}_n + \frac{1}{2}k_1 \Delta t\Bigr) $$$$
        k_3 = f\Bigl(\mathbf{x}_n + \frac{1}{2}k_2 \Delta t\Bigr) $$$$
        k_4 = f\Bigl(\mathbf{x}_n + k_3 \Delta t\Bigr) $$$$
     $$

    $$ x_{n+1} = \mathbf{x}_n + \frac{1}{6} (k_1 + 2k_2 + 2k_3 + k_4),\Delta t$$

  


2. **In Code**
   ```javascript
   for (let i = 0; i < this.numParticles; i++) {
      const position = this.particlePositions[i].clone();
      const velocity = this.particleVelocities[i].clone();
      velocity.multiplyScalar(this.dampening);

      // 1st evaluation
      const k1_v = this.computeForces(position).divideScalar(this.timescale);
      const k1_p = velocity.clone();

      // 2nd evaluation
      const k2_v = this.computeForces(
        position.addScaledVector(k1_p, half_dt)
      ).divideScalar(this.timescale);
      const k2_p = velocity.addScaledVector(k1_v, half_dt);

      // 3rd evaluation
      const k3_v = this.computeForces(
        position.addScaledVector(k2_p, half_dt)
      ).divideScalar(this.timescale);
      const k3_p = velocity.addScaledVector(k2_v, half_dt);

      // 4th evaluation
      const k4_v = this.computeForces(
        position.addScaledVector(k3_p, dt)
      ).divideScalar(this.timescale);
      const k4_p = velocity.addScaledVector(k3_v, dt);

      // Update velocity
      velocity.addScaledVector(
        k1_v.add(k2_v.multiplyScalar(2)).add(k3_v.multiplyScalar(2)).add(k4_v),
        dt / 6
      );
      this.particleVelocities[i].copy(velocity);

      // Update position
      position.addScaledVector(
        k1_p.add(k2_p.multiplyScalar(2)).add(k3_p.multiplyScalar(2)).add(k4_p),
        dt / 6
      );
      this.particlePositions[i].copy(position);

      // Update instanced attribute data
      const index = i * 3;
      offsets[index] = position.x;
      offsets[index + 1] = position.y;
      offsets[index + 2] = position.z;
    }

   ```

1. **Advantages**  
   - More accurate for the same step size compared to Euler.  
   - Fourth-order method: errors scale with $\Delta t^4$ in each step.  
   - Widely used for problems where higher accuracy is needed but computational cost must still be manageable.

2. **Drawbacks**  
   - More computationally expensive than Euler (requires 4 force evaluations per step).  
   - Still not as “energy-preserving” as symplectic methods (like Verlet) in very long-term simulations of orbital mechanics.

---

### **Velocity Verlet Integration**

1. **Overview**  
   Verlet and its variants (Velocity Verlet, Leapfrog, etc.) are favored in molecular dynamics and orbital mechanics because they conserve energy better over long time spans. A simplified Velocity Verlet approach updates positions and velocities in half-steps, effectively using an average of accelerations at the beginning and end of the interval.

2. **Math or Physics Implementation per Textbook**  
   - Textbook Velocity Verlet steps:  
     \[
     \mathbf{p}(t + \Delta t) 
       = \mathbf{p}(t) 
       + \mathbf{v}(t)\Delta t 
       + \frac12 \mathbf{a}(t)\Delta t^2
     \]
     \[
     \mathbf{v}(t + \Delta t) 
       = \mathbf{v}(t) 
       + \frac12 [\mathbf{a}(t) + \mathbf{a}(t + \Delta t)] \Delta t
     \]
   - The code closely mirrors these textbook steps in its update function.

3. **Key Implementation Details**  
   - **Acceleration Computation**: Each particle’s acceleration is computed from the sum of forces.  
   - **Half-Step Position Update**: `position[i] += velocity[i] + 0.5 * acceleration[i]`.  
   - **Recompute New Acceleration**: After updating positions, the code computes the new accelerations.  
   - **Half-Step Velocity Update**: The velocity is updated using the average of old and new accelerations.  
   - **Dampening**: Like the other codes, there’s a multiply by `this.dampening` to curb velocity growth.  

4. **Advantages**  
   - **Symplectic**: Better long-term energy behavior, making it suitable for orbital mechanics and molecular dynamics.  
   - Usually more stable than Euler for the same step size.  

5. **Drawbacks**  
   - Requires storing additional data (previous positions or accelerations).  
   - Although more stable, it can be slightly less precise per step than RK4 if you need high short-term accuracy.  
   - More complicated to implement than Euler.

---

## 3. **Comparison Table**

| **Feature**                 | **Euler**                                           | **Runge–Kutta (RK4)**                                                                            | **Verlet**                                                                                 |
|-----------------------------|-----------------------------------------------------|--------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| **Order of Accuracy**       | 1st-order                                           | 4th-order                                                                                        | 2nd-order (but symplectic)                                                                 |
| **Implementation Complexity** | Easiest (1 force evaluation/step)                 | Moderate (4 force evaluations/step + more code)                                                  | Moderate (2 force evaluations/step, half-step approach)                                    |
| **Stability & Energy**      | Least stable, can drift significantly              | Quite stable, but can still drift for very long simulations                                      | Generally good at conserving energy over long intervals (popular for orbital/molecular)   |
| **Computational Cost**      | Low (fast)                                         | Higher (needs 4x more force calculations per timestep)                                           | Moderate (2 force calculations per timestep)                                              |
| **Code Requirements**       | Minimal (just update $\mathbf{v}$ and $\mathbf{p}$) | More lines of code to handle k1, k2, k3, k4                                                       | Requires storing old accelerations or positions, plus half-step logic                      |
| **Textbook Correctness**    | Matches standard Euler steps                        | Matches standard RK4 derivations                                                                 | Matches standard (Velocity) Verlet steps                                                   |
| **Best Use Cases**          | Quick tests, small timesteps, or simple prototypes | Problems requiring higher accuracy per step (e.g., stiff ODEs or sensitive chaotic systems)       | Long-term simulations where energy conservation and stability are crucial                  |

---

**Are They Implemented Mathematically Correct per Textbooks?**  
- **Euler**: Yes, it follows the canonical $ \mathbf{v} \leftarrow \mathbf{v} + \mathbf{a}\Delta t,\; \mathbf{p} \leftarrow \mathbf{p} + \mathbf{v}\Delta t $ approach.  
- **Runge–Kutta (RK4)**: Yes, the four sub-steps (k1 to k4) are classic textbook RK4.  
- **Verlet**: Yes, the code does the standard two half-steps for position and velocity, consistent with Velocity Verlet formulations.

Overall, each method in these scripts aligns well with standard textbook formulations. The differences mainly lie in how each handles multiple evaluations (RK4) or half-step updates (Verlet). 

---

**Answer in Short**:  
1. All three files correctly implement their respective textbook integration methods (Euler, Runge–Kutta 4, Verlet).  
2. Euler is straightforward but less accurate; RK4 is more accurate but requires more computation; Verlet is often a sweet spot for physics simulations where energy conservation is critical.