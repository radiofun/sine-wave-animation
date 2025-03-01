import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Global variables
let scene, camera, renderer, controls;
let objects = [];
let clock = new THREE.Clock();

// Configuration - default values
const DEFAULT_CONFIG = {
    GRID_SIZE: 50,
    SPACING: 0.5,
    AMPLITUDE: 0.5,
    FREQUENCY: 0.5,
    SPEED: 1.0
};

// Current configuration (can be modified by UI)
let config = {
    GRID_SIZE: DEFAULT_CONFIG.GRID_SIZE,
    SPACING: DEFAULT_CONFIG.SPACING,
    AMPLITUDE: DEFAULT_CONFIG.AMPLITUDE,
    FREQUENCY: DEFAULT_CONFIG.FREQUENCY,
    SPEED: DEFAULT_CONFIG.SPEED
};

// Initial camera position
const INITIAL_CAMERA_POSITION = { x: 0, y: 15, z: 20 };
const INITIAL_CAMERA_TARGET = { x: 0, y: 0, z: 0 };

// Wave type (can be changed to try different patterns)
// Options: 'sine', 'fbm', 'ripple', 'noise', 'circular', 'combined'
let currentWaveType = 'combined';

// Noise functions for FBM
function noise2D(x, z) {
    return Math.sin(x * 1.5) * Math.sin(z * 1.5) * 0.5 + 0.5;
}

function fbm(x, z, octaves = 4, lacunarity = 2.0, gain = 0.5) {
    let amplitude = 1.0;
    let frequency = 1.0;
    let total = 0;
    let maxValue = 0;
    
    for (let i = 0; i < octaves; i++) {
        total += amplitude * noise2D(x * frequency, z * frequency);
        maxValue += amplitude;
        amplitude *= gain;
        frequency *= lacunarity;
    }
    
    return total / maxValue;
}

// Initialize scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(INITIAL_CAMERA_POSITION.x, INITIAL_CAMERA_POSITION.y, INITIAL_CAMERA_POSITION.z);
    camera.lookAt(INITIAL_CAMERA_TARGET.x, INITIAL_CAMERA_TARGET.y, INITIAL_CAMERA_TARGET.z);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Create objects
    createObjects();

    // Add window resize handler
    window.addEventListener('resize', onWindowResize);
    
    // Add keyboard controls for changing wave type
    window.addEventListener('keydown', onKeyDown);
    
    // Add UI controls
    setupUIControls();

    // Start animation loop
    animate();
}

// Reset camera to initial position
function resetCamera() {
    // Create a smooth transition
    const duration = 1000; // milliseconds
    const startTime = Date.now();
    
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    
    const endPosition = new THREE.Vector3(
        INITIAL_CAMERA_POSITION.x,
        INITIAL_CAMERA_POSITION.y,
        INITIAL_CAMERA_POSITION.z
    );
    
    const endTarget = new THREE.Vector3(
        INITIAL_CAMERA_TARGET.x,
        INITIAL_CAMERA_TARGET.y,
        INITIAL_CAMERA_TARGET.z
    );
    
    function animateReset() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease function (cubic ease out)
        const ease = 1 - Math.pow(1 - progress, 3);
        
        // Interpolate position
        camera.position.lerpVectors(startPosition, endPosition, ease);
        
        // Interpolate target
        controls.target.lerpVectors(startTarget, endTarget, ease);
        
        // Update controls
        controls.update();
        
        // Continue animation if not complete
        if (progress < 1) {
            requestAnimationFrame(animateReset);
        }
    }
    
    // Start animation
    animateReset();
    
    console.log('Camera view reset');
}

// Apply configuration changes and recreate objects
function applyConfigChanges() {
    // Clear existing objects
    objects.forEach(object => {
        scene.remove(object);
    });
    objects = [];
    
    // Create new objects with updated configuration
    createObjects();
    
    console.log('Applied configuration changes:', config);
}

// Reset configuration to defaults
function resetConfigToDefaults() {
    config = { ...DEFAULT_CONFIG };
    
    // Update UI
    document.getElementById('gridSize').value = config.GRID_SIZE;
    document.getElementById('gridSizeSlider').value = config.GRID_SIZE;
    document.getElementById('spacing').value = config.SPACING;
    document.getElementById('spacingSlider').value = config.SPACING;
    document.getElementById('amplitude').value = config.AMPLITUDE;
    document.getElementById('amplitudeSlider').value = config.AMPLITUDE;
    document.getElementById('frequency').value = config.FREQUENCY;
    document.getElementById('frequencySlider').value = config.FREQUENCY;
    document.getElementById('speed').value = config.SPEED;
    document.getElementById('speedSlider').value = config.SPEED;
    
    // Apply changes
    applyConfigChanges();
    
    console.log('Reset to default configuration');
}

// Setup UI controls
function setupUIControls() {
    // Wave type select
    const waveTypeSelect = document.getElementById('waveType');
    waveTypeSelect.value = currentWaveType;
    waveTypeSelect.addEventListener('change', function() {
        currentWaveType = this.value;
        console.log('Wave type changed to:', currentWaveType);
    });
    
    // Parameter controls - sync sliders and number inputs
    setupParameterControl('gridSize', 'GRID_SIZE');
    setupParameterControl('spacing', 'SPACING');
    setupParameterControl('amplitude', 'AMPLITUDE');
    setupParameterControl('frequency', 'FREQUENCY');
    setupParameterControl('speed', 'SPEED');
    
    // Apply changes button
    document.getElementById('applyChanges').addEventListener('click', applyConfigChanges);
    
    // Reset defaults button
    document.getElementById('resetDefaults').addEventListener('click', resetConfigToDefaults);
}

// Setup parameter control (slider + number input)
function setupParameterControl(paramId, configKey) {
    const numberInput = document.getElementById(paramId);
    const sliderInput = document.getElementById(paramId + 'Slider');
    
    // Set initial values
    numberInput.value = config[configKey];
    sliderInput.value = config[configKey];
    
    // Sync slider to number input
    numberInput.addEventListener('input', function() {
        sliderInput.value = this.value;
        config[configKey] = parseFloat(this.value);
    });
    
    // Sync number input to slider
    sliderInput.addEventListener('input', function() {
        numberInput.value = this.value;
        config[configKey] = parseFloat(this.value);
    });
}

// Handle key presses to change wave type
function onKeyDown(event) {
    const waveTypeSelect = document.getElementById('waveType');
    
    switch(event.key) {
        case '1':
            currentWaveType = 'sine';
            waveTypeSelect.value = currentWaveType;
            console.log('Wave type: Sine Wave');
            break;
        case '2':
            currentWaveType = 'fbm';
            waveTypeSelect.value = currentWaveType;
            console.log('Wave type: Fractal Brownian Motion (FBM)');
            break;
        case '3':
            currentWaveType = 'ripple';
            waveTypeSelect.value = currentWaveType;
            console.log('Wave type: Ripple');
            break;
        case '4':
            currentWaveType = 'noise';
            waveTypeSelect.value = currentWaveType;
            console.log('Wave type: Noise');
            break;
        case '5':
            currentWaveType = 'circular';
            waveTypeSelect.value = currentWaveType;
            console.log('Wave type: Circular');
            break;
        case '6':
            currentWaveType = 'combined';
            waveTypeSelect.value = currentWaveType;
            console.log('Wave type: Combined');
            break;
        case 'r':
            resetCamera();
            break;
    }
}

// Create grid of objects
function createObjects() {
    const colors = [
        0xffffff
    ];

    const geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);

    const halfGrid = Math.floor(config.GRID_SIZE / 2);
    
    for (let x = -halfGrid; x <= halfGrid; x++) {
        for (let z = -halfGrid; z <= halfGrid; z++) {
            const material = new THREE.MeshPhongMaterial({
                color: colors[Math.floor(Math.random() * colors.length)],
                shininess: 100
            });
            
            const cube = new THREE.Mesh(geometry, material);
            
            // Set initial position
            cube.position.x = x * config.SPACING;
            cube.position.y = 0;
            cube.position.z = z * config.SPACING;
            
            // Store original position for animation
            cube.userData.originalPosition = {
                x: cube.position.x,
                y: cube.position.y,
                z: cube.position.z
            };
            
            scene.add(cube);
            objects.push(cube);
        }
    }
}

// Update objects with different wave animations
function updateObjects(time) {
    objects.forEach(object => {
        const originalPos = object.userData.originalPosition;
        let waveY = 0;
        
        switch(currentWaveType) {
            case 'sine':
                // Original sine wave pattern
                const distance = Math.sqrt(originalPos.x * originalPos.x + originalPos.z * originalPos.z);
                const offset = distance * config.FREQUENCY;
                waveY = Math.sin(time * config.SPEED + offset) * config.AMPLITUDE;
                break;
                
            case 'fbm':
                // Fractal Brownian Motion
                const scale = 0.1;
                waveY = (fbm(originalPos.x * scale, originalPos.z * scale, 4, 2.0, 0.5) * 2 - 1) * config.AMPLITUDE;
                // Add time-based movement
                waveY *= Math.sin(time * 3.5) + 1;
                break;
                
            case 'ripple':
                // Ripple effect (expanding circles)
                const dist = Math.sqrt(originalPos.x * originalPos.x + originalPos.z * originalPos.z);
                waveY = Math.sin(dist - time * 2) * config.AMPLITUDE;
                break;
                
            case 'noise':
                // Simple noise pattern
                waveY = Math.sin(originalPos.x * 0.5 + time) * Math.cos(originalPos.z * 0.5 + time) * config.AMPLITUDE;
                break;
                
            case 'circular':
                // Circular wave pattern
                const angle = Math.atan2(originalPos.z, originalPos.x);
                waveY = Math.sin(angle * 5 + time * 2) * config.AMPLITUDE;
                break;
                
            case 'combined':
                // Combined patterns
                const d = Math.sqrt(originalPos.x * originalPos.x + originalPos.z * originalPos.z);
                const a = Math.atan2(originalPos.z, originalPos.x);
                waveY = Math.sin(d - time * 2) * 0.3 + Math.sin(a * 3 + time) * 0.3;
                waveY *= config.AMPLITUDE / 0.5; // Scale by amplitude ratio
                break;
        }
        
        // Apply the wave to y-position
        object.position.y = originalPos.y + waveY;
        
        // Add rotation based on the wave
        object.rotation.x = waveY * 3.0;
        object.rotation.z = waveY * 3.5;
        
        // Scale based on wave height
        const scale = 1 + waveY * 0.5;
        object.scale.set(scale, scale, scale);
    });
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Get elapsed time
    const time = clock.getElapsedTime();
    
    // Update objects
    updateObjects(time);
    
    // Update controls
    controls.update();
    
    // Render scene
    renderer.render(scene, camera);
}

// Initialize the application
init();
