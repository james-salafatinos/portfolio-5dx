# Cellular Automata on Graphs

*Part of the series **Algorithms & Emergent Phenomena on Graph Networks***

## Overview

A **cellular automaton (CA)** is one of the simplest systems capable of producing genuinely complex behaviour: a collection of cells, each holding a discrete state, all updated in lockstep according to a single local rule that looks only at a cell's immediate neighbours. The astonishing thing is that global structure — gliders, oscillators, spirals, fractals, even universal computation — emerges from rules that no individual cell "knows" about. This project lifts the CA off its usual square grid and runs it on **arbitrary graphs**: random Erdős–Rényi networks, Watts–Strogatz small-worlds, Barabási–Albert scale-free hubs, regular grids, and simple rings. The neighbourhood of a cell is no longer "the eight squares around me" but "whoever I happen to be connected to," and that single change makes the same rule behave completely differently depending on the topology underneath it.

## Historical Context

The idea was born in the late 1940s at Los Alamos. **John von Neumann**, searching for a mathematical model of *self-replication*, worked with **Stanisław Ulam**, who suggested framing the problem on a discrete grid of cells rather than with differential equations. Von Neumann's resulting self-replicating automaton used a 29-state cell on a 2D lattice and proved that a machine could, in principle, build a copy of itself — a result that predated the discovery of DNA's mechanism and remains foundational to artificial life.

CA entered popular consciousness in **1970** when mathematician **John Conway** devised the **Game of Life**: a strikingly minimal two-state rule — a dead cell with exactly 3 live neighbours is *born*, a live cell with 2 or 3 neighbours *survives*, everything else dies (the famous **B3/S23**). Popularised by Martin Gardner in *Scientific American*, Life turned out to be **Turing-complete**, capable of simulating any computation.

In the 1980s **Stephen Wolfram** systematically catalogued the space of simple 1D rules, classifying them into four behavioural classes (homogeneous, periodic, chaotic, and complex) and arguing in *A New Kind of Science* (2002) that simple programs are a better model for nature than traditional equations. Classical CA always assumed a **regular lattice**. Extending cellular automata onto **arbitrary graphs and complex networks** — where neighbourhoods are irregular and degree varies from node to node — is a comparatively **recent research frontier**, intersecting network science, dynamical systems, and the study of how topology shapes emergent computation.

## How It Works

**1. Graph construction.** We first build the network the automaton lives on. Each generator produces a set of nodes and undirected edges:

- **Random (Erdős–Rényi):** every pair of nodes is connected independently with probability *p*.
- **Small World (Watts–Strogatz):** start from a ring lattice where each node links to its *k* nearest neighbours, then randomly *rewire* each edge with probability 0.1 — yielding short path lengths but high clustering.
- **Scale Free (Barabási–Albert):** grow the network one node at a time, each new node attaching *m = 2* edges via **preferential attachment** (richer nodes get richer), producing a few high-degree **hubs**.
- **Grid:** a √N × √N lattice with 4-connectivity — the classic CA substrate.
- **Ring:** nodes on a circle, each joined to its 2 nearest neighbours.

**2. Layout.** For the irregular graphs we compute positions with **50 iterations of the Fruchterman–Reingold** force-directed algorithm: nodes repel each other (like charged particles) while edges act as springs pulling connected nodes together. The system relaxes toward a low-energy configuration, then we centre and scale it to fit the view. Grid and ring graphs use their natural geometric coordinates.

**3. Neighbour lookup.** Edges are compiled into an **adjacency list** — for each node *i*, a plain array of the indices it connects to. This is the graph analogue of "the cells around me," and it is what makes the rule topology-agnostic.

**4. Rule application & state update.** Every node holds a state in `{0, 1}` (dead / alive). A step is **synchronous**: each node counts how many of its neighbours are currently alive, the rule decides the node's *next* state, and the result is written to a **separate buffer**. Only once every node has been computed do we **swap** the buffers. This double-buffering is essential — it guarantees all nodes "see" the same snapshot of the world, exactly as a true cellular automaton requires.

The implemented rules:

| Rule | Behaviour |
|------|-----------|
| **Conway-like B3/S23** | Born with exactly 3 live neighbours; survive with 2 or 3 — Game of Life on a graph. |
| **Majority** | Alive if a strict majority of neighbours are alive — drives the system toward consensus / domains. |
| **Parity** | Flip state when an *odd* number of neighbours are alive — linear (XOR) rule, produces self-similar patterns. |
| **Custom** | Born with 2–4 live neighbours; survive with 1–3 — a more "fertile" variant that tends to fill the graph. |

## Future Applications

- **Neural network modelling.** Spiking and threshold neurons updated on a connectome are essentially graph CA; majority/threshold rules model recurrent activation and attractor dynamics.
- **Epidemiology.** Susceptible–infected–recovered dynamics are a CA on a contact graph — the natural sibling project in this series, where topology determines whether an outbreak fizzles or spreads.
- **Social network dynamics.** Opinion formation, rumour spreading, and the adoption of behaviours map onto majority and threshold rules over real social graphs, where hubs disproportionately sway the outcome.
- **Decentralised computing.** Self-organising sensor meshes and distributed consensus protocols can be designed as local update rules, with no central coordinator — robust, fault-tolerant computation emerging from purely local interactions.
- **Materials science simulation.** Crystal growth, phase separation, magnetic domain formation (Ising-like dynamics), and fracture propagation are routinely modelled as cellular automata on lattices and, increasingly, on irregular meshes.

## Controls Reference

| Control | Description |
|---------|-------------|
| **Graph Type** | Choose the network topology: Random, Small World, Scale Free, Grid, or Ring. |
| **Node Count** | Number of nodes, 20–300 (default 80). Capped at 300 for performance. |
| **Edge Probability** | Connection probability *p* for the Random (Erdős–Rényi) graph, 0–1 (default 0.08). |
| **Rule** | The update rule: Conway-like B3/S23, Majority, Parity, or Custom. |
| **Step Mode** | **Auto** advances continuously; **Manual** advances only on the Step button. |
| **Step Speed** | Steps per second in Auto mode, 1–30 (default 4). |
| **Seed %** | Fraction of nodes that start alive, 0–1 (default 0.3). |
| **Restart** | Rebuild the graph, re-layout, and re-seed the initial state. |
| **Step** | Advance the automaton by exactly one synchronous step. |

**Navigation:** the camera is locked to a top-down 2D view — **drag to pan** and **scroll to zoom**; rotation is disabled.

---

*Alive nodes glow neon cyan; dead nodes are dark. Edges are static (the topology never changes mid-run) — only the node colours update each step.*
