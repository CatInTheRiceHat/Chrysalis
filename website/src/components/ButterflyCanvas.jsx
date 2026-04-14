import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Wing segment annotation points (left wing)
// xp/yp = proportions across bounding box [0=min, 1=max]
// label = lines of text, dx/dy = screen-space line offset from dot to label
const WING_SEGMENTS = [
  { xp: 0.08, yp: 0.82, label: ['Wellbeing-First', 'Scoring'], dx: -90, dy: -20 },
  { xp: 0.22, yp: 0.90, label: ['Session Cap'],                 dx: -20, dy: -65 },
  { xp: 0.36, yp: 0.74, label: ['Content Diversity'],           dx:  45, dy: -50 },
  { xp: 0.37, yp: 0.44, label: ['Emotional Balance'],           dx:  50, dy:  22 },
  { xp: 0.20, yp: 0.20, label: ['Sleep-Safe Hours'],            dx: -20, dy:  65 },
  { xp: 0.10, yp: 0.36, label: ['Crisis Detection'],            dx: -90, dy:  22 },
];

const BASE_ROT = { x: -0.45, y: 0.35, z: -0.15 };

export default function ButterflyCanvas({ width = 680, height = 480 }) {
  const mountRef   = useRef(null);
  const svgRef     = useRef(null);
  const dotRefs    = useRef([]);
  const lineRefs   = useRef([]);
  const textGRefs  = useRef([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // ── Scene ──
    const scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    const envTex = pmrem.fromScene(new RoomEnvironment()).texture;
    scene.environment = envTex;
    pmrem.dispose();

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.4, 3.2);
    camera.lookAt(0, 0, 0);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const keyLight = new THREE.DirectionalLight(0xffd6f0, 3.5);
    keyLight.position.set(2, 3, 2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xb8f0ff, 2.0);
    fillLight.position.set(-2, -1, 1);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xd8b4fe, 6.0, 10);
    rimLight.position.set(0, 0, -1.5);
    scene.add(rimLight);

    const topLight = new THREE.PointLight(0xa7f3d0, 3.0, 8);
    topLight.position.set(0, 3, 1);
    scene.add(topLight);

    // Warm amber backlight — glowing-through-membrane (matches inspo photo)
    const amberLight = new THREE.PointLight(0xff8c42, 4.0, 8);
    amberLight.position.set(-0.5, 0.2, -1.2);
    scene.add(amberLight);

    // ── Materials ──
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8e8ff,
      transmission: 0.72,
      thickness: 1.8,
      roughness: 0.08,
      metalness: 0.0,
      ior: 1.52,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      iridescence: 1.0,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [100, 600],
      envMapIntensity: 2.8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a0a2e,
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    });

    // ── State shared with animation loop ──
    let butterfly = null;
    let mixer     = null;
    let baseY     = 0;
    let annPositions = []; // THREE.Vector3 in butterfly local space

    // ── Load GLB ──
    const loader = new GLTFLoader();
    loader.load(
      '/animated_butterfly.glb',
      (gltf) => {
        butterfly = gltf.scene;

        // Compute raw bounding box (before we apply our transforms)
        const rawBox  = new THREE.Box3().setFromObject(butterfly);
        const rawSize = rawBox.getSize(new THREE.Vector3());
        const maxDim  = Math.max(rawSize.x, rawSize.y, rawSize.z);
        const scale   = 2.0 / maxDim;

        butterfly.scale.setScalar(scale);

        // Center, then shift body toward right edge so wing fills the frame
        const center = rawBox.getCenter(new THREE.Vector3());
        butterfly.position.sub(center.multiplyScalar(scale));
        butterfly.position.x += 0.7;
        baseY = butterfly.position.y;

        // Dramatic angle matching the inspo photo
        butterfly.rotation.set(BASE_ROT.x, BASE_ROT.y, BASE_ROT.z);

        // Compute annotation positions in butterfly local space
        // (using rawBox proportions so they adapt to any model size)
        annPositions = WING_SEGMENTS.map(({ xp, yp }) =>
          new THREE.Vector3(
            rawBox.min.x + rawSize.x * xp,
            rawBox.min.y + rawSize.y * yp,
            rawBox.min.z + rawSize.z * 0.5,
          )
        );

        // Apply materials
        butterfly.traverse((child) => {
          if (!child.isMesh) return;
          const n = child.name.toLowerCase();
          const isBody = n.includes('body') || n.includes('thorax') ||
                         n.includes('abdomen') || n.includes('antenna');
          child.material = isBody ? bodyMat : glassMat;
          child.castShadow = false;
          child.receiveShadow = false;
        });

        scene.add(butterfly);

        // Play built-in GLB animations
        if (gltf.animations?.length) {
          mixer = new THREE.AnimationMixer(butterfly);
          gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
        }
      },
      undefined,
      (err) => console.error('GLB load error:', err)
    );

    // ── Mouse parallax ──
    let targetRotX = 0;
    let targetRotY = 0;
    const onMouseMove = (e) => {
      targetRotX = ((e.clientY / window.innerHeight) - 0.5) * -0.05;
      targetRotY = ((e.clientX / window.innerWidth)  - 0.5) *  0.08;
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── Animation loop ──
    const clock = new THREE.Clock();
    let rafId;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const t     = clock.elapsedTime;

      if (mixer) mixer.update(delta);

      if (butterfly) {
        // Float + sway on top of base position/rotation
        // Slow idle float
        butterfly.position.y  = baseY + Math.sin(t * 0.3) * 0.06;
        // Very gentle idle wing tilt (like the inspo photo — almost still, just breathing)
        butterfly.rotation.x += (BASE_ROT.x + targetRotX + Math.sin(t * 0.25) * 0.03 - butterfly.rotation.x) * 0.03;
        butterfly.rotation.y += (BASE_ROT.y + targetRotY + Math.sin(t * 0.18) * 0.02 - butterfly.rotation.y) * 0.03;
        butterfly.rotation.z  = BASE_ROT.z + Math.sin(t * 0.2) * 0.025;

        // Pulse rim light
        rimLight.intensity = 5.5 + Math.sin(t * 1.5) * 2.0;

        // Update annotation SVG elements each frame
        const svg = svgRef.current;
        if (svg && annPositions.length) {
          annPositions.forEach((localPos, i) => {
            // Transform local wing point → world → NDC → screen pixels
            const w = localPos.clone();
            butterfly.localToWorld(w);
            w.project(camera);

            const sx = (w.x + 1) / 2 * width;
            const sy = (-w.y + 1) / 2 * height;
            const { dx, dy } = WING_SEGMENTS[i];
            const ex = sx + dx;
            const ey = sy + dy;

            dotRefs.current[i]?.setAttribute('cx', sx);
            dotRefs.current[i]?.setAttribute('cy', sy);
            lineRefs.current[i]?.setAttribute('x1', sx);
            lineRefs.current[i]?.setAttribute('y1', sy);
            lineRefs.current[i]?.setAttribute('x2', ex);
            lineRefs.current[i]?.setAttribute('y2', ey);
            textGRefs.current[i]?.setAttribute('transform', `translate(${ex},${ey})`);
          });
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMouseMove);
      if (mixer) mixer.stopAllAction();
      renderer.dispose();
      glassMat.dispose();
      bodyMat.dispose();
      envTex.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  }, [width, height]);

  return (
    <div
      style={{ width, height, position: 'relative' }}
      className="pointer-events-none"
      aria-hidden="true"
    >
      {/* Three.js canvas */}
      <div ref={mountRef} style={{ width, height }} />

      {/* SVG annotation layer — sits on top, overflow visible so labels can bleed */}
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        {WING_SEGMENTS.map((seg, i) => (
          <g key={i}>
            {/* Line from wing dot to label */}
            <line
              ref={(el) => { lineRefs.current[i] = el; }}
              stroke="rgba(255,255,255,0.30)"
              strokeWidth="0.8"
              x1="0" y1="0" x2="0" y2="0"
            />
            {/* Dot on wing surface */}
            <circle
              ref={(el) => { dotRefs.current[i] = el; }}
              r="2.5"
              fill="rgba(255,255,255,0.55)"
              cx="0" cy="0"
            />
            {/* Label text group — positioned at line endpoint */}
            <g ref={(el) => { textGRefs.current[i] = el; }}>
              {seg.label.map((line, li) => (
                <text
                  key={li}
                  x={seg.dx < 0 ? -6 : 6}
                  y={li * 13 - (seg.label.length - 1) * 6}
                  textAnchor={seg.dx < 0 ? 'end' : 'start'}
                  dominantBaseline="middle"
                  fill="rgba(255,255,255,0.72)"
                  fontSize="9"
                  fontFamily="system-ui, -apple-system, sans-serif"
                  letterSpacing="1.8"
                >
                  {line.toUpperCase()}
                </text>
              ))}
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}
