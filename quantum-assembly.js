import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { SemanticSpaceGenerator } from './space_generator.js';

// =============================================================================
// QUANTUM SELF-ASSEMBLY VISUALIZER
// Particles exist in superposition until a question collapses them into
// a unique 3D topology. The shape IS the meaning - unprecedented and self-created.
// =============================================================================

// Global State
let scene, camera, renderer, controls, composer;
let labelRenderer; // CSS2D renderer for word labels
let particles = [];
let connections = [];
let particleTrails = [];
let wordLabels = [];
let particleState = 'SUPERPOSITION'; // SUPERPOSITION | VOID | ATTRACTION | BONDING | STABILIZATION | ASSEMBLED
let assemblyPhase = 'SUPERPOSITION';
let spaceGenerator = null;
let assemblyProgress = 0;
let shapeTopology = null;
let phaseStartTime = 0;
let potentialConnections = []; // Connections waiting to form
let currentSpace = null; // Store generated space data
let previousQuestion = null;
let assemblyTimestamp = 0;
let decayStartTime = 0;
let isDecaying = false;
let decayPaused = false; // Allow inspection without decay
let hoveredParticle = null;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();

// Toroidal Void Layer
let toroidalElements = [];
let attractionParticles = [];
let voidSphere = null;
let particleAnimationIntervals = [];

// Wave Field (Superposition State)
let waveField = null;
let waveMesh = null;
let waveTime = 0;

// Visual Parameters
const PARTICLE_COUNT = 200;
const BOUNDARY_RADIUS = 25;
const PARTICLE_SIZE = 0.15;
const GLOW_INTENSITY = 1.5;
const CONNECTION_THRESHOLD = 3.0;
const TRAIL_LENGTH = 20;
const TRAIL_ENABLED = true;

// Fibonacci Growth Parameters
const GOLDEN_ANGLE = 137.5077640; // Golden angle in degrees (137.5°)
const GOLDEN_RATIO = 1.618033988749895; // φ (phi)
const FIBONACCI_SCALE = 0.5; // Scaling factor for spiral growth

// Context Decay Parameters
const CONTEXT_DECAY_START = 30000; // Start decay after 30 seconds
const CONTEXT_DECAY_DURATION = 45000; // Full decay over 45 seconds
const CONTEXT_INFLUENCE = 0.6; // How much previous question influences next (60%)

// Colors
const COLORS = {
    particle: 0x00ffff,
    particleGlow: 0x0088ff,
    connection: 0x44aaff,
    background: 0x000205
};

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
    console.log('Initializing Quantum Assembly Visualizer...');

    try {
        setupScene();
        setupCamera();
        setupRenderer();
        setupPostProcessing();
        setupControls();
        setupLights();

        createParticleSystem();
        enterSuperposition();

        setupEventListeners();

        document.getElementById('loading').style.display = 'none';
        animate();

        console.log('Ready. Wave field in superposition — nodes exist as pure potential.');
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('loading').innerHTML = '<h1 style="color: #ff0000;">ERROR</h1><p style="color: #fff; margin-top: 20px;">' + error.message + '</p>';
    }
}

function setupScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.background);
    scene.fog = new THREE.FogExp2(COLORS.background, 0.02);
}

function setupCamera() {
    camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 40);
    camera.lookAt(0, 0, 0);
}

function setupRenderer() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    // CSS2D renderer for word labels
    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    document.body.appendChild(labelRenderer.domElement);
}

function setupPostProcessing() {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,  // strength
        0.4,  // radius
        0.85  // threshold
    );
    composer.addPass(bloomPass);
}

function setupControls() {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 100;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
}

function setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00ffff, 1, 100);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
}

// =============================================================================
// PARTICLE SYSTEM
// =============================================================================

function createParticleSystem() {
    console.log(`Creating ${PARTICLE_COUNT} quantum particles...`);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const particle = createParticle();
        particles.push(particle);
        scene.add(particle.mesh);
    }
}

function createParticle() {
    // Glowing particle with bloom
    const geometry = new THREE.SphereGeometry(PARTICLE_SIZE, 16, 16);
    const material = new THREE.MeshStandardMaterial({
        color: COLORS.particle,
        emissive: COLORS.particleGlow,
        emissiveIntensity: GLOW_INTENSITY,
        metalness: 0.3,
        roughness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);

    // Random position in sphere
    const phi = Math.random() * Math.PI * 2;
    const theta = Math.random() * Math.PI;
    const r = Math.random() * BOUNDARY_RADIUS;

    mesh.position.set(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta)
    );

    // Random velocity for Brownian motion
    const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1
    );

    // Create particle trail
    const trail = createParticleTrail();
    if (trail) {
        scene.add(trail.line);
        particleTrails.push(trail);
    }

    return {
        mesh: mesh,
        velocity: velocity,
        targetPosition: null,
        id: Math.random().toString(36),
        trail: trail,
        positionHistory: []
    };
}

function createParticleTrail() {
    if (!TRAIL_ENABLED) return null;

    const positions = new Float32Array(TRAIL_LENGTH * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
        color: COLORS.particleGlow,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        linewidth: 1
    });

    const line = new THREE.Line(geometry, material);

    return {
        line: line,
        positions: positions,
        index: 0
    };
}

// =============================================================================
// WAVE FIELD - Quantum Potential Visualization
// =============================================================================

function createWaveField() {
    console.log('🌊 Creating boundless wave field...');

    // Create shapeless particle cloud - pure flowing potential
    const particleCount = 4000;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const velocities = new Float32Array(particleCount * 3);
    const phases = new Float32Array(particleCount);

    // Initialize particles in boundless distribution
    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Distributed across flowing space - no rigid boundaries
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        const r = 5 + Math.random() * 15; // Varied radial spread

        // Position with organic offset
        positions[i3] = r * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * 5;
        positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * 10;
        positions[i3 + 2] = r * Math.cos(phi) + (Math.random() - 0.5) * 5;

        // Color variation - cyan to white gradients
        const brightness = 0.3 + Math.random() * 0.7;
        const warmth = Math.random() * 0.3;
        colors[i3] = warmth * brightness;           // R: subtle warm tones
        colors[i3 + 1] = (0.7 + warmth) * brightness; // G: cyan to white
        colors[i3 + 2] = brightness;                // B: full presence

        // Varied particle sizes for depth
        sizes[i] = 0.05 + Math.random() * 0.25;

        // Random flow velocities
        velocities[i3] = (Math.random() - 0.5) * 0.03;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.03;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.03;

        // Individual wave phase
        phases[i] = Math.random() * Math.PI * 2;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Store animation data
    particleGeometry.userData.originalPositions = new Float32Array(positions);
    particleGeometry.userData.velocities = velocities;
    particleGeometry.userData.phases = phases;

    // Flowing particle material
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });

    waveMesh = new THREE.Points(particleGeometry, particleMaterial);
    waveMesh.userData.type = 'waveField';
    scene.add(waveMesh);

    // Create flowing connections for visual continuity
    const maxConnections = 800; // Limit for performance
    const connectionGeometry = new THREE.BufferGeometry();
    const connectionPositions = new Float32Array(maxConnections * 6); // 2 points per line
    const connectionColors = new Float32Array(maxConnections * 6); // 2 colors per line

    connectionGeometry.setAttribute('position', new THREE.BufferAttribute(connectionPositions, 3));
    connectionGeometry.setAttribute('color', new THREE.BufferAttribute(connectionColors, 3));

    const connectionMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.15,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const connectionLines = new THREE.LineSegments(connectionGeometry, connectionMaterial);
    connectionLines.userData.type = 'waveConnections';
    scene.add(connectionLines);

    waveField = {
        mesh: waveMesh,
        particles: waveMesh,
        connections: connectionLines,
        maxConnections: maxConnections
    };

    console.log('✨ Boundless wave field flowing - continuous potential');
}

