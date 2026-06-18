# The Method of Images

## Overview

The **method of images** is an elegant technique in electrostatics for solving
boundary-value problems involving point (or line) charges near grounded
conductors. Instead of computing the complicated induced charge distribution on
the conductor directly, you *replace the conductor with one or more fictitious
"image" charges* placed so that the boundary condition on the conductor is
automatically satisfied. The resulting two-charge (or few-charge) problem is
trivial to solve, and by the **uniqueness theorem** of electrostatics, that
solution is *the* solution in the region of interest.

The canonical example, and the one this demo visualizes, is a single point
charge $+q$ held at height $h$ above an infinite, grounded conducting plane.

---

## Historical Context

The technique was introduced by **William Thomson (Lord Kelvin) in 1848**, while
he was still in his early twenties. Kelvin recognized that the equipotential
plane lying exactly halfway between two equal-and-opposite point charges could be
*replaced* by a grounded conductor without disturbing the field on one side.
Running the logic in reverse gives the method: a charge above a grounded plane
produces the same field (above the plane) as the charge plus its mirror image.

James Clerk Maxwell later popularized and generalized the idea in his *Treatise
on Electricity and Magnetism*, extending it to spheres and other geometries.

---

## How It Works Mathematically

### The problem

We want the potential $V(\mathbf{r})$ in the region $z > 0$ given:

- a point charge $+q$ at $(0, 0, h)$,
- a grounded conducting plane at $z = 0$, so $V = 0$ everywhere on $z = 0$,
- $V \to 0$ as $\mathbf{r} \to \infty$.

In the region above the plane, $V$ obeys **Poisson's equation**:

$$\nabla^2 V = -\frac{\rho}{\varepsilon_0}$$

where the only real charge is the point charge $+q$ (so $\rho$ is a delta
function at the charge and zero elsewhere above the plane).

### The trick

Forget the conductor entirely. Place an **image charge $-q$ at $(0,0,-h)$** — the
mirror position below the plane. The potential of the two-charge system is

$$V(x,y,z) = \frac{1}{4\pi\varepsilon_0}\left[
\frac{q}{\sqrt{x^2+y^2+(z-h)^2}}
-\frac{q}{\sqrt{x^2+y^2+(z+h)^2}}\right].$$

Check the two conditions:

1. **Same Poisson equation for $z>0$.** The image charge sits at $z=-h$, *outside*
   the region of interest, so above the plane the only source is the real $+q$ —
   identical to the original problem.
2. **Same boundary condition.** On the plane $z=0$ the two distances are equal, so
   the two terms cancel and $V=0$ everywhere on $z=0$. ✓

### Why this is allowed: the uniqueness theorem

The uniqueness theorem states that a solution of Poisson's equation in a region,
satisfying the specified boundary conditions, is **unique**. Our two-charge
construction satisfies the *same* Poisson equation and the *same* boundary
conditions in $z>0$, so it **must be** the correct potential there. (Below the
plane, inside the conductor, the real field is zero — the image charge is purely a
mathematical fiction and has no validity there.)

---

## Induced Surface Charge Density

The grounded plane carries a real, induced surface charge. From the discontinuity
in the normal field at the conductor, $\sigma = -\varepsilon_0\,\partial V/\partial z\big|_{z=0}$:

$$\boxed{\;\sigma(r) = -\frac{q\,h}{2\pi\,(r^2 + h^2)^{3/2}}\;}$$

where $r=\sqrt{x^2+y^2}$ is the radial distance from the point on the plane
directly beneath the charge.

- It is **negative everywhere** (the plane is attracted by, and screens, the
  positive charge).
- It is **most negative directly below the charge** ($r=0$):
  $$\sigma_0 = -\frac{q}{2\pi h^2}.$$
- It falls off as $r^{-3}$ at large $r$.
- Integrating over the whole plane gives a **total induced charge of exactly
  $-q$** — the image charge's worth, as expected.

---

## The Force on the Charge

Because the image charge is always at distance $2h$ from the real charge and has
opposite sign, the force on $+q$ is just the Coulomb attraction to its image:

