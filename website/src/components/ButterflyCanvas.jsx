import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Renders a floating iridescent glass butterfly using Three.js WebGL.
 * Wing geometry is built from a custom butterfly silhouette using
 * LatheGeometry + vertex displacement. Material uses MeshPhysicalMaterial
 * with transmission, iridescence, and rainbow dispersion.
 */
export default function ButterflyCanvas({ size = 520 }) {
  const mountRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    // ── Renderer ──────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);

    // ── Scene ─────────────────────────────────────────────────────
    const scene = new THREE.Scene();

    // ── Camera ─────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 20);
    camera.position.set(0, 0.1, 3.8);
    camera.lookAt(0, 0, 0);

    // ── Lights ─────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const pinkLight = new THREE.DirectionalLight(0xffcce8, 3.5);
    pinkLight.position.set(2, 3, 2);
    scene.add(pinkLight);

    const tealLight = new THREE.DirectionalLight(0xb8f0ff, 2.5);
    tealLight.position.set(-2, -1, 2);
    scene.add(tealLight);

    const purplePoint = new THREE.PointLight(0xd8b4fe, 6.0, 8);
    purplePoint.position.set(0, 0, -1.5);
    scene.add(purplePoint);

    const mintBack = new THREE.PointLight(0xa7f3d0, 3.0, 6);
    mintBack.position.set(0, 2, -2);
    scene.add(mintBack);

    // ── Glass material ─────────────────────────────────────────────
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      metalness: 0.0,
      roughness: 0.0,
      transmission: 0.95,
      thickness: 0.4,
      ior: 1.5,
      iridescence: 1.0,
      iridescenceIOR: 1.38,
      iridescenceThicknessRange: [80, 500],
      reflectivity: 0.6,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
    });

    // ── Wing shape builder ──────────────────────────────────────────
    // Creates a wing mesh using a custom curve for the wing silhouette.
    function makeWing(isUpper, isRight) {
      // Control points for the wing outline (in local 2D space)
      // Upper wing: large teardrop-ish shape
      // Lower wing: smaller, rounder
      const shape = new THREE.Shape();

      if (isUpper) {
        shape.moveTo(0, 0);
        shape.bezierCurveTo( 0.05, 0.3,  0.6, 0.8,  0.8, 0.9);
        shape.bezierCurveTo( 1.0,  1.0,  1.1, 0.85, 1.05, 0.6);
        shape.bezierCurveTo( 1.0,  0.4,  0.7, 0.1,  0.5,  0.05);
        shape.bezierCurveTo( 0.3,  0.0,  0.1, -0.05, 0,   0);
      } else {
        shape.moveTo(0, 0);
        shape.bezierCurveTo( 0.05, -0.15, 0.5, -0.65, 0.7, -0.7);
        shape.bezierCurveTo( 0.85, -0.72, 0.9, -0.55, 0.8, -0.35);
        shape.bezierCurveTo( 0.65, -0.15, 0.3, -0.04, 0.1, -0.02);
        shape.bezierCurveTo( 0.05, -0.01, 0.01, 0, 0,  0);
      }

      const geometry = new THREE.ShapeGeometry(shape, 32);

      // Mirror for right side
      if (isRight) {
        const pos = geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          pos.setX(i, -pos.getX(i));
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
      }

      return new THREE.Mesh(geometry, glassMat);
    }

    // ── Butterfly group ────────────────────────────────────────────
    const butterfly = new THREE.Group();

    // Left wings
    const upperLeft  = makeWing(true,  false);
    const lowerLeft  = makeWing(false, false);
    // Right wings
    const upperRight = makeWing(true,  true);
    const lowerRight = makeWing(false, true);

    // Wing hinges — pivot from body centre
    const leftWingGroup  = new THREE.Group();
    const rightWingGroup = new THREE.Group();

    leftWingGroup.add(upperLeft, lowerLeft);
    rightWingGroup.add(upperRight, lowerRight);

    // Slight initial open angle
    leftWingGroup.rotation.y  =  0.18;
    rightWingGroup.rotation.y = -0.18;

    butterfly.add(leftWingGroup, rightWingGroup);

    // Body (thin dark capsule)
    const bodyGeo = new THREE.CapsuleGeometry(0.04, 0.65, 8, 16);
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a1a3a,
      roughness: 0.2,
      metalness: 0.4,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.1, 0.01);
    butterfly.add(body);

    // Antennae
    function makeAntenna(side) {
      const pts = [
        new THREE.Vector3(side * 0.03, 0.3, 0),
        new THREE.Vector3(side * 0.18, 0.55, 0),
        new THREE.Vector3(side * 0.28, 0.72, 0),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      const geo   = new THREE.TubeGeometry(curve, 12, 0.008, 6, false);
      const mat   = new THREE.MeshPhysicalMaterial({ color: 0x2a1a3a, roughness: 0.3 });
      const tube  = new THREE.Mesh(geo, mat);

      // Tip dot
      const dotGeo = new THREE.SphereGeometry(0.018, 8, 8);
      const dot    = new THREE.Mesh(dotGeo, mat);
      const tip    = pts[2];
      dot.position.copy(tip);

      const grp = new THREE.Group();
      grp.add(tube, dot);
      return grp;
    }
    butterfly.add(makeAntenna(-1), makeAntenna(1));

    // Centre the butterfly vertically
    butterfly.position.set(0, -0.15, 0);
    scene.add(butterfly);

    // ── Mouse parallax ─────────────────────────────────────────────
    const onMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      mouseRef.current = {
        x: ((e.clientX - rect.left) / rect.width  - 0.5) * 2,
        y: ((e.clientY - rect.top)  / rect.height - 0.5) * 2,
      };
    };
    window.addEventListener('mousemove', onMouseMove);

    // ── Animation loop ─────────────────────────────────────────────
    let animId;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Gentle floating
      butterfly.position.y = -0.15 + Math.sin(t * 0.8) * 0.12;

      // Wing flutter — left opens/closes slightly
      const flutter = Math.sin(t * 2.2) * 0.06;
      leftWingGroup.rotation.y  =  0.18 + flutter;
      rightWingGroup.rotation.y = -0.18 - flutter;

      // Slow sway
      butterfly.rotation.y = Math.sin(t * 0.35) * 0.10;
      butterfly.rotation.z = Math.sin(t * 0.5)  * 0.03;

      // Mouse parallax (smooth)
      butterfly.rotation.x += (mouseRef.current.y * -0.08 - butterfly.rotation.x) * 0.05;
      butterfly.rotation.y += (mouseRef.current.x *  0.08 - butterfly.rotation.y) * 0.05;

      // Animate purple point light to pulse
      purplePoint.intensity = 5.0 + Math.sin(t * 1.5) * 2.0;

      renderer.render(scene, camera);
    };

    animate();

    // ── Cleanup ────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      if (el.contains(renderer.domElement)) {
        el.removeChild(renderer.domElement);
      }
    };
  }, [size]);

  return (
    <div
      ref={mountRef}
      style={{ width: size, height: size }}
      className="pointer-events-none select-none"
      aria-hidden="true"
    />
  );
}