function animateWaveField() {
    if (!waveMesh || !waveMesh.visible) return;

    waveTime += 0.008;

    // Animate boundless particle flow - shapeless wave patterns
    const positions = waveMesh.geometry.attributes.position.array;
    const colors = waveMesh.geometry.attributes.color.array;
    const originalPositions = waveMesh.geometry.userData.originalPositions;
    const velocities = waveMesh.geometry.userData.velocities;
    const phases = waveMesh.geometry.userData.phases;

    for (let i = 0; i < positions.length; i += 3) {
        const idx = i / 3;
        const origX = originalPositions[i];
        const origY = originalPositions[i + 1];
        const origZ = originalPositions[i + 2];

        // Multiple wave influences create boundless flowing patterns
        const wave1 = Math.sin(origX * 0.08 + waveTime * 1.5 + phases[idx]) * 1.5;
        const wave2 = Math.cos(origY * 0.12 + waveTime * 1.8 + phases[idx] * 1.3) * 1.2;
        const wave3 = Math.sin(origZ * 0.1 + waveTime * 2.2 + phases[idx] * 0.7) * 1.0;
        const wave4 = Math.cos((origX + origY) * 0.06 + waveTime * 1.3) * 0.8;
        const wave5 = Math.sin((origY + origZ) * 0.07 + waveTime * 1.6) * 0.9;

        // Create flowing displacement without boundaries
        const waveX = wave1 + wave4;
        const waveY = wave2 + wave5;
        const waveZ = wave3 + wave4;

        // Apply wave motion + continuous drift
        positions[i] = origX + waveX + velocities[i] * waveTime * 2;
        positions[i + 1] = origY + waveY + velocities[i + 1] * waveTime * 2;
        positions[i + 2] = origZ + waveZ + velocities[i + 2] * waveTime * 2;

        // Gentle flow keeps particles drifting
        positions[i] += Math.sin(waveTime * 0.5 + phases[idx]) * 0.02;
        positions[i + 1] += Math.cos(waveTime * 0.4 + phases[idx] * 1.2) * 0.02;
        positions[i + 2] += Math.sin(waveTime * 0.6 + phases[idx] * 0.8) * 0.02;
    }

    waveMesh.geometry.attributes.position.needsUpdate = true;

    // Update flowing connections for continuity
    if (waveField.connections) {
        const connectionPositions = waveField.connections.geometry.attributes.position.array;
        const connectionColors = waveField.connections.geometry.attributes.color.array;
        const maxDist = 4.5; // Maximum connection distance
        const sampleRate = 8; // Check every Nth particle for performance

        let connectionIndex = 0;
        const particleCount = positions.length / 3;

        // Create dynamic connections between nearby particles
        for (let i = 0; i < particleCount && connectionIndex < waveField.maxConnections; i += sampleRate) {
            const i3 = i * 3;
            const x1 = positions[i3];
            const y1 = positions[i3 + 1];
            const z1 = positions[i3 + 2];

            // Connect to 2-3 nearby particles
            let connections = 0;
            for (let j = i + sampleRate; j < particleCount && connections < 3 && connectionIndex < waveField.maxConnections; j += sampleRate) {
                const j3 = j * 3;
                const x2 = positions[j3];
                const y2 = positions[j3 + 1];
                const z2 = positions[j3 + 2];

                const dx = x2 - x1;
                const dy = y2 - y1;
                const dz = z2 - z1;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < maxDist) {
                    const lineIdx = connectionIndex * 6;

                    // Line start
                    connectionPositions[lineIdx] = x1;
                    connectionPositions[lineIdx + 1] = y1;
                    connectionPositions[lineIdx + 2] = z1;

                    // Line end
                    connectionPositions[lineIdx + 3] = x2;
                    connectionPositions[lineIdx + 4] = y2;
                    connectionPositions[lineIdx + 5] = z2;

                    // Colors - blend particle colors
                    connectionColors[lineIdx] = colors[i3];
                    connectionColors[lineIdx + 1] = colors[i3 + 1];
                    connectionColors[lineIdx + 2] = colors[i3 + 2];
                    connectionColors[lineIdx + 3] = colors[j3];
                    connectionColors[lineIdx + 4] = colors[j3 + 1];
                    connectionColors[lineIdx + 5] = colors[j3 + 2];

                    connectionIndex++;
                    connections++;
                }
            }
        }

        // Clear unused connections
        for (let i = connectionIndex * 6; i < connectionPositions.length; i++) {
            connectionPositions[i] = 0;
        }

        waveField.connections.geometry.attributes.position.needsUpdate = true;
        waveField.connections.geometry.attributes.color.needsUpdate = true;
    }

    // Subtle rotation for breathing motion
    waveMesh.rotation.y += Math.sin(waveTime * 0.3) * 0.0003;
    waveMesh.rotation.x += Math.cos(waveTime * 0.25) * 0.0002;
}

function removeWaveField() {
    if (!waveMesh) return;

    console.log('Collapsing wave field...');
    scene.remove(waveMesh);

    if (waveMesh.geometry) waveMesh.geometry.dispose();
    if (waveMesh.material) waveMesh.material.dispose();

    // Remove connection lines
    if (waveField && waveField.connections) {
        scene.remove(waveField.connections);
        if (waveField.connections.geometry) waveField.connections.geometry.dispose();
        if (waveField.connections.material) waveField.connections.material.dispose();
    }

    waveMesh = null;
    waveField = null;
}

// =============================================================================
// QUANTUM STATES
// =============================================================================

function enterSuperposition() {
    console.log('Entering quantum superposition...');
    particleState = 'SUPERPOSITION';
    isDecaying = false;
    decayPaused = false; // Reset inspection pause
    hoveredParticle = null; // Clear hover state

    // Hide UI panels
    const legend = document.getElementById('color-legend');
    if (legend) legend.classList.remove('visible');

    const responsePanel = document.getElementById('response-panel');
    if (responsePanel) responsePanel.classList.remove('visible');

    const inspectionPanel = document.getElementById('inspection-panel');
    if (inspectionPanel) inspectionPanel.classList.remove('visible');

    const meaningPanel = document.getElementById('meaning-panel');
    if (meaningPanel) meaningPanel.classList.remove('visible');

    const voidControls = document.getElementById('void-controls');
    if (voidControls) voidControls.classList.remove('visible');

    // Clear word labels
    clearWordLabels();

    // Clear toroidal void layer
    clearToroidalVoidLayer();

    // Hide all particles - they don't exist in superposition
    particles.forEach(particle => {
        particle.mesh.visible = false;
        particle.mesh.material.color.set(0x00ffff);
        particle.mesh.material.emissive.set(0x0088ff);
        particle.mesh.material.emissiveIntensity = GLOW_INTENSITY;
        particle.curvature = 0;
        particle.centrality = 0;
        particle.word = null;
        particle.originalColor = null;
        particle.superpositionTarget = null;
    });

    // Spread particles randomly (but invisible - they're in the wave)
    particles.forEach(particle => {
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        const r = 10 + Math.random() * 15;

        const target = new THREE.Vector3(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.sin(theta) * Math.sin(phi),
            r * Math.cos(theta)
        );

        particle.mesh.position.copy(target); // Instant position, not animated
    });

    clearConnections();

    // Create wave field to represent quantum potential
    createWaveField();

    console.log('Quantum wave field active - particles exist as potential');
}

function updateBrownianMotion() {
    if (particleState !== 'SUPERPOSITION') return;
    // Particles don't move in superposition - they're in the wave
    return;

    const dt = 0.016;
    const damping = 0.98;
    const forceStrength = 0.03;

    particles.forEach(particle => {
        // Random force
        particle.velocity.x += (Math.random() - 0.5) * forceStrength;
        particle.velocity.y += (Math.random() - 0.5) * forceStrength;
        particle.velocity.z += (Math.random() - 0.5) * forceStrength;

        // Damping
        particle.velocity.multiplyScalar(damping);

        // Update position
        particle.mesh.position.add(particle.velocity.clone().multiplyScalar(dt * 10));

        // Boundary
        const dist = particle.mesh.position.length();
        if (dist > BOUNDARY_RADIUS) {
            const pushBack = particle.mesh.position.clone().normalize().multiplyScalar(-0.15);
            particle.velocity.add(pushBack);
        }

        // Gentle rotation
        particle.mesh.rotation.x += 0.01;
        particle.mesh.rotation.y += 0.01;

        // Update trail
        updateParticleTrail(particle);
    });
}

function updateParticleTrail(particle) {
    if (!particle.trail) return;

    const trail = particle.trail;
    const pos = particle.mesh.position;

    // Add current position to history
    particle.positionHistory.unshift(pos.clone());
    if (particle.positionHistory.length > TRAIL_LENGTH) {
        particle.positionHistory.pop();
    }

    // Update trail geometry
    for (let i = 0; i < TRAIL_LENGTH; i++) {
        if (i < particle.positionHistory.length) {
            const histPos = particle.positionHistory[i];
            trail.positions[i * 3] = histPos.x;
            trail.positions[i * 3 + 1] = histPos.y;
            trail.positions[i * 3 + 2] = histPos.z;
        } else {
            // Fill rest with last position to avoid artifacts
            trail.positions[i * 3] = pos.x;
            trail.positions[i * 3 + 1] = pos.y;
            trail.positions[i * 3 + 2] = pos.z;
        }
    }

    trail.line.geometry.attributes.position.needsUpdate = true;
}

