# Lagrangian Pendulum

The Lagrangian Function is equal to the difference between the Kinetic and Potential energy.

$$L=T-V$$

Where $L$ is the Lagrangian function, and $T$ is the Kinetic energy, and $V$ is the potential energy.

For a simple pendulum, the Kinetic energy, $T$, is:

$$T = \frac{1}{2}ml^2 \dot{\theta} ^2$$

Where $\dot{\theta}$ is the initial angular velocity, $m$ is the mass of the bob on the pendulum, and $l$ is the length.

For a simple pendulum, the Potential energy, $V$, is:
$$V = -mgl \cos(\theta)$$

Where $g$, is the gravitational acceleration constant, $m$ is the mass of the bob, $l$, is the length, and $\theta$ is the angle of initial starting position.


So that leaves us with:
$$L = \frac{1}{2}ml^2\dot{\theta}^2 - (-mgl \cos(\theta) )$$ 
$$L = \frac{1}{2}ml^2\dot{\theta}^2 + mgl \cos(\theta)$$

## The Euler-Lagrange Equation

$$\frac{d}{dt} \frac{\partial L}{\partial \dot\theta} - \frac{\partial L}{\partial \theta} = 0$$

In Statistical Mechanics, this Lagrangian equation is fit for arbirary velocities and coordinates of particles.


$$\frac{d}{dt} \frac{\partial L}{\partial \dot q_i} - \frac{\partial L}{\partial q_i} = 0 \ \ \  (1...f)$$
Where $\dot q_i...\dot q_f$ are arbitrary velocities, and $q_i...q_f$ are abitrary positions of a system with $f$ degrees of freedom; the number of parameters needed to describe the energy of a system. In the case where we have only $xyz$, or three, translational degrees of freedom arising from the motion of the particles, we can consider it a Monatomic Gas e.g., Helium, Argon. 

Now, we can substitute the Lagrangian into the Euler-Lagrange equation.

$$L = \frac{1}{2}ml^2\dot{\theta}^2 - (- mgl \cos(\theta)) $$
and t
$$\frac{d}{dt} \frac{\partial L}{\partial \dot\theta} - \frac{\partial L}{\partial \theta} = 0$$

goes to 

$$ \frac{d}{dt} \frac{\partial L}{\partial \dot\theta} - \frac{\partial L}{\partial \theta} = ml^2 \ddot \theta + mgl \sin(\theta) = $$

Divide through by $ml^2$
$$\ddot \theta + \frac{g}{l} \sin \theta = 0$$

and so
$$\ddot \theta = -\frac{g}{l} \sin \theta $$


```
  update(delta) {
    // Euler's method to update theta and thetaDot based on the Lagrangian equations of motion
    const thetaDotDot = -(this.g / this.l) * Math.sin(this.theta);
    this.thetaDot += thetaDotDot * delta;
    this.theta += this.thetaDot * delta;
  }
```