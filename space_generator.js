// =============================================================================
// SEMANTIC SPACE GENERATOR - Question-to-Space System
// =============================================================================

import { queryGroq } from './groq_agent.js';

class SemanticSpaceGenerator {
    constructor() {
        this.generatedWords = [];
        this.distanceMatrix = [];
        this.curvatureValues = [];
        this.isGenerating = false;
        this.useSimpleMode = false; // Use Groq LLM for ultra-fast semantic space generation
    }

    // Main entry point: Generate space from question
    async generateSpace(question, onProgress) {
        this.isGenerating = true;

        try {
            if (this.useSimpleMode) {
                // Simple mode: Skip LLM, generate positions mathematically
                onProgress({ phase: 'GENERATING', progress: 50, message: 'Generating shape (simple mode)...' });

                const numPoints = 200;
                const positions = this.generateSimplePositions(numPoints, question);

                onProgress({ phase: 'COMPLETE', progress: 100, message: 'Shape generated!' });

                return {
                    words: [],
                    distances: [],
                    curvatures: [],
                    positions: positions,
                    question: question
                };
            }

            // LLM mode (original)
            onProgress({ phase: 'GENERATING_WORDS', progress: 10, message: 'Asking LLM for core concepts...' });
            const words = await this.generateCoreWords(question);
            onProgress({ phase: 'WORDS_GENERATED', progress: 30, message: `Generated ${words.length} words`, data: words });

            onProgress({ phase: 'CALCULATING_DISTANCES', progress: 40, message: 'Measuring semantic distances...' });
            const distances = await this.buildDistanceMatrix(words, onProgress);
            onProgress({ phase: 'DISTANCES_CALCULATED', progress: 70, message: 'Distance matrix complete' });

            onProgress({ phase: 'CALCULATING_CURVATURE', progress: 80, message: 'Rating archetypal weights...' });
            const curvatures = await this.calculateCurvature(words);
            onProgress({ phase: 'CURVATURE_CALCULATED', progress: 90, message: 'Curvature values computed' });

            onProgress({ phase: 'PROJECTING_SPACE', progress: 95, message: 'Projecting to 3D space...' });
            const positions = this.projectTo3D(words, distances);

            onProgress({ phase: 'COMPLETE', progress: 100, message: 'Space generation complete!' });

            return {
                words: words,
                distances: distances,
                curvatures: curvatures,
                positions: positions,
                question: question
            };

        } catch (error) {
            if (onProgress) {
                onProgress({ phase: 'ERROR', progress: 0, message: error.message });
            }
            throw error;
        } finally {
            this.isGenerating = false;
        }
    }

    // Simple mathematical position generation (no LLM needed)
    generateSimplePositions(count, question) {
        const positions = [];

        // Use question to seed random pattern
        let seed = 0;
        for (let i = 0; i < question.length; i++) {
            seed = ((seed << 5) - seed) + question.charCodeAt(i);
        }
        seed = Math.abs(seed);

        // Generate positions in interesting pattern
        const patternType = seed % 3;

        for (let i = 0; i < count; i++) {
            const t = i / count;
            const angle = t * Math.PI * 2;
            let x, y, z;

            switch(patternType) {
                case 0: // Organic sphere
                    const phi = Math.acos(2 * t - 1);
                    const theta = angle * 3 + seed * t;
                    const r = 8 + 2 * Math.sin(seed * t * 5);
                    x = r * Math.sin(phi) * Math.cos(theta);
                    y = r * Math.sin(phi) * Math.sin(theta);
                    z = r * Math.cos(phi);
                    break;

                case 1: // Spiral
                    const radius = 6 + 2 * t;
                    x = radius * Math.cos(angle * 4);
                    y = (t - 0.5) * 15;
                    z = radius * Math.sin(angle * 4);
                    break;

                case 2: // Clustered
                    const clusters = 4;
                    const cluster = Math.floor(t * clusters);
                    const clusterAngle = (cluster / clusters) * Math.PI * 2;
                    const localR = 3 + Math.random() * 2;
                    const localAngle = t * clusters * Math.PI * 2;
                    x = 8 * Math.cos(clusterAngle) + localR * Math.cos(localAngle);
                    y = (Math.random() - 0.5) * 8;
                    z = 8 * Math.sin(clusterAngle) + localR * Math.sin(localAngle);
                    break;
            }

            positions.push({ x, y, z });
        }

        return positions;
    }

    // Phase 1: Generate core words from question
    async generateCoreWords(question) {
        const prompt = `List 30 words related to: ${question}

Reply with ONLY the words, comma-separated, no explanations.
Example: consciousness, awareness, mind, thought, perception, cognition, sentience, intelligence, experience, qualia, attention, memory, self, identity, understanding

30 words:`;

        const response = await queryGroq(prompt);
        if (!response) {
            throw new Error('Failed to generate words from LLM');
        }

        // Parse comma-separated words
        const words = response
            .toLowerCase()
            .split(',')
            .map(w => w.trim())
            .filter(w => w.length > 2 && w.length < 25)
            .filter(w => /^[a-z\s-]+$/.test(w)) // Only letters, spaces, hyphens
            .slice(0, 30); // Limit to 30

        console.log(`Generated ${words.length} words:`, words);
        return words;
    }