async function collapseToShape(question) {
    console.log('Question asked - beginning self-assembly sequence...');
    console.log('Question:', question);

    const statusEl = document.getElementById('status-text') || document.getElementById('status');

    // Reset inspection state
    decayPaused = false;
    hoveredParticle = null;
    isDecaying = false;

    // Hide UI panels
    const responsePanel = document.getElementById('response-panel');
    if (responsePanel) responsePanel.classList.remove('visible');

    const inspectionPanel = document.getElementById('inspection-panel');
    if (inspectionPanel) inspectionPanel.classList.remove('visible');

    const meaningPanel = document.getElementById('meaning-panel');
    if (meaningPanel) meaningPanel.classList.remove('visible');

    // Clear previous toroidal layer
    clearToroidalVoidLayer();

    try {
        // Build contextual prompt if previous question exists
        const contextualQuestion = buildContextualPrompt(question);
        if (contextualQuestion !== question) {
            console.log('📝 Using contextual prompt with previous question influence');
        }

        // Generate semantic space
        if (!spaceGenerator) {
            spaceGenerator = new SemanticSpaceGenerator();
        }

        if (statusEl) statusEl.textContent = 'Generating semantic space...';

        const space = await spaceGenerator.generateSpace(contextualQuestion, (update) => {
            console.log('📊 Progress:', update.phase, update.progress + '%', update.message);
            if (statusEl) {
                statusEl.textContent = update.message;
            }
        });

        console.log('Space generated:', space);

        // Store current space and question
        currentSpace = space;
        previousQuestion = question;
        assemblyTimestamp = performance.now();
        isDecaying = false;

        // Clear old labels
        clearWordLabels();

        // Calculate center of mass from positions
        const centerOfMass = new THREE.Vector3();
        if (space.positions && space.positions.length > 0) {
            space.positions.forEach(pos => {
                centerOfMass.add(new THREE.Vector3(pos.x * 0.8, pos.y * 0.8, pos.z * 0.8));
            });
            centerOfMass.divideScalar(space.positions.length);
        }

        // Assign core semantic nodes (first 30 from LLM)
        const coreNodes = [];
        for (let i = 0; i < Math.min(30, space.positions.length); i++) {
            const particle = particles[i];

            particle.targetPosition = new THREE.Vector3(
                space.positions[i].x * 0.8,
                space.positions[i].y * 0.8,
                space.positions[i].z * 0.8
            );

            // Assign word if available
            if (space.words && i < space.words.length) {
                particle.word = space.words[i];
            } else {
                particle.word = null;
            }

            // Assign curvature (importance)
            if (space.curvatures && i < space.curvatures.length) {
                particle.curvature = space.curvatures[i];
            } else {
                particle.curvature = 5.0;
            }

            particle.centrality = particle.targetPosition.distanceTo(centerOfMass);
            particle.isCoreNode = true;
            coreNodes.push(particle);
        }

        console.log(`✓ Core semantic nodes: ${coreNodes.length}`);

        // Generate Fibonacci expansion for remaining particles
        const fibonacciNodes = generateFibonacciExpansion(coreNodes, particles.length - coreNodes.length);

        // Assign Fibonacci nodes to particles
        for (let i = coreNodes.length; i < particles.length; i++) {
            const fibIndex = i - coreNodes.length;
            if (fibIndex < fibonacciNodes.length) {
                const fibNode = fibonacciNodes[fibIndex];
                particles[i].targetPosition = fibNode.position;
                particles[i].curvature = fibNode.curvature;
                particles[i].centrality = fibNode.centrality;
                particles[i].parentNode = fibNode.parentNode;
                particles[i].fibonacciIndex = fibNode.index;
                particles[i].distanceFromParent = fibNode.distanceFromParent;
                particles[i].isCoreNode = false;
                particles[i].word = null; // Fibonacci nodes don't have words

                // Calculate size variation based on distance from parent (used for highlighting)
                const distFactor = Math.exp(-fibNode.distanceFromParent / 3.0);
                particles[i].sizeVariation = 0.6 + distFactor * 0.4;
            }
        }

        console.log(`✓ Fibonacci expansion: ${fibonacciNodes.length} nodes generated`);

        // Calculate potential connections (but don't create them yet)
        calculatePotentialConnections();

        // Execute multi-phase assembly
        await phaseVoid();
        await phaseAttraction();
        await phaseBonding();
        await phaseStabilization();
        await phaseObservation();

        // Apply semantic color coding
        applySemanticColors();

        // Create word labels for particles
        createWordLabels();

        // Analyze final topology
        shapeTopology = analyzeTopology();
        displayTopology(shapeTopology);

        particleState = 'ASSEMBLED';
        assemblyPhase = 'ASSEMBLED';
        const finalStatusEl = document.getElementById('status-text') || document.getElementById('status');
        if (finalStatusEl) finalStatusEl.textContent = 'Analyzing semantic curvature...';

        // Show color legend
        const legend = document.getElementById('color-legend');
        if (legend) legend.classList.add('visible');

        // Generate topology-based response
        await generateTopologyResponse(question, space);

        if (finalStatusEl) finalStatusEl.textContent = 'Topology crystallized. Network stable.';

        // Create toroidal void layer after assembly
        createToroidalVoidLayer();
        createAttractionParticles();
        createFlowLines();

        // Start context decay timer
        decayStartTime = performance.now();

        console.log('✅ Self-assembly complete!');

    } catch (error) {
        console.error('❌ ASSEMBLY FAILED:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });

        const errorStatusEl = document.getElementById('status-text') || document.getElementById('status');
        if (errorStatusEl) errorStatusEl.textContent = `Assembly failed: ${error.message}`;

        setTimeout(() => {
            enterSuperposition();
        }, 2000);
    }
}

// =============================================================================
// FIBONACCI EXPANSION
// =============================================================================

function generateFibonacciExpansion(coreNodes, count) {
    console.log(`🌻 Generating Fibonacci expansion for ${count} particles around ${coreNodes.length} core nodes...`);

    const fibonacciNodes = [];
    const goldenAngleRad = (GOLDEN_ANGLE * Math.PI) / 180;

    // Calculate center of mass of core nodes
    const centerOfMass = new THREE.Vector3();
    coreNodes.forEach(node => centerOfMass.add(node.targetPosition));
    centerOfMass.divideScalar(coreNodes.length);

    for (let i = 0; i < count; i++) {
        // Fibonacci sequence index
        const fibIndex = i;

        // Golden angle spiral (phyllotaxis pattern)
        const theta = fibIndex * goldenAngleRad;

        // Fibonacci-based radius (grows with sqrt for natural packing)
        // Use Fibonacci numbers to create stepped growth
        const fibNumber = getFibonacciNumber(Math.floor(fibIndex / 10) + 1);
        const baseRadius = Math.sqrt(fibIndex + 1) * FIBONACCI_SCALE;
        const radius = baseRadius * (1 + (fibNumber % 5) * 0.1); // Modulate with Fibonacci

        // Spherical distribution (vertical angle)
        // Use golden ratio for vertical distribution
        const phi = Math.acos(1 - 2 * (fibIndex % 89) / 89); // 89 is Fibonacci number

        // Find nearest core node to attach to
        let nearestCore = coreNodes[0];
        let minDist = Infinity;

        // Weight core nodes by their curvature (more important = more satellites)
        const coreWeights = coreNodes.map(node => node.curvature || 5.0);
        const totalWeight = coreWeights.reduce((a, b) => a + b, 0);
        const cumulativeWeights = [];
        let cumulative = 0;
        coreWeights.forEach(w => {
            cumulative += w / totalWeight;
            cumulativeWeights.push(cumulative);
        });

        // Assign to core node based on weighted probability
        const rand = (fibIndex % 100) / 100; // Deterministic "random" based on index
        for (let j = 0; j < cumulativeWeights.length; j++) {
            if (rand < cumulativeWeights[j]) {
                nearestCore = coreNodes[j];
                break;
            }
        }

        // Position relative to nearest core node (like satellites orbiting)
        const corePos = nearestCore.targetPosition;

        // Convert spherical to Cartesian coordinates around core node
        const x = corePos.x + radius * Math.sin(phi) * Math.cos(theta);
        const y = corePos.y + radius * Math.sin(phi) * Math.sin(theta);
        const z = corePos.z + radius * Math.cos(phi);

        const position = new THREE.Vector3(x, y, z);

        // Inherit properties from parent core node (with decay)
        const distanceFromCore = position.distanceTo(corePos);
        const inheritanceFactor = Math.exp(-distanceFromCore / 5.0); // Exponential decay

        const curvature = (nearestCore.curvature || 5.0) * inheritanceFactor;
        const centrality = position.distanceTo(centerOfMass);

        fibonacciNodes.push({
            position: position,
            curvature: curvature,
            centrality: centrality,
            parentNode: nearestCore,
            index: fibIndex,
            distanceFromParent: distanceFromCore
        });
    }

    console.log(`✓ Generated ${fibonacciNodes.length} Fibonacci nodes using golden angle (${GOLDEN_ANGLE.toFixed(2)}°)`);

    return fibonacciNodes;
}

// Calculate Fibonacci number (simple iterative version)
function getFibonacciNumber(n) {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
        const temp = a + b;
        a = b;
        b = temp;
    }
    return b;
}

// =============================================================================
// TOROIDAL VOID LAYER - Visualizes semantic collapse toward the void
// =============================================================================

function createToroidalVoidLayer() {
    console.log('🌀 Creating toroidal void layer...');

    // Create void center sphere (dark pulsing core)
    createVoidCenter();

    // Create semi-transparent torus surface
    const torusGeometry = new THREE.TorusGeometry(
        8,  // Major radius (distance from center to tube center)
        6,  // Minor radius (tube thickness)
        64, // Tubular segments
        128 // Radial segments
    );

    const torusMaterial = new THREE.MeshPhongMaterial({
        color: 0x4488aa,
        transparent: true,
        opacity: 0.08,
        side: THREE.DoubleSide,
        depthWrite: false
    });

    const torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
    torusMesh.userData.type = 'toroidalSurface';
    torusMesh.visible = false; // Hidden by default
    scene.add(torusMesh);
    toroidalElements.push(torusMesh);

    console.log('✓ Toroidal void layer created');
}

function createVoidCenter() {
    // Dark core sphere
    const coreGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.6,
        depthWrite: false
    });

    const coreSphere = new THREE.Mesh(coreGeometry, coreMaterial);
    coreSphere.userData.type = 'voidCore';
    coreSphere.visible = false;
    scene.add(coreSphere);
    toroidalElements.push(coreSphere);

    // Red glow around void
    const glowGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
        side: THREE.BackSide
    });

    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    glowSphere.userData.type = 'voidGlow';
    glowSphere.visible = false;
    scene.add(glowSphere);
    toroidalElements.push(glowSphere);

    voidSphere = coreSphere;

    // Pulse animation for void
    let pulsePhase = 0;
    const pulseInterval = setInterval(() => {
        if (!voidSphere || !voidSphere.visible) return;

        pulsePhase += 0.02;
        const pulse = 0.5 + Math.sin(pulsePhase) * 0.15;
        coreSphere.material.opacity = pulse;
        glowSphere.material.opacity = pulse * 0.3;
    }, 16);

    particleAnimationIntervals.push(pulseInterval);
}

function createAttractionParticles() {
    console.log('⚡ Creating attraction particles for low-curvature nodes...');

    // Clear existing particles
    attractionParticles.forEach(p => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
    });
    attractionParticles = [];

    // Create particles for low-curvature words (R < 3)
    particles.forEach(particle => {
        if (!particle.curvature || particle.curvature >= 3) return;
        if (!particle.mesh || !particle.mesh.position) return;

        const particleCount = 3; // 3 particles per low-curvature node

        for (let i = 0; i < particleCount; i++) {
            const particleGeom = new THREE.SphereGeometry(0.08, 8, 8);

            // Color based on curvature level
            let color;
            if (particle.curvature < 1) {
                color = 0xff0000; // Red - strong attraction
            } else if (particle.curvature < 2) {
                color = 0xff8800; // Orange - medium attraction
            } else {
                color = 0xffff00; // Yellow - weak attraction
            }

            const particleMat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.8,
                emissive: color,
                emissiveIntensity: 0.5
            });

            const particleMesh = new THREE.Mesh(particleGeom, particleMat);

            // Initial position at word node
            particleMesh.position.copy(particle.mesh.position);
            particleMesh.userData.parentNode = particle;
            particleMesh.userData.type = 'attractionParticle';
            particleMesh.userData.phase = i / particleCount; // Stagger animation
            particleMesh.visible = false; // Hidden by default

            scene.add(particleMesh);
            attractionParticles.push({
                mesh: particleMesh,
                parent: particle,
                progress: 0
            });
        }
    });

    console.log(`✓ Created ${attractionParticles.length} attraction particles`);
}

