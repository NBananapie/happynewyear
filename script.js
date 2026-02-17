import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- Configuration ---
const FIREWORK_LIFETIME = 3.0;
const PARTICLE_COUNT = 400;
const GRAVITY = new THREE.Vector3(0, -0.05, 0);

// --- 3D Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

camera.position.z = 50;

// --- Post Processing (Bloom for Glow) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 1.2;
bloomPass.radius = 0.5;

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// --- Particle System Class ---
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

            // Spherical explosion
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const speed = Math.random() * 2.5 + 1.5; // Slightly faster for grander feel

            velocities[i * 3] = speed * Math.sin(phi) * Math.cos(theta);
            velocities[i * 3 + 1] = speed * Math.sin(phi) * Math.sin(theta);
            velocities[i * 3 + 2] = speed * Math.cos(phi);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.velocityData = velocities;

        const material = new THREE.PointsMaterial({
            color: color,
            size: 0.7, // Slightly larger particles
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
            this.velocityData[i * 3] *= 0.97; // Less drag for longer streaks
            this.velocityData[i * 3 + 1] *= 0.97;
            this.velocityData[i * 3 + 2] *= 0.97;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.material.opacity = Math.max(0, 1 - (this.time / FIREWORK_LIFETIME));

        if (this.time > FIREWORK_LIFETIME) {
            this.active = false;
            scene.remove(this.points);
            this.points.geometry.dispose();
            this.points.material.dispose();
        }
    }
}

const activeFireworks = [];

function launchFirework(x, y, z, color = 0xd4af37) { // Default to Imperial Gold
    activeFireworks.push(new Firework(new THREE.Vector3(x, y, z), color));
}

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
        statusElement.innerText = "灵蛇入界 · 追踪中";
        statusElement.style.color = "#d4af37";
        for (const landmarks of results.multiHandLandmarks) {
            drawLandmarks(landmarks);

            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const distance = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) +
                Math.pow(thumbTip.y - indexTip.y, 2)
            );

            const worldX = (0.5 - indexTip.x) * 100;
            const worldY = (0.5 - indexTip.y) * 60;
            const worldZ = 0;

            if (distance < 0.05) {
                launchFirework(worldX, worldY, worldZ, 0xff3300); // Crimson spark
                statusElement.innerText = "能量凝聚 · PINCHING";
                lastPinchState = true;
            } else if (lastPinchState) {
                launchFirework(worldX, worldY, worldZ, 0xf9d423); // Bright Gold burst
                lastPinchState = false;
                statusElement.innerText = "如意绽放 · RELEASED";
            }

            const middleTip = landmarks[12];
            const palmDistance = Math.sqrt(
                Math.pow(indexTip.x - middleTip.x, 2) +
                Math.pow(indexTip.y - middleTip.y, 2)
            );

            if (palmDistance > 0.1 && Math.random() < 0.1) {
                statusElement.innerText = "鸿运当头 · PALM OPEN";
                launchFirework((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50, (Math.random() - 1) * 20, 0xffffff);
            }
        }
    } else {
        statusElement.innerText = "静候指教";
        statusElement.style.color = "rgba(212, 175, 55, 0.5)";
    }
    canvasCtx.restore();
}

function drawLandmarks(landmarks) {
    canvasCtx.fillStyle = '#f9d423';
    for (const landmark of landmarks) {
        canvasCtx.beginPath();
        canvasCtx.arc(landmark.x * canvasElement.width, landmark.y * canvasElement.height, 2, 0, 2 * Math.PI);
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

    let i = activeFireworks.length;
    while (i--) {
        activeFireworks[i].update(delta);
        if (!activeFireworks[i].active) {
            activeFireworks.splice(i, 1);
        }
    }

    // Random Background Stars
    if (Math.random() < 0.02) {
        launchFirework((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 80, -50, 0x444444);
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
    const x = (e.clientX / window.innerWidth - 0.5) * 100;
    const y = -(e.clientY / window.innerHeight - 0.5) * 60;
    launchFirework(x, y, 0, Math.random() * 0xffffff);
});

animate(0);
console.log("3D Fireworks Engine Started with Hand Tracking");
