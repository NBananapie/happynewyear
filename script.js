import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Configuration ---
const FIREWORK_LIFETIME = 2.5;
const PARTICLE_COUNT = 500; // More particles for tech feel
const GRAVITY = new THREE.Vector3(0, -0.02, 0); // Lower gravity for floating effect

// --- 3D Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

camera.position.z = 80; // Pull back to see Earth

// --- Post Processing (Bloom for Neon Glow) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.5; // Stronger bloom for tech feel
bloomPass.radius = 0.8;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// --- 3D Earth Setup ---
const earthGroup = new THREE.Group();
scene.add(earthGroup);

// Use public accessible high-res textures
const textureLoader = new THREE.TextureLoader();
const earthGeometry = new THREE.SphereGeometry(25, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
    bumpMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
    bumpScale: 0.5,
    specularMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-water.png'),
    specular: new THREE.Color('grey')
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
earthGroup.add(earth);

// Clouds
const cloudGeometry = new THREE.SphereGeometry(25.3, 64, 64);
const cloudMaterial = new THREE.MeshPhongMaterial({
    map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-clouds.png'),
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
});
const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
earthGroup.add(clouds);

// Lighting for Earth
const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(50, 20, 30);
scene.add(directionalLight);

// --- Particle System Class (Tech Burst) ---
class Firework {
    constructor(position, color) {
        this.active = true;
        this.time = 0;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const velocities = new Float32Array(PARTICLE_COUNT * 3);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;

            // Spherical explosion with slight variance for tech glitch look
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = Math.random() * 3 + 1;

            velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
            velocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
            velocities[i * 3 + 2] = speed * Math.cos(phi);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.velocityData = velocities;

        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.5,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });

        this.points = new THREE.Points(geometry, material);
        scene.add(this.points);
    }

    update(delta) {
        if (!this.active) return;
        this.time += delta;
        const positions = this.points.geometry.attributes.position.array;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            positions[i * 3] += this.velocityData[i * 3] * delta * 15;
            positions[i * 3 + 1] += this.velocityData[i * 3 + 1] * delta * 15;
            positions[i * 3 + 1] += GRAVITY.y * delta * 20;
            positions[i * 3 + 2] += this.velocityData[i * 3 + 2] * delta * 15;

            // Drag
            this.velocityData[i * 3] *= 0.95;
            this.velocityData[i * 3 + 1] *= 0.95;
            this.velocityData[i * 3 + 2] *= 0.95;
        }

        this.points.geometry.attributes.position.needsUpdate = true;

        // Flicker effect
        this.points.material.opacity = Math.random() > 0.1 ? Math.max(0, 1 - (this.time / FIREWORK_LIFETIME)) : 0.2;

        if (this.time > FIREWORK_LIFETIME) {
            this.active = false;
            scene.remove(this.points);
            this.points.geometry.dispose();
            this.points.material.dispose();
        }
    }
}

const activeFireworks = [];

function launchFirework(x, y, z, color = 0x00e5ff) { // Default to Cyber Blue
    activeFireworks.push(new Firework(new THREE.Vector3(x, y, z), color));
}

// --- Background Tech Dots ---
function createBackgroundStars() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 500; i++) {
        vertices.push(
            (Math.random() - 0.5) * 200,
            (Math.random() - 0.5) * 150,
            (Math.random() - 0.5) * 100 - 50
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const material = new THREE.PointsMaterial({ color: 0x00f3ff, size: 0.2, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(geometry, material));
}
createBackgroundStars();

// --- Gesture Recognition with MediaPipe ---
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gesture-points');
const canvasCtx = canvasElement.getContext('2d');
const statusElement = document.getElementById('gesture-status');

let lastPinchState = false;

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        statusElement.innerText = "SYS_TRACKING // 锁定手势";
        statusElement.style.color = "#00e5ff";
        for (const landmarks of results.multiHandLandmarks) {
            drawTechLandmarks(landmarks);

            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const distance = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) +
                Math.pow(thumbTip.y - indexTip.y, 2)
            );

            const worldX = (0.5 - indexTip.x) * 120;
            const worldY = (0.5 - indexTip.y) * 80;
            const worldZ = 35; // Position fireworks out in front of Earth

            if (distance < 0.05) {
                launchFirework(worldX, worldY, worldZ, 0x00f3ff); // Neon Cyan spark
                statusElement.innerText = "SYS_CHARGE // 能量注入";
                lastPinchState = true;
            } else if (lastPinchState) {
                launchFirework(worldX, worldY, worldZ, 0x00e5ff); // Cyber Blue burst
                lastPinchState = false;
                statusElement.innerText = "SYS_LAUNCH // 引发耀斑";
            }

            const middleTip = landmarks[12];
            const palmDistance = Math.sqrt(
                Math.pow(indexTip.x - middleTip.x, 2) +
                Math.pow(indexTip.y - middleTip.y, 2)
            );

            if (palmDistance > 0.1 && Math.random() < 0.1) {
                statusElement.innerText = "SYS_SCATTER // 空间碎裂";
                launchFirework((Math.random() - 0.5) * 100, (Math.random() - 0.5) * 80, worldZ, 0xffffff);
            }
        }
    } else {
        statusElement.innerText = "SYS_WAIT // 扫描输入信号...";
        statusElement.style.color = "#8892b0";
    }
    canvasCtx.restore();
}

function drawTechLandmarks(landmarks) {
    canvasCtx.fillStyle = '#00f3ff';
    canvasCtx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    canvasCtx.lineWidth = 1;

    // Draw lines between joints (simplified wireframe)
    canvasCtx.beginPath();
    [0, 1, 2, 3, 4].forEach((i, idx) => idx === 0 ? canvasCtx.moveTo(landmarks[i].x * canvasElement.width, landmarks[i].y * canvasElement.height) : canvasCtx.lineTo(landmarks[i].x * canvasElement.width, landmarks[i].y * canvasElement.height));
    canvasCtx.stroke();

    // Draw points
    for (const landmark of landmarks) {
        canvasCtx.beginPath();
        canvasCtx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, 1.5, 0, 2 * Math.PI);
        canvasCtx.fill();
    }
}

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});
hands.onResults(onResults);

const cameraUtils = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
cameraUtils.start();

// --- Animation Loop ---
let lastTime = 0;
function animate(time) {
    const delta = (time - lastTime) / 1000;
    lastTime = time;

    requestAnimationFrame(animate);

    // Rotate Earth
    earth.rotation.y += 0.05 * delta;
    clouds.rotation.y += 0.06 * delta;

    let i = activeFireworks.length;
    while (i--) {
        activeFireworks[i].update(delta);
        if (!activeFireworks[i].active) {
            activeFireworks.splice(i, 1);
        }
    }

    composer.render();
}

// Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

// Click fallback
window.addEventListener('mousedown', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 120;
    const y = -(e.clientY / window.innerHeight - 0.5) * 80;
    launchFirework(x, y, 35, Math.random() > 0.5 ? 0x00e5ff : 0x00f3ff);
});

animate(0);
console.log("Earth Orbital Engine Initialized.");