function createFlowLines() {
    console.log('🌊 Creating flow lines to void...');

    // Create flow lines from low-curvature words to void center
    particles.forEach(particle => {
        if (!particle.curvature || particle.curvature >= 3) return;
        if (!particle.mesh || !particle.mesh.position) return;

        const wordPos = particle.mesh.position;
        const voidPos = new THREE.Vector3(0, 0, 0);

        // Create curved path using control points
        const midPoint = new THREE.Vector3().lerpVectors(wordPos, voidPos, 0.5);
        midPoint.y += 2; // Arc upward

        const curve = new THREE.CatmullRomCurve3([
            wordPos.clone(),
            midPoint,
            voidPos
        ]);

        const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);

        // Gradient color from word color to red
        const flowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff3333,
            transparent: true,
            opacity: 0.25,
            depthWrite: false
        });

        const flowTube = new THREE.Mesh(tubeGeometry, flowMaterial);
        flowTube.userData.type = 'flowLine';
        flowTube.visible = false; // Hidden by default
        scene.add(flowTube);
        toroidalElements.push(flowTube);
    });

    console.log(`✓ Created flow lines for low-curvature nodes`);
}

function animateAttractionParticles() {
    attractionParticles.forEach(particleObj => {
        if (!particleObj.mesh.visible) return;
        if (!particleObj.parent || !particleObj.parent.mesh) return;

        const wordPos = particleObj.parent.mesh.position;
        const voidPos = new THREE.Vector3(0, 0, 0);

        // Update progress (loop back when reaching void)
        particleObj.progress += 0.005;
        if (particleObj.progress > 1) {
            particleObj.progress = 0;
        }

        // Lerp from word to void
        particleObj.mesh.position.lerpVectors(wordPos, voidPos, particleObj.progress);

        // Fade as it approaches void
        const distance = particleObj.mesh.position.distanceTo(voidPos);
        const maxDist = wordPos.distanceTo(voidPos);
        particleObj.mesh.material.opacity = (distance / maxDist) * 0.8;
    });
}

function clearToroidalVoidLayer() {
    // Remove toroidal elements
    toroidalElements.forEach(element => {
        scene.remove(element);
        if (element.geometry) element.geometry.dispose();
        if (element.material) element.material.dispose();
    });
    toroidalElements = [];

    // Remove attraction particles
    attractionParticles.forEach(p => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
    });
    attractionParticles = [];

    // Clear animation intervals
    particleAnimationIntervals.forEach(interval => clearInterval(interval));
    particleAnimationIntervals = [];

    voidSphere = null;
}

// =============================================================================
// MULTI-PHASE SELF-ASSEMBLY
// =============================================================================

function calculatePotentialConnections() {
    potentialConnections = [];

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            if (!particles[i].targetPosition || !particles[j].targetPosition) continue;

            const dist = particles[i].targetPosition.distanceTo(particles[j].targetPosition);

            if (dist < CONNECTION_THRESHOLD) {
                potentialConnections.push({
                    p1: particles[i],
                    p2: particles[j],
                    distance: dist,
                    formed: false
                });
            }
        }
    }

    console.log(`Calculated ${potentialConnections.length} potential connections`);
}

// PHASE 1: VOID/CHAOS - Wave collapse begins
async function phaseVoid() {
    console.log('🌑 Phase 1: VOID - Wave function collapsing...');
    assemblyPhase = 'VOID';
    particleState = 'VOID';
    phaseStartTime = performance.now();

    const statusEl = document.getElementById('status-text') || document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Wavefunction collapsing - nodes crystallizing...';

    // Remove wave field as particles crystallize
    removeWaveField();

    // Create dark flash
    createDarkFlash();

    return new Promise(resolve => {
        const duration = 1000;
        const startTime = performance.now();

        function animate() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            particles.forEach((particle, i) => {
                // Crystallize particles from the wave - stagger appearance
                const stagger = (i / particles.length) * 0.5;
                const appearProgress = Math.max(0, Math.min(1, (t - stagger) / 0.5));

                // Make visible as they crystallize
                if (appearProgress > 0) {
                    particle.mesh.visible = true;
                    particle.mesh.material.opacity = appearProgress * 0.8;

                    // Scale up from nothing (crystallization effect)
                    const scale = appearProgress;
                    particle.mesh.scale.setScalar(scale);
                }

                // Slight chaos during crystallization
                const chaos = (1 - t) * 0.1;
                particle.velocity.x += (Math.random() - 0.5) * chaos;
                particle.velocity.y += (Math.random() - 0.5) * chaos;
                particle.velocity.z += (Math.random() - 0.5) * chaos;
            });

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log('✓ Void phase complete');
                resolve();
            }
        }

        animate();
    });
}

// PHASE 2: ATTRACTION
async function phaseAttraction() {
    console.log('🧲 Phase 2: ATTRACTION - Particles sensing each other...');
    assemblyPhase = 'ATTRACTION';
    particleState = 'ATTRACTION';
    phaseStartTime = performance.now();

    const statusEl = document.getElementById('status-text') || document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Attraction: Forces emerging...';

    return new Promise(resolve => {
        const duration = 2500;
        const startTime = performance.now();

        // Stagger particle responses
        particles.forEach((particle, i) => {
            particle.attractionDelay = (i / particles.length) * 0.4;
            particle.attractionStrength = 0.3 + Math.random() * 0.4;
        });

        function animate() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            particles.forEach((particle, i) => {
                if (!particle.targetPosition) return;

                const particleT = Math.max(0, (t - particle.attractionDelay) / (1 - particle.attractionDelay));

                // Gradually increase attraction to target
                const attractionForce = particleT * particle.attractionStrength;
                const delta = new THREE.Vector3().subVectors(particle.targetPosition, particle.mesh.position);
                const force = delta.multiplyScalar(attractionForce * 0.02);
                particle.velocity.add(force);

                // Apply velocity
                particle.mesh.position.add(particle.velocity);

                // Damping increases over time
                particle.velocity.multiplyScalar(0.98 - particleT * 0.05);

                // Rotation increases with velocity
                const speed = particle.velocity.length();
                particle.mesh.rotation.x += speed * 0.08;
                particle.mesh.rotation.y += speed * 0.05;

                // Trails become more visible
                if (particle.trail) {
                    particle.trail.line.material.opacity = 0.2 + particleT * 0.3;
                }
            });

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log('✓ Attraction phase complete');
                resolve();
            }
        }

        animate();
    });
}

// PHASE 3: BONDING
async function phaseBonding() {
    console.log('🔗 Phase 3: BONDING - Connections forming...');
    assemblyPhase = 'BONDING';
    particleState = 'BONDING';
    phaseStartTime = performance.now();

    const statusEl = document.getElementById('status-text') || document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Bonding: Network topology emerging...';

    return new Promise(resolve => {
        const duration = 3000;
        const startTime = performance.now();
        const connectionsPerFrame = Math.max(1, Math.floor(potentialConnections.length / 60)); // Form over ~1 second

        let connectionIndex = 0;

        function animate() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Continue moving particles toward targets
            particles.forEach((particle, i) => {
                if (!particle.targetPosition) return;

                // Stronger pull now
                const delta = new THREE.Vector3().subVectors(particle.targetPosition, particle.mesh.position);
                const dist = delta.length();

                if (dist > 0.1) {
                    const force = delta.normalize().multiplyScalar(0.05);
                    particle.velocity.add(force);
                }

                particle.mesh.position.add(particle.velocity);
                particle.velocity.multiplyScalar(0.96);

                // Apply clustering forces
                applyClusteringForce(particle, i, t);
            });

            // Progressively form connections
            if (connectionIndex < potentialConnections.length) {
                for (let i = 0; i < connectionsPerFrame && connectionIndex < potentialConnections.length; i++) {
                    const conn = potentialConnections[connectionIndex];
                    if (!conn.formed) {
                        const dist = conn.p1.mesh.position.distanceTo(conn.p2.mesh.position);
                        if (dist < CONNECTION_THRESHOLD * 1.2) { // Slightly more lenient during formation
                            createConnectionGradual(conn.p1, conn.p2, dist);
                            conn.formed = true;
                        }
                    }
                    connectionIndex++;
                }
            }

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log('✓ Bonding phase complete');
                resolve();
            }
        }

        animate();
    });
}

// PHASE 4: STABILIZATION
async function phaseStabilization() {
    console.log('⚖️ Phase 4: STABILIZATION - Network settling...');
    assemblyPhase = 'STABILIZATION';
    particleState = 'STABILIZATION';
    phaseStartTime = performance.now();

    const statusEl = document.getElementById('status-text') || document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Stabilization: Topology stabilizing...';

    return new Promise(resolve => {
        const duration = 2000;
        const startTime = performance.now();

        function animate() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Spring-damping physics to settle
            particles.forEach(particle => {
                if (!particle.targetPosition) return;

                const delta = new THREE.Vector3().subVectors(particle.targetPosition, particle.mesh.position);
                const dist = delta.length();

                // Spring force (Hooke's law)
                const springForce = delta.multiplyScalar(0.03);
                particle.velocity.add(springForce);

                particle.mesh.position.add(particle.velocity);

                // Strong damping for settling
                particle.velocity.multiplyScalar(0.92 - t * 0.1);

                // Slow rotation
                particle.mesh.rotation.x += particle.velocity.length() * 0.02;
                particle.mesh.rotation.y += particle.velocity.length() * 0.01;
            });

            // Maintain connections
            updateConnections();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log('✓ Stabilization phase complete');
                resolve();
            }
        }

        animate();
    });
}