    // Phase 2: Build distance matrix (simplified for local LLM)
    async buildDistanceMatrix(words, onProgress) {
        const n = words.length;
        const matrix = Array(n).fill(null).map(() => Array(n).fill(0));

        let processed = 0;

        for (let i = 0; i < n; i++) {
            // For each word, get distances to 3 neighbors only
            const neighbors = [];
            for (let j = 0; j < n; j++) {
                if (i !== j) neighbors.push(words[j]);
            }

            // Sample only 3 neighbors per word (reduces API calls)
            const sampled = this.sampleArray(neighbors, Math.min(3, neighbors.length));

            const similarities = await this.batchSimilarity(words[i], sampled);

            // Fill matrix
            sampled.forEach((neighbor, idx) => {
                const j = words.indexOf(neighbor);
                const distance = 1 - similarities[idx]; // Convert similarity to distance
                matrix[i][j] = distance;
                matrix[j][i] = distance; // Symmetric
            });

            processed++;
            const progress = 40 + (processed / n) * 30; // 40% to 70%
            onProgress({
                phase: 'CALCULATING_DISTANCES',
                progress: Math.floor(progress),
                message: `Processing word ${processed}/${n}...`
            });
        }

        // Fill missing values with estimates (average of known distances)
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if (i !== j && matrix[i][j] === 0) {
                    // Estimate from triangle inequality
                    matrix[i][j] = 0.5; // Default medium distance
                }
            }
        }

        return matrix;
    }

    // Helper: Batch similarity query (simplified for Ollama)
    async batchSimilarity(word, neighbors) {
        const prompt = `Rate similarity of "${word}" to each word (0.0-1.0):
${neighbors.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Reply with only numbers, one per line:`;

        const response = await queryGroq(prompt);
        if (!response) {
            // Return default values if API fails
            return neighbors.map(() => 0.5);
        }

        // Parse numbers from response
        const numbers = response
            .split('\n')
            .map(line => parseFloat(line.trim()))
            .filter(n => !isNaN(n) && n >= 0 && n <= 1);

        // Pad with defaults if needed
        while (numbers.length < neighbors.length) {
            numbers.push(0.5);
        }

        return numbers.slice(0, neighbors.length);
    }

    // Phase 3: Calculate curvature for each word (simplified)
    async calculateCurvature(words) {
        const prompt = `Rate importance of each word (0-10):
${words.map((w, i) => `${i + 1}. ${w}`).join('\n')}

Reply with only numbers, one per line:`;

        const response = await queryGroq(prompt);
        if (!response) {
            // Return default values
            return words.map(() => 2.0);
        }

        // Parse numbers
        const ratings = response
            .split('\n')
            .map(line => parseFloat(line.trim()))
            .filter(n => !isNaN(n) && n >= 0 && n <= 10);

        // Pad with defaults
        while (ratings.length < words.length) {
            ratings.push(2.0);
        }

        return ratings.slice(0, words.length);
    }

    // Phase 4: Project to 3D space
    projectTo3D(words, distances) {
        // Simple spring-force layout (MDS alternative)
        const n = words.length;
        const positions = [];

        // Initialize random positions
        for (let i = 0; i < n; i++) {
            positions.push({
                x: (Math.random() - 0.5) * 20,
                y: (Math.random() - 0.5) * 20,
                z: (Math.random() - 0.5) * 20
            });
        }

        // Spring force iterations
        const iterations = 100;
        const k = 0.1; // Spring constant

        for (let iter = 0; iter < iterations; iter++) {
            const forces = Array(n).fill(null).map(() => ({ x: 0, y: 0, z: 0 }));

            // Calculate forces
            for (let i = 0; i < n; i++) {
                for (let j = i + 1; j < n; j++) {
                    const dx = positions[j].x - positions[i].x;
                    const dy = positions[j].y - positions[i].y;
                    const dz = positions[j].z - positions[i].z;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.1;

                    const targetDist = distances[i][j] * 10; // Scale to visible range
                    const force = k * (dist - targetDist) / dist;

                    forces[i].x += force * dx;
                    forces[i].y += force * dy;
                    forces[i].z += force * dz;

                    forces[j].x -= force * dx;
                    forces[j].y -= force * dy;
                    forces[j].z -= force * dz;
                }
            }

            // Apply forces
            for (let i = 0; i < n; i++) {
                positions[i].x += forces[i].x * 0.1;
                positions[i].y += forces[i].y * 0.1;
                positions[i].z += forces[i].z * 0.1;
            }
        }

        return positions;
    }

    // Utility: Sample random elements from array
    sampleArray(array, count) {
        const shuffled = [...array].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }

    stop() {
        this.isGenerating = false;
    }
}

export { SemanticSpaceGenerator };
