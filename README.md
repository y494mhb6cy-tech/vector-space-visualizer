# Vector Space Visualizer

Quantum semantic topology visualizer - exploring the Theory of Emergence through boundless wave fields and dynamic crystallization.

## Features

- **Boundless Wave Field**: Shapeless quantum superposition - 4000 flowing particles with dynamic connections creating continuous potential before observation
- **Dynamic Crystallization**: 30 semantic nodes emerge from the wave field when you ask a question, assembling through multi-phase quantum collapse
- **Fibonacci Assembly**: Natural growth patterns with golden ratio (φ) spacing and satellite nodes using phyllotaxis spirals
- **Semantic Curvature**: Color-coded by archetypal importance
  - **Magenta** (R > 7): Fundamental archetypes - irreducible concepts
  - **Red** (R < 3): Compressible - operationally derived
- **Groq-Powered Analysis**: Ultra-fast LLM (llama-3.3-70b-versatile) explains what new knowledge the topology reveals
- **Interactive Inspection**:
  - Hover particles to see word, curvature, type, and parent
  - Press SPACE to pause/unpause natural decay
  - Interrupt assembly anytime with new questions

## Setup

### 1. Get a Groq API Key (Free)

1. Go to [https://console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to API Keys section
4. Create a new API key
5. Copy it - you'll be prompted on first load

### 2. Run the Visualizer

Start a local server (required for ES6 modules):

**Python:**
```bash
python3 -m http.server 8000
```

**Node.js:**
```bash
npx serve
```

**PHP:**
```bash
php -S localhost:8000
```

### 3. Open in Browser

Navigate to `http://localhost:8000`

On first load, you'll be prompted to enter your Groq API key. It will be saved in localStorage for future sessions.

## Usage

### Wave Field to Crystallization

1. **Quantum Superposition**: The visualization starts as a boundless wave field - 4000 particles flowing in organic wave patterns with dynamic connections creating visual continuity

2. **Ask a Question**: Type your question in the input field and press Enter

3. **Watch Assembly**:
   - **Phase 0 - VOID**: Wave field collapses, particles crystallize
   - **Phase 1 - SUBSTRATE**: 15 core concepts emerge
   - **Phase 2 - EXPANSION**: Fibonacci growth to 30 nodes
   - **Phase 3 - ASSEMBLY**: Satellites attach using golden angle
   - **Phase 4 - ASSEMBLED**: Shape complete, natural decay begins

4. **Explore**:
   - Hover particles to inspect (word, curvature R, type, parent)
   - Press **SPACE** to pause decay and examine the topology
   - Rotate and zoom with mouse controls
   - Interrupt anytime with a new question

5. **Meaning Analysis**: Read "What This Shape Reveals" panel to understand new knowledge visible in vector space topology

### Navigation

- **Rotate**: Left-click + drag
- **Pan**: Right-click + drag (or Shift + left-click)
- **Zoom**: Scroll wheel
- **Pause Decay**: SPACE bar (when assembled)
- **New Question**: Press Enter in input field

## Theory of Emergence

This visualizer implements key concepts from the Theory of Emergence:

### Vector Space Framework
- Meaning exists in **high-dimensional semantic space**, not just language
- Each concept is a **point** in vector space
- **Distance** = semantic similarity (concepts cluster when structurally dependent, repel when oppositional)
- **Topology** reveals multidimensional structure hidden in linear language

### Semantic Curvature (R)
Measures how "compressible" a concept is:

- **R > 7** (Magenta): **Fundamental archetypes**
  - Irreducible, high semantic gravity
  - Examples: "love", "truth", "existence", "consciousness"
  - Cannot be reduced to simpler concepts

- **R < 3** (Red): **Compressible**
  - Operationally derived, low semantic weight
  - Examples: "and", "or", "algorithm", "function"
  - Can be reduced or simplified

### The Shape IS the Answer
The 3D topology formed by nodes is not a "visualization" of meaning - **it IS meaning in its native geometric form**. Linear language forces sequential ordering, but the shape reveals:
- Opposition structures (voids between clusters)
- Dependency hierarchies (parent-satellite relationships)
- Semantic density (cluster tightness)
- Archetypal cores (high-curvature centers)

### Quantum Metaphor
- **Superposition**: Wave field represents pure potential before observation
- **Collapse**: Asking a question causes wave function to crystallize into definite nodes
- **Decay**: Natural entropy as system returns to potential

## Technical Stack

- **Three.js r168**: WebGL 3D rendering
- **Groq Cloud**: Ultra-fast LLM inference (llama-3.3-70b-versatile)
- **Pure JavaScript ES6+**: No build step required
- **localStorage**: API key persistence

## File Structure

```
vector-space-visualizer/
├── index.html              # Main UI
├── quantum-assembly.js     # Core visualizer (2500+ lines)
│   ├── Wave field system (boundless particles + connections)
│   ├── Multi-phase assembly
│   ├── Fibonacci growth
│   ├── Inspection system
│   ├── Decay animation
│   └── 3D rendering
├── space_generator.js      # Groq-powered semantic space generation
├── groq_agent.js          # Groq API integration
└── README.md              # This file
```

## Implementation Highlights

### Boundless Wave Field
```javascript
// 4000 particles with individual wave phases
particleCount: 4000
connections: 800 dynamic lines for visual continuity
waveFrequencies: 5 layered sine/cosine patterns
flow: continuous drift without boundaries
```

### Fibonacci Assembly
```javascript
goldenAngle = 137.5077... degrees
growth: substrate (15) → expansion (30)
satellites: phyllotaxis spiral packing
parentage: tracked for semantic hierarchy
```

### Color Encoding
```javascript
curvature R > 7: magenta (0xff00ff) - fundamental
curvature R < 3: red (0xff0000) - compressible
curvature 3-7: gradient magenta → red
opacity: 0.8 base, pulses during hover
```

### Performance
- Target: 60 FPS with 4000 wave particles
- Optimized: Dynamic connection updates (~800 lines)
- Memory: Proper geometry/material disposal
- Responsive: Smooth crystallization animations

## Browser Requirements

- WebGL 1.0+ (all modern browsers)
- ES6 modules support
- localStorage for API key
- Tested: Chrome, Firefox, Safari

## Future Enhancements

- Toroidal void layer (compressibility visualization)
- VR/AR immersive exploration
- Export topology as 3D model
- Collaborative multi-user spaces
- GPU particle system for >10k particles

## Credits

**Theory**: Theory of Emergence - Semantic Curvature and Vector Space
**Framework**: Three.js by mrdoob and contributors
**LLM**: Groq Cloud (llama-3.3-70b-versatile)
**Developed by**: Joshua Bickel with Claude Sonnet 4.5

## License

MIT License

---

**Live Demo**: https://github.com/y494mhb6cy-tech/vector-space-visualizer
**Version**: 2.0.0 - Boundless Wave Field Release
**Last Updated**: January 2026