// PHASE 5: OBSERVATION
async function phaseObservation() {
    console.log('👁️ Phase 5: OBSERVATION - Topology crystallized');
    assemblyPhase = 'OBSERVATION';

    const statusEl = document.getElementById('status-text') || document.getElementById('status');
    if (statusEl) statusEl.textContent = 'Observation: Network crystallized';

    // Brightening flash to reveal final form
    createRevealFlash();

    return new Promise(resolve => {
        const duration = 1000;
        const startTime = performance.now();

        function animate() {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / duration, 1);

            // Final settling
            particles.forEach(particle => {
                particle.mesh.material.opacity = 0.8 + t * 0.2;

                // Minimal final adjustments
                if (particle.targetPosition) {
                    const delta = new THREE.Vector3().subVectors(particle.targetPosition, particle.mesh.position);
                    particle.mesh.position.lerp(particle.targetPosition, 0.05 * (1 - t));
                }

                particle.velocity.multiplyScalar(0.9);
            });

            // Connections pulse stronger
            connections.forEach(conn => {
                const time = performance.now() * 0.001;
                const pulse = Math.sin(time * 2 + conn.line.userData.pulsePhase) * 0.2;
                conn.material.emissiveIntensity = 0.6 + pulse + t * 0.2;
            });

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                console.log('✓ Observation phase complete - Assembly finished');
                resolve();
            }
        }

        animate();
    });
}

function applyClusteringForce(particle, index, collapseProgress) {
    if (collapseProgress < 0.3) return; // Start clustering mid-collapse

    const clusterRadius = 5.0;
    const clusterStrength = 0.02 * collapseProgress;

    for (let i = 0; i < particles.length; i++) {
        if (i === index) continue;

        const other = particles[i];
        const delta = new THREE.Vector3().subVectors(
            other.mesh.position,
            particle.mesh.position
        );
        const dist = delta.length();

        if (dist < clusterRadius && dist > 0.1) {
            // Gentle attraction to nearby particles
            const force = delta.normalize().multiplyScalar(clusterStrength / dist);
            particle.velocity.add(force);
        }
    }
}

function createCollapseFlash() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 1.0
    });

    const flash = new THREE.Mesh(geometry, material);
    scene.add(flash);

    let scale = 1;
    let opacity = 1.0;

    const flashInterval = setInterval(() => {
        scale += 1.5;
        opacity -= 0.04;

        flash.scale.setScalar(scale);
        material.opacity = Math.max(opacity, 0);

        if (opacity <= 0) {
            clearInterval(flashInterval);
            scene.remove(flash);
            geometry.dispose();
            material.dispose();
        }
    }, 16);
}

function createDarkFlash() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.0
    });

    const flash = new THREE.Mesh(geometry, material);
    scene.add(flash);

    let scale = 1;
    let opacity = 0.0;

    const flashInterval = setInterval(() => {
        scale += 2.0;
        opacity += 0.08;

        flash.scale.setScalar(scale);
        material.opacity = Math.min(opacity, 0.8);

        if (opacity >= 0.8) {
            // Peak reached, now fade out
            clearInterval(flashInterval);

            const fadeInterval = setInterval(() => {
                opacity -= 0.06;
                material.opacity = Math.max(opacity, 0);

                if (opacity <= 0) {
                    clearInterval(fadeInterval);
                    scene.remove(flash);
                    geometry.dispose();
                    material.dispose();
                }
            }, 16);
        }
    }, 16);
}

function createRevealFlash() {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.0
    });

    const flash = new THREE.Mesh(geometry, material);
    scene.add(flash);

    let scale = 0.5;
    let opacity = 0.0;

    const flashInterval = setInterval(() => {
        scale += 3.0;
        opacity += 0.15;

        flash.scale.setScalar(scale);
        material.opacity = Math.min(opacity, 1.0);

        if (opacity >= 1.0) {
            opacity = 1.0;
            clearInterval(flashInterval);

            const fadeInterval = setInterval(() => {
                opacity -= 0.05;
                material.opacity = Math.max(opacity, 0);

                if (opacity <= 0) {
                    clearInterval(fadeInterval);
                    scene.remove(flash);
                    geometry.dispose();
                    material.dispose();
                }
            }, 16);
        }
    }, 16);
}

// =============================================================================
// CONNECTIONS (THE SHAPE)
// =============================================================================

function createConnections() {
    console.log('Creating connections - shape emerging...');
    clearConnections();

    // Connect nearby particles
    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
            const dist = particles[i].mesh.position.distanceTo(particles[j].mesh.position);

            if (dist < CONNECTION_THRESHOLD) {
                createConnection(particles[i], particles[j], dist);
            }
        }
    }

    console.log(`Created ${connections.length} connections`);
}

function createConnection(p1, p2, distance) {
    // Energy beam effect using cylinder
    const start = p1.mesh.position;
    const end = p2.mesh.position;
    const length = start.distanceTo(end);

    // Create cylinder for the beam
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, length, 8);
    const material = new THREE.MeshBasicMaterial({
        color: COLORS.connection,
        transparent: true,
        opacity: 0.6 * (1 - distance / CONNECTION_THRESHOLD),
        blending: THREE.AdditiveBlending,
        emissive: COLORS.connection,
        emissiveIntensity: 0.5
    });

    const beam = new THREE.Mesh(geometry, material);

    // Position beam between particles
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    beam.position.copy(midpoint);

    // Orient beam toward target
    beam.lookAt(end);
    beam.rotateX(Math.PI / 2);

    // Add pulsing effect data
    beam.userData.pulsePhase = Math.random() * Math.PI * 2;
    beam.userData.baseOpacity = material.opacity;

    scene.add(beam);
    connections.push({ line: beam, p1, p2, material });
}

function createConnectionGradual(p1, p2, distance) {
    // Energy beam effect with growing-in animation
    const start = p1.mesh.position;
    const end = p2.mesh.position;
    const length = start.distanceTo(end);

    // Create cylinder for the beam (initially very small scale)
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, length, 8);
    const material = new THREE.MeshBasicMaterial({
        color: COLORS.connection,
        transparent: true,
        opacity: 0.0, // Start invisible
        blending: THREE.AdditiveBlending,
        emissive: COLORS.connection,
        emissiveIntensity: 0.0 // Start dark
    });

    const beam = new THREE.Mesh(geometry, material);

    // Position beam between particles
    const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    beam.position.copy(midpoint);

    // Orient beam toward target
    beam.lookAt(end);
    beam.rotateX(Math.PI / 2);

    // Add pulsing effect data
    beam.userData.pulsePhase = Math.random() * Math.PI * 2;
    beam.userData.baseOpacity = 0.6 * (1 - distance / CONNECTION_THRESHOLD);
    beam.userData.targetEmissive = 0.5;
    beam.userData.growthProgress = 0;
    beam.userData.isGrowing = true;

    // Start with tiny scale
    beam.scale.set(0.1, 0.1, 0.1);

    scene.add(beam);
    connections.push({ line: beam, p1, p2, material });

    // Animate growth
    const growthInterval = setInterval(() => {
        if (beam.userData.growthProgress < 1.0) {
            beam.userData.growthProgress += 0.05;

            // Ease-out curve
            const eased = 1 - Math.pow(1 - beam.userData.growthProgress, 3);

            // Grow scale
            const scale = 0.1 + eased * 0.9;
            beam.scale.set(scale, scale, scale);

            // Fade in opacity
            material.opacity = eased * beam.userData.baseOpacity;

            // Brighten emissive
            material.emissiveIntensity = eased * beam.userData.targetEmissive;
        } else {
            beam.userData.isGrowing = false;
            clearInterval(growthInterval);
        }
    }, 16);
}

function updateConnections() {
    const time = performance.now() * 0.001;

    connections.forEach(conn => {
        const start = conn.p1.mesh.position;
        const end = conn.p2.mesh.position;

        // Update beam position to midpoint
        const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        conn.line.position.copy(midpoint);

        // Update beam length
        const length = start.distanceTo(end);
        conn.line.scale.y = length / 1.0; // Normalize scale

        // Update beam orientation
        conn.line.lookAt(end);
        conn.line.rotateX(Math.PI / 2);

        // Pulsing glow effect
        const pulseSpeed = 2.0;
        const pulseAmount = 0.3;
        const pulse = Math.sin(time * pulseSpeed + conn.line.userData.pulsePhase) * pulseAmount;
        conn.material.opacity = conn.line.userData.baseOpacity * (1.0 + pulse);
        conn.material.emissiveIntensity = 0.5 + pulse * 0.5;
    });
}

function clearConnections() {
    connections.forEach(conn => {
        scene.remove(conn.line);
        conn.line.geometry.dispose();
        conn.line.material.dispose();
    });
    connections = [];
}

// =============================================================================
// SEMANTIC COLOR CODING
// =============================================================================