$$\boxed{\;F = -\frac{1}{4\pi\varepsilon_0}\frac{q^2}{(2h)^2}
= -\frac{q^2}{16\pi\varepsilon_0 h^2}\;}$$

In Gaussian-style units with $k = 1/4\pi\varepsilon_0$ this reads
$F = -k\,q^2/(4h^2)$, directed **toward the conductor** (attractive). The charge
is literally pulled toward the plate by the negative charge it induces.

The corresponding *energy* of the configuration is $W = -kq^2/(4h)$ — note this is
**half** the interaction energy of two real charges $\pm q$ separated by $2h$,
because the field exists only on one side of the plane.

---

## Extensions

The method is far more general than the single plane:

- **Two parallel grounded planes** → an *infinite series* of image charges
  (multiple reflections), like images between two mirrors.
- **A charge near a grounded conducting sphere** of radius $R$, with the charge a
  distance $d$ from the center: the image charge has magnitude
  $$q' = -\frac{R}{d}\,q$$
  placed at a distance $R^2/d$ from the center (along the line to the real
  charge). An *insulated, neutral* sphere needs a second image at the center to
  keep the net charge zero.
- **Line charges near cylinders**, the 2D analog, solved the same way.
- **Dielectric interfaces**, using image charges scaled by the dielectric
  contrast $(\varepsilon_1-\varepsilon_2)/(\varepsilon_1+\varepsilon_2)$.

---

## How the Demo Works

This is a 2D cross-section ($x$ horizontal, $z$ vertical) rendered with an
orthographic Three.js camera spanning $z\in[-1,1]$. The bright horizontal line is
the grounded conductor; the world's vertical coordinate plays the role of height
$z$ above the plane.

**Field-line tracing.** Field lines are integrated numerically. Starting from
points evenly spaced around the $+q$ charge, each line takes small **Euler steps**
along the local field direction

$$\mathbf{E} = kq\,\frac{\mathbf{r}_+}{|\mathbf{r}_+|^3}
            - kq\,\frac{\mathbf{r}_-}{|\mathbf{r}_-|^3},$$

where $\mathbf{r}_+$ and $\mathbf{r}_-$ point from the real and image charges to
the current position. A line stops when it reaches the conductor ($z=0$, where it
arrives perpendicular to the surface) or wanders off screen. Lines are colored by
field strength — warm white where the field is strong (near the charges) fading to
blue where it is weak.

**Equipotential contours.** The potential $V$ is sampled on a grid above the plane
and contoured with the **marching-squares** algorithm at several constant-$V$
levels. (Analytically these curves are *Apollonius circles* — for two equal and
opposite charges every equipotential is a circle whose center and radius are fixed
by the chosen potential value.) Because the contour levels are scaled with $q$,
their shapes depend only on the *geometry*, not the magnitude of the charge.

**Induced charge.** The conductor bar is tinted using $\sigma(r)$ — darkest blue
directly beneath the charge, fading to neutral gray with distance — and the curve
hanging below the line plots the $\sigma(r)$ profile directly.

**Interaction.** Drag the orange $+q$ charge anywhere above the plane. The blue
dashed image charge mirrors it in real time, and the field lines, equipotentials,
and induced-charge profile all recompute. The GUI toggles each layer and sets the
charge height, magnitude, and number of field lines.

---

## Real-World Applications

The method of images is not just a textbook curiosity — it underpins many
practical calculations:

- **PCB trace capacitance & "ground planes."** A signal trace above a ground plane
  is exactly the charge-above-conductor problem; image charges give the trace
  capacitance and characteristic impedance.
- **Transmission lines.** Overhead power lines above the (conducting) earth are
  modeled with image conductors below ground to compute capacitance and field
  profiles.
- **Electrostatic shielding & grounding.** Predicting how a grounded enclosure
  redistributes charge and screens external fields.
- **Microwave & RF cavities and waveguides.** Image charges/currents enforce the
  conducting-wall boundary conditions.
- **Scanning probe microscopy and MEMS**, where tiny charged tips interact with
  conducting substrates through their image charges.
- **Computational electromagnetics**, where image-based Green's functions
  accelerate boundary-element solvers near ground planes.
