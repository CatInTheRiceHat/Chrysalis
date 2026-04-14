import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export default function ButterflyCanvas({ size = 520 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    // --- Scene ---
    const scene = new THREE.Scene();

    // --- Environment map for glass reflections (required for transmission to look good) ---
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment()).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    // --- Lights ---
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    // Warm top-right key light
    const keyLight = new THREE.DirectionalLight(0xffd6f0, 3.5);
    keyLight.position.set(2, 3, 2);
    scene.add(keyLight);

    // Cool teal fill from lower-left
    const fillLight = new THREE.DirectionalLight(0xb8f0ff, 2.0);
    fillLight.position.set(-2, -1, 1);
    scene.add(fillLight);

    // Purple rim backlight — pulses to give a living glow
    const rimLight = new THREE.PointLight(0xd8b4fe, 6.0, 10);
    rimLight.position.set(0, 0, -1.5);
    scene.add(rimLight);

    // Mint highlight from above
    const topLight = new THREE.PointLight(0xa7f3d0, 3.0, 8);
    topLight.position.set(0, 3, 1);
    scene.add(topLight);

    // --- Glass material ---
    // clearcoat + transmission = defined 3D glass look with visible structure
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xc8e8ff,
      transmission: 0.72,        // partial transparency — keeps wing silhouette defined
      thickness: 1.8,            // optical depth, makes wings look thick/3D
      roughness: 0.08,           // near-smooth but not mirror — catches edge light
      metalness: 0.0,
      ior: 1.52,                 // glass index of refraction
      clearcoat: 1.0,            // top gloss layer — the main driver of the 3D pop
      clearcoatRoughness: 0.05,
      iridescence: 1.0,          // rainbow thin-film shimmer
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [100, 600],
      envMapIntensity: 2.2,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });

    // Darker, solid material for body/antennae
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a0a2e,
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    });

    // --- Load GLB ---
    let mixer = null;
    let butterfly = null;
    const loader = new GLTFLoader();

    loader.load(
      '/animated_butterfly.glb',
      (gltf) => {
        butterfly = gltf.scene;

        // Auto-scale to fit nicely in view
        const box = new THREE.Box3().setFromObject(butterfly);
        const bSize = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(bSize.x, bSize.y, bSize.z);
        const scale = 2.0 / maxDim;
        butterfly.scale.setScalar(scale);

        // Center the model
        const center = box.getCenter(new THREE.Vector3());
        butterfly.position.sub(center.multiplyScalar(scale));

        // Apply glass material to wings, body mat to small/dark meshes
        butterfly.traverse((child) => {
          if (!child.isMesh) return;
          const isBody =
            child.name.toLowerCase().includes('body') ||
            child.name.toLowerCase().includes('thorax') ||
            child.name.toLowerCase().includes('abdomen') ||
            child.name.toLowerCase().includes('antenna');

          child.material = isBody ? bodyMat : glassMat;
          child.castShadow = false;
          child.receiveShadow = false;
        });

        scene.add(butterfly);

        // Hook up built-in GLB animations
        if (gltf.animations && gltf.animations.length > 0) {
          mixer = new THREE.AnimationMixer(butterfly);
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.play();
          });
        }
      },
      undefined,
      (err) => console.error('GLB load error:', err)
    );

    // --- Mouse parallax ---
    let targetRotX = 0;
    let targetRotY = 0;
    const handleMouseMove = (e) => {
      const { innerWidth, innerHeight } = window;
      targetRotY = ((e.clientX / innerWidth) - 0.5) * 0.5;
      targetRotX = ((e.clientY / innerHeight) - 0.5) * -0.3;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // --- Animation loop ---
    const clock = new THREE.Clock();
    let rafId;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Tick GLB animation mixer
      if (mixer) mixer.update(delta);

      if (butterfly) {
        // Floating bob
        butterfly.position.y = Math.sin(t * 0.8) * 0.12;

        // Smooth mouse parallax
        butterfly.rotation.x += (targetRotX - butterfly.rotation.x) * 0.05;
        butterfly.rotation.y += (targetRotY - butterfly.rotation.y) * 0.05;

        // Gentle slow sway
        butterfly.rotation.z = Math.sin(t * 0.35) * 0.04;
      }

      // Pulse rim light
      rimLight.intensity = 5.5 + Math.sin(t * 1.5) * 2.0;

      renderer.render(scene, camera);
    };

    animate();

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleMouseMove);
      if (mixer) mixer.stopAllAction();
      renderer.dispose();
      glassMat.dispose();
      bodyMat.dispose();
      envTexture.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size }}
      className="pointer-events-none"
      aria-hidden="true"
    />
  );
}