function applySemanticColors() {
    console.log('🎨 Applying semantic color coding with Fibonacci gradient...');

    // Find min/max centrality for normalization
    let minCentrality = Infinity;
    let maxCentrality = -Infinity;

    particles.forEach(particle => {
        if (particle.centrality !== undefined) {
            minCentrality = Math.min(minCentrality, particle.centrality);
            maxCentrality = Math.max(maxCentrality, particle.centrality);
        }
    });

    let coreColorCount = 0;
    let fibColorCount = 0;

    particles.forEach(particle => {
        // Skip particles without target positions
        if (!particle.targetPosition) return;

        let color;
        const curvature = particle.curvature || 5.0;
        const centralityNorm = 1 - ((particle.centrality - minCentrality) / (maxCentrality - minCentrality) || 0);

        // CORE NODES - Full semantic color based on curvature
        if (particle.isCoreNode && particle.word) {
            if (curvature < 3.5) {
                const t = curvature / 3.5;
                color = new THREE.Color().lerpColors(
                    new THREE.Color(0xff3333), // Red
                    new THREE.Color(0xff8844), // Orange
                    t
                );
            } else if (curvature < 7.0) {
                const t = (curvature - 3.5) / 3.5;
                color = new THREE.Color().lerpColors(
                    new THREE.Color(0xff8844), // Orange
                    new THREE.Color(0x00ffff), // Cyan
                    t
                );
            } else {
                const t = (curvature - 7.0) / 3.0;
                color = new THREE.Color().lerpColors(
                    new THREE.Color(0x00ffff), // Cyan
                    new THREE.Color(0xff00ff), // Magenta
                    t
                );
            }

            const brightnessFactor = 0.7 + centralityNorm * 0.3;
            color.multiplyScalar(brightnessFactor);

            particle.mesh.material.color.copy(color);
            particle.mesh.material.emissive.copy(color);
            particle.mesh.material.emissiveIntensity = 1.5 + centralityNorm * 0.5;

            coreColorCount++;
        }
        // FIBONACCI NODES - Inherit and fade from parent core node
        else if (!particle.isCoreNode && particle.parentNode) {
            // Get parent's color
            const parentColor = particle.parentNode.originalColor || particle.parentNode.mesh.material.color;

            // Fade based on distance from parent
            const distFactor = Math.exp(-particle.distanceFromParent / 3.0); // Exponential decay
            const fadeFactor = 0.3 + distFactor * 0.7; // Min 30% brightness

            color = parentColor.clone();
            color.multiplyScalar(fadeFactor);

            // Size variation for Fibonacci nodes
            const sizeVariation = 0.6 + distFactor * 0.4; // Smaller as distance increases
            particle.mesh.scale.setScalar(sizeVariation);

            particle.mesh.material.color.copy(color);
            particle.mesh.material.emissive.copy(color);
            particle.mesh.material.emissiveIntensity = 0.8 + distFactor * 0.4;

            fibColorCount++;
        }
        // FALLBACK - Default cyan
        else {
            color = new THREE.Color(0x00ffff);
            particle.mesh.material.color.copy(color);
            particle.mesh.material.emissive.copy(color);
            particle.mesh.material.emissiveIntensity = GLOW_INTENSITY;
        }

        // Store original color for decay
        particle.originalColor = color.clone();

        if (particle.word) {
            console.log(`  ${particle.word}: curvature=${curvature.toFixed(1)}, centrality=${particle.centrality.toFixed(1)}, color=${color.getHexString()}`);
        }
    });

    console.log(`✓ Applied colors - Core nodes: ${coreColorCount}, Fibonacci nodes: ${fibColorCount}`);
}

// =============================================================================
// WORD LABELS
// =============================================================================

function createWordLabels() {
    console.log('Creating word labels...');

    particles.forEach((particle, i) => {
        if (!particle.word) return;

        // Get particle color (or default to cyan)
        const particleColor = particle.originalColor || new THREE.Color(0x00ffff);
        const colorHex = '#' + particleColor.getHexString();

        // Create label element
        const labelDiv = document.createElement('div');
        labelDiv.className = 'word-label';
        labelDiv.textContent = particle.word;
        labelDiv.style.color = colorHex;
        labelDiv.style.fontFamily = 'Inter, sans-serif';
        labelDiv.style.fontSize = '12px';
        labelDiv.style.fontWeight = '500';
        labelDiv.style.textShadow = `0 0 8px ${colorHex}, 0 0 12px ${colorHex}`;
        labelDiv.style.padding = '2px 6px';
        labelDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        labelDiv.style.borderRadius = '3px';
        labelDiv.style.border = `1px solid ${colorHex}40`; // 40 = 25% opacity in hex
        labelDiv.style.whiteSpace = 'nowrap';
        labelDiv.style.opacity = '0';
        labelDiv.style.transition = 'opacity 0.5s ease-in';

        // Create CSS2D object
        const label = new CSS2DObject(labelDiv);
        label.position.set(0, 0.4, 0); // Offset above particle

        // Attach to particle mesh
        particle.mesh.add(label);
        particle.label = label;
        particle.labelDiv = labelDiv;

        wordLabels.push(label);

        // Fade in after short delay
        setTimeout(() => {
            labelDiv.style.opacity = '0.9';
        }, 100 * i);
    });

    console.log(`Created ${wordLabels.length} word labels`);
}

function clearWordLabels() {
    wordLabels.forEach(label => {
        if (label.parent) {
            label.parent.remove(label);
        }
        if (label.element && label.element.parentNode) {
            label.element.parentNode.removeChild(label.element);
        }
    });

    particles.forEach(particle => {
        if (particle.label) {
            particle.mesh.remove(particle.label);
            particle.label = null;
            particle.labelDiv = null;
        }
        particle.word = null;
    });

    wordLabels = [];
    console.log('Cleared word labels');
}

function updateWordLabels() {
    // Update label opacity based on distance from camera
    const cameraPos = camera.position;

    particles.forEach(particle => {
        if (!particle.labelDiv) return;

        const dist = particle.mesh.position.distanceTo(cameraPos);
        const minDist = 15;
        const maxDist = 60;

        let opacity = 0.9;

        if (dist < minDist) {
            // Too close - fade out
            opacity = Math.max(0, (dist - 5) / (minDist - 5)) * 0.9;
        } else if (dist > maxDist) {
            // Too far - fade out
            opacity = Math.max(0, 1 - (dist - maxDist) / 20) * 0.9;
        }

        // Apply decay fade if decaying
        if (isDecaying) {
            const elapsed = performance.now() - decayStartTime;
            const decayProgress = Math.min(1, elapsed / CONTEXT_DECAY_DURATION);
            opacity *= (1 - decayProgress * 0.7); // Fade to 30% during decay
        }

        particle.labelDiv.style.opacity = opacity.toString();
    });
}

// =============================================================================
// CONTEXT DECAY & CHAINING
// =============================================================================

function updateContextDecay() {
    if (particleState !== 'ASSEMBLED') return;

    const elapsed = performance.now() - decayStartTime;

    // Check if decay should start
    if (elapsed > CONTEXT_DECAY_START && !isDecaying) {
        console.log('⏱️ Context decay beginning...');
        isDecaying = true;
        const statusEl = document.getElementById('status-text') || document.getElementById('status');
        if (statusEl) statusEl.textContent = 'Context fading... shape dissolving... (press SPACE to pause)';
    }

    if (!isDecaying) return;

    // Respect decay pause for inspection
    if (decayPaused) return;

    // Calculate decay progress
    const decayElapsed = elapsed - CONTEXT_DECAY_START;
    const decayProgress = Math.min(1, decayElapsed / CONTEXT_DECAY_DURATION);

    // Gradually move particles back toward superposition
    particles.forEach(particle => {
        if (!particle.targetPosition) return;

        // Generate random superposition target
        if (!particle.superpositionTarget) {
            const phi = Math.random() * Math.PI * 2;
            const theta = Math.random() * Math.PI;
            const r = 10 + Math.random() * 15;

            particle.superpositionTarget = new THREE.Vector3(
                r * Math.sin(theta) * Math.cos(phi),
                r * Math.sin(theta) * Math.sin(phi),
                r * Math.cos(theta)
            );
        }

        // Lerp from assembled position to superposition
        const current = particle.mesh.position.clone();
        const target = particle.superpositionTarget;
        const blended = current.lerp(target, decayProgress * 0.02);
        particle.mesh.position.copy(blended);

        // Add slight Brownian motion during decay
        particle.velocity.x += (Math.random() - 0.5) * 0.01 * decayProgress;
        particle.velocity.y += (Math.random() - 0.5) * 0.01 * decayProgress;
        particle.velocity.z += (Math.random() - 0.5) * 0.01 * decayProgress;
        particle.mesh.position.add(particle.velocity);
        particle.velocity.multiplyScalar(0.98);
    });

    // Fade connections during decay
    connections.forEach(conn => {
        conn.material.opacity = conn.line.userData.baseOpacity * (1 - decayProgress * 0.8);
        conn.material.emissiveIntensity = 0.5 * (1 - decayProgress);
    });

    // Complete decay - return to full superposition
    if (decayProgress >= 1.0) {
        console.log('⏱️ Context fully decayed - returning to superposition');
        enterSuperposition();
    }
}

function buildContextualPrompt(currentQuestion) {
    if (!previousQuestion || !currentSpace) {
        return currentQuestion;
    }

    // Calculate time-based context influence
    const elapsed = performance.now() - assemblyTimestamp;
    const totalTime = CONTEXT_DECAY_START + CONTEXT_DECAY_DURATION;
    const contextStrength = Math.max(0, 1 - (elapsed / totalTime));

    if (contextStrength < 0.1) {
        // Context too weak, use question as-is
        return currentQuestion;
    }

    // Weight the context influence
    const influence = contextStrength * CONTEXT_INFLUENCE;

    console.log(`🔗 Chaining questions (${Math.round(influence * 100)}% context from previous)`);

    // Build contextual prompt
    const contextualPrompt = `Previous context (${Math.round(influence * 100)}% weight): "${previousQuestion}"
Previous key concepts: ${currentSpace.words ? currentSpace.words.slice(0, 5).join(', ') : 'unknown'}

Current question: "${currentQuestion}"

Based on the temporal context decay, blend the semantic spaces with ${Math.round(influence * 100)}% influence from the previous question.`;

    return contextualPrompt;
}

// =============================================================================
// TOPOLOGY-BASED RESPONSE GENERATION
// =============================================================================

async function generateTopologyResponse(question, space) {
    console.log('🔮 Generating topology-based response...');

    try {
        // Find highest curvature (most fundamental) concepts
        const wordCurvatures = [];
        particles.forEach(particle => {
            if (particle.word && particle.curvature) {
                wordCurvatures.push({
                    word: particle.word,
                    curvature: particle.curvature,
                    centrality: particle.centrality
                });
            }
        });

        // Sort by curvature (highest first)
        wordCurvatures.sort((a, b) => b.curvature - a.curvature);

        const fundamentalConcepts = wordCurvatures.slice(0, 5).map(w => w.word);
        const peripheralConcepts = wordCurvatures.slice(-3).map(w => w.word);

        // Find most central concepts (closest to center of mass)
        const centralWords = wordCurvatures
            .sort((a, b) => a.centrality - b.centrality)
            .slice(0, 3)
            .map(w => w.word);

        const topology = shapeTopology || analyzeTopology();

        // Build prompt for Groq
        const prompt = `You are analyzing a self-assembled semantic topology in response to a question. The shape itself IS the answer - you are interpreting what it reveals.

QUESTION: "${question}"

TOPOLOGY STRUCTURE:
- Nodes: ${topology.nodes}
- Connections: ${topology.edges}
- Network density: ${(topology.density * 100).toFixed(1)}%

SEMANTIC CURVATURE ANALYSIS:
Fundamental Concepts (highest curvature): ${fundamentalConcepts.join(', ')}
Peripheral Concepts (lowest curvature): ${peripheralConcepts.join(', ')}
Central Cluster (geometric center): ${centralWords.join(', ')}

INSTRUCTIONS:
Based on the semantic topology that self-assembled, provide a 2-3 sentence response that:
1. Addresses the question directly
2. References the fundamental concepts that emerged at the center
3. Explains what the curvature field reveals about the question

Be poetic but precise. The shape is unprecedented - describe what it means.`;

        // Query Groq
        const { queryGroq } = await import('./groq_agent.js');
        const response = await queryGroq(prompt);

        if (response) {
            console.log('✓ Topology response generated');
            displayTopologyResponse(response, fundamentalConcepts);
        } else {
            console.log('⚠️ No response generated - using fallback');
            const fallback = `The topology reveals ${fundamentalConcepts.slice(0, 3).join(', ')} as fundamental concepts with highest curvature, clustering around ${centralWords[0]} at the geometric center.`;
            displayTopologyResponse(fallback, fundamentalConcepts);
        }

    } catch (error) {
        console.error('Error generating topology response:', error);
    }
}

// Generate explanation of what new knowledge the shape reveals
async function generateShapeMeaningExplanation(question, space) {
    console.log('🔍 Generating shape meaning explanation...');

    try {
        // Analyze clustering patterns
        const wordCurvatures = [];
        particles.forEach(particle => {
            if (particle.word && particle.curvature) {
                wordCurvatures.push({
                    word: particle.word,
                    curvature: particle.curvature,
                    centrality: particle.centrality
                });
            }
        });

        wordCurvatures.sort((a, b) => b.curvature - a.curvature);

        const fundamentalConcepts = wordCurvatures.slice(0, 5).map(w => w.word);
        const peripheralConcepts = wordCurvatures.slice(-5).map(w => w.word);
        const topology = shapeTopology || analyzeTopology();

        // Find cluster relationships - which concepts are spatially close
        const clusters = identifyConceptClusters();
        const clusterDescriptions = clusters.map(cluster =>
            `[${cluster.members.join(', ')}]`
        ).join(', ');

        const prompt = `You are analyzing what NEW KNOWLEDGE a self-assembled semantic topology reveals about a question.

THEORETICAL FRAMEWORK (Theory of Emergence):
- Meaning exists in VECTOR SPACE, not just language. Each concept is a point in high-dimensional semantic space.
- CURVATURE (R) measures semantic compressibility: High curvature (R>7) = fundamental archetypes (irreducible), Low curvature (R<3) = operationally derived (compressible to fundamentals)
- DISTANCE in the vector space = semantic similarity (concepts cluster when structurally dependent, repel when oppositional)
- TOPOLOGY reveals structure hidden in linear language: Grammar forces sequential ordering, but meaning is multidimensional
- VOIDS are meaningful: Gaps between clusters show opposition structures where concepts define themselves by what they're NOT
- The shape IS the answer, not a visualization: The wavefunction collapsed into THIS unique configuration, revealing latent structure

QUESTION: "${question}"

ASSEMBLED TOPOLOGY:
- ${topology.nodes} concepts crystallized from quantum superposition
- Network density: ${(topology.density * 100).toFixed(1)}%
- Fundamental archetypes (magenta, R>7, resist compression): ${fundamentalConcepts.join(', ')}
- Peripheral concepts (red, R<3, collapsible to fundamentals): ${peripheralConcepts.join(', ')}
- Spatial clusters that emerged: ${clusterDescriptions}

TASK:
Explain what NEW KNOWLEDGE this vector space topology reveals that couldn't be seen in linear language. Focus on:
1. HIDDEN VECTOR DEPENDENCIES: Which concepts emerged as coupled in the vector space despite being separated in language/grammar?
2. VOID STRUCTURES: What do the gaps between clusters reveal about oppositional definitions (concepts defining themselves by negation)?
3. CURVATURE HIERARCHY: What does the distribution of high/low curvature reveal about which concepts are axiomatic vs emergent/derived?
4. DIMENSIONAL COLLAPSE: What multidimensional relationships does the 3D projection reveal that linear text obscures?

Respond in 3-4 sentences. Be SPECIFIC about THIS topology. Use the actual concept names. What vector relationships crystallized that language's sequential structure hides?`;

        const { queryGroq } = await import('./groq_agent.js');
        const response = await queryGroq(prompt);

        if (response) {
            console.log('✓ Shape meaning explanation generated');
            displayShapeMeaning(response);
        }

    } catch (error) {
        console.error('Error generating shape meaning:', error);
    }
}

// Identify clusters of nearby concepts
function identifyConceptClusters() {
    const clusters = [];
    const processed = new Set();
    const clusterRadius = 4; // Distance threshold for clustering

    particles.forEach(particle => {
        if (!particle.word || processed.has(particle)) return;

        const cluster = {
            center: particle,
            members: [particle.word]
        };

        // Find nearby words
        particles.forEach(other => {
            if (!other.word || other === particle || processed.has(other)) return;

            const dist = particle.mesh.position.distanceTo(other.mesh.position);
            if (dist < clusterRadius) {
                cluster.members.push(other.word);
                processed.add(other);
            }
        });

        if (cluster.members.length > 1) {
            clusters.push(cluster);
            processed.add(particle);
        }
    });

    return clusters.slice(0, 5); // Top 5 clusters
}

function displayShapeMeaning(explanation) {
    const panel = document.getElementById('meaning-panel');
    if (!panel) return;

    const meaningText = panel.querySelector('.meaning-text');
    if (meaningText) {
        meaningText.innerHTML = `<strong>What This Shape Reveals:</strong><br><br>${explanation}`;
    }

    console.log('📝 Shape meaning displayed');
}

function displayTopologyResponse(response, fundamentalConcepts) {
    const panel = document.getElementById('response-panel');
    if (!panel) {
        console.log('Response panel not found - logging response:');
        console.log('📝', response);
        return;
    }

    const responseText = document.getElementById('response-text');
    const conceptsList = document.getElementById('response-concepts');

    if (responseText) {
        responseText.textContent = response;
    }

    if (conceptsList) {
        conceptsList.innerHTML = fundamentalConcepts
            .map(word => `<span class="concept-tag">${word}</span>`)
            .join('');
    }

    // Show panel with animation
    panel.classList.add('visible');

    console.log('📝 Response displayed:', response);
}

// =============================================================================
// TOPOLOGY ANALYSIS
// =============================================================================

function analyzeTopology() {
    const topology = {
        nodes: particles.length,
        edges: connections.length,
        density: connections.length / (particles.length * (particles.length - 1) / 2),
        centerOfMass: new THREE.Vector3(),
        boundingSphere: 0,
        clusters: []
    };

    // Center of mass
    particles.forEach(p => topology.centerOfMass.add(p.mesh.position));
    topology.centerOfMass.divideScalar(particles.length);

    // Bounding sphere
    particles.forEach(p => {
        const dist = p.mesh.position.distanceTo(topology.centerOfMass);
        if (dist > topology.boundingSphere) {
            topology.boundingSphere = dist;
        }
    });

    // Average connections per node
    const degreeSum = connections.length * 2;
    topology.avgDegree = degreeSum / particles.length;

    console.log('Topology:', topology);
    return topology;
}

function displayTopology(topology) {
    const panel = document.getElementById('topology-panel');
    if (!panel) {
        console.log('Topology:', topology);
        return; // Panel doesn't exist in minimal UI, just log it
    }

    panel.innerHTML = `
        <h3>Topology</h3>
        <div class="metric">
            <span class="label">Nodes:</span>
            <span class="value">${topology.nodes}</span>
        </div>
        <div class="metric">
            <span class="label">Connections:</span>
            <span class="value">${topology.edges}</span>
        </div>
        <div class="metric">
            <span class="label">Density:</span>
            <span class="value">${(topology.density * 100).toFixed(1)}%</span>
        </div>
        <div class="metric">
            <span class="label">Avg Degree:</span>
            <span class="value">${topology.avgDegree.toFixed(1)}</span>
        </div>
        <div class="metric">
            <span class="label">Radius:</span>
            <span class="value">${topology.boundingSphere.toFixed(1)}</span>
        </div>
    `;
    panel.style.display = 'block';
}

// =============================================================================
// ANIMATION
// =============================================================================

function animateParticle(particle, target, duration) {
    const start = particle.mesh.position.clone();
    const startTime = performance.now();

    function animate() {
        const elapsed = performance.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        particle.mesh.position.lerpVectors(start, target, eased);

        if (t < 1) {
            requestAnimationFrame(animate);
        }
    }

    animate();
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);

    const input = document.getElementById('question-input');
    const resetBtn = document.getElementById('reset-btn');
    const askBtn = document.getElementById('ask-btn');
    const statusEl = document.getElementById('status-text') || document.getElementById('status');
    const hintEl = document.getElementById('hint');
    const interfaceEl = document.getElementById('interface');

    // Enter key to collapse (works at any time - can interrupt decay!)
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const question = input.value.trim();
            if (!question) return;

            // Can interrupt any state
            console.log(`🔄 New question asked - interrupting current state: ${particleState}`);

            // Clear input field
            input.value = '';

            // Show reset button
            if (resetBtn) resetBtn.classList.add('visible');

            // Interrupt and collapse to new shape
            collapseToShape(question);
        }
    });

    // Ask button (if exists)
    if (askBtn) {
        askBtn.addEventListener('click', () => {
            const question = input.value.trim();
            if (!question) {
                alert('Enter a question to collapse the wavefunction');
                return;
            }

            collapseToShape(question);
        });
    }

    // Reset button
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            enterSuperposition();

            // Show interface again
            if (interfaceEl) interfaceEl.classList.remove('hidden');
            if (hintEl) hintEl.classList.remove('hidden');
            resetBtn.classList.remove('visible');

            // Clear input
            input.value = '';

            // Update status
            if (statusEl) statusEl.textContent = 'Wave field in superposition — pure potential';

            // Hide topology panel if exists
            const topologyPanel = document.getElementById('topology-panel');
            if (topologyPanel) topologyPanel.style.display = 'none';
        });
    }

    // Close response panel - show meaning explanation
    const closeResponseBtn = document.getElementById('close-response');
    if (closeResponseBtn) {
        closeResponseBtn.addEventListener('click', async () => {
            const panel = document.getElementById('response-panel');
            if (panel) panel.classList.remove('visible');

            // Generate and show meaning explanation
            const meaningPanel = document.getElementById('meaning-panel');
            if (meaningPanel) {
                meaningPanel.classList.add('visible');

                // Generate Groq-powered explanation of what the shape reveals
                if (currentSpace && previousQuestion) {
                    await generateShapeMeaningExplanation(previousQuestion, currentSpace);
                }
            }
        });
    }

    // Close meaning panel
    const closeMeaningBtn = document.getElementById('close-meaning');
    if (closeMeaningBtn) {
        closeMeaningBtn.addEventListener('click', () => {
            const panel = document.getElementById('meaning-panel');
            if (panel) panel.classList.remove('visible');

            // Show void controls after understanding the shape
            const voidControls = document.getElementById('void-controls');
            if (voidControls) {
                setTimeout(() => {
                    voidControls.classList.add('visible');
                }, 300);
            }
        });
    }

    // Void layer controls
    const toggleVoidBtn = document.getElementById('toggle-void');
    if (toggleVoidBtn) {
        toggleVoidBtn.addEventListener('click', () => {
            toroidalElements.forEach(el => {
                if (el.userData.type === 'voidCore' || el.userData.type === 'voidGlow') {
                    el.visible = !el.visible;
                }
            });
            toggleVoidBtn.classList.toggle('active');
        });
    }

    const toggleTorusBtn = document.getElementById('toggle-torus');
    if (toggleTorusBtn) {
        toggleTorusBtn.addEventListener('click', () => {
            toroidalElements.forEach(el => {
                if (el.userData.type === 'toroidalSurface') {
                    el.visible = !el.visible;
                }
            });
            toggleTorusBtn.classList.toggle('active');
        });
    }

    const toggleParticlesBtn = document.getElementById('toggle-particles');
    if (toggleParticlesBtn) {
        toggleParticlesBtn.addEventListener('click', () => {
            attractionParticles.forEach(p => {
                p.mesh.visible = !p.mesh.visible;
            });
            toggleParticlesBtn.classList.toggle('active');
        });
    }

    const toggleFlowBtn = document.getElementById('toggle-flow');
    if (toggleFlowBtn) {
        toggleFlowBtn.addEventListener('click', () => {
            toroidalElements.forEach(el => {
                if (el.userData.type === 'flowLine') {
                    el.visible = !el.visible;
                }
            });
            toggleFlowBtn.classList.toggle('active');
        });
    }

    // Mouse move for particle hover detection
    window.addEventListener('mousemove', (event) => {
        // Normalize mouse coordinates to -1 to 1 range
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    });

    // Spacebar to toggle decay pause (for inspection)
    window.addEventListener('keydown', (event) => {
        if (event.code === 'Space' && assemblyPhase === 'ASSEMBLED' && isDecaying) {
            event.preventDefault(); // Prevent page scroll
            decayPaused = !decayPaused;

            if (decayPaused) {
                console.log('⏸️ Decay paused - inspect the shape');
                if (statusEl) statusEl.textContent = 'Decay paused - inspecting shape (press SPACE to resume)';
                controls.autoRotate = false; // Stop rotation for inspection
            } else {
                console.log('▶️ Decay resumed');
                if (statusEl) statusEl.textContent = 'Context decaying into void...';
                controls.autoRotate = true;
            }
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// =============================================================================
// PARTICLE INSPECTION
// =============================================================================

function updateParticleHover() {
    // Only detect hover when assembled
    if (assemblyPhase !== 'ASSEMBLED' || particles.length === 0) {
        hideInspectionPanel();
        return;
    }

    // Update raycaster from mouse position
    raycaster.setFromCamera(mouse, camera);

    // Get all particle meshes
    const particleMeshes = particles.map(p => p.mesh).filter(m => m);

    // Check for intersections
    const intersects = raycaster.intersectObjects(particleMeshes);

    if (intersects.length > 0) {
        // Find the particle object from the mesh
        const intersectedMesh = intersects[0].object;
        const particle = particles.find(p => p.mesh === intersectedMesh);

        if (particle && particle !== hoveredParticle) {
            // New particle hovered
            hoveredParticle = particle;
            highlightParticle(particle, true);
            showInspectionPanel(particle);
        }
    } else {
        // No hover
        if (hoveredParticle) {
            highlightParticle(hoveredParticle, false);
            hoveredParticle = null;
            hideInspectionPanel();
        }
    }
}

function highlightParticle(particle, highlight) {
    if (!particle || !particle.mesh) return;

    if (highlight) {
        // Scale up and add glow
        particle.mesh.scale.setScalar(1.5);
        if (particle.mesh.material) {
            particle.mesh.material.emissiveIntensity = 2.0;
        }
    } else {
        // Restore original scale
        const baseScale = particle.isCoreNode ? 1.0 : (particle.sizeVariation || 0.7);
        particle.mesh.scale.setScalar(baseScale);
        if (particle.mesh.material) {
            particle.mesh.material.emissiveIntensity = 1.0;
        }
    }
}

function showInspectionPanel(particle) {
    const panel = document.getElementById('inspection-panel');
    if (!panel) return;

    const wordEl = document.getElementById('inspect-word');
    const curvatureEl = document.getElementById('inspect-curvature');
    const typeEl = document.getElementById('inspect-type');
    const parentEl = document.getElementById('inspect-parent');

    if (wordEl) {
        wordEl.textContent = particle.word || 'N/A';
        wordEl.style.color = particle.isCoreNode ? '#00ffff' : '#ffffff';
    }

    if (curvatureEl) {
        const curvature = particle.curvature !== undefined ? particle.curvature.toFixed(2) : 'N/A';
        curvatureEl.textContent = curvature;

        // Color code by curvature
        if (particle.curvature !== undefined) {
            if (particle.curvature > 7) {
                curvatureEl.style.color = '#ff00ff'; // Fundamental - Magenta
            } else if (particle.curvature > 5) {
                curvatureEl.style.color = '#00ffff'; // Balanced - Cyan
            } else if (particle.curvature > 3) {
                curvatureEl.style.color = '#ff8844'; // Specific - Orange
            } else {
                curvatureEl.style.color = '#ff3333'; // Peripheral - Red
            }
        }
    }

    if (typeEl) {
        typeEl.textContent = particle.isCoreNode ? 'Core Semantic' : 'Fibonacci Satellite';
        typeEl.style.color = particle.isCoreNode ? '#00ffff' : 'rgba(255, 255, 255, 0.7)';
    }

    if (parentEl) {
        if (particle.isCoreNode) {
            parentEl.textContent = 'N/A (Core)';
            parentEl.style.color = 'rgba(255, 255, 255, 0.5)';
        } else if (particle.parentNode && particle.parentNode.word) {
            const dist = particle.distanceFromParent !== undefined ?
                ` (${particle.distanceFromParent.toFixed(1)} units)` : '';
            parentEl.textContent = particle.parentNode.word + dist;
            parentEl.style.color = '#ffffff';
        } else {
            parentEl.textContent = 'Unknown';
            parentEl.style.color = 'rgba(255, 255, 255, 0.5)';
        }
    }

    panel.classList.add('visible');
}

function hideInspectionPanel() {
    const panel = document.getElementById('inspection-panel');
    if (panel) {
        panel.classList.remove('visible');
    }
}

// =============================================================================
// MAIN LOOP
// =============================================================================

function animate() {
    requestAnimationFrame(animate);

    animateWaveField(); // Quantum wave field in superposition
    updateBrownianMotion();
    updateConnections();
    updateWordLabels();
    updateContextDecay();
    updateParticleHover(); // Check for hovered particles
    animateAttractionParticles(); // Animate void attraction
    controls.update();

    composer.render();
    labelRenderer.render(scene, camera);
}

// =============================================================================
// START
// =============================================================================

init().catch(error => {
    console.error('Initialization failed:', error);
});
