import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Floating geometry behind the landing hero. Lazy-loaded so three.js never
// rides along into the app bundle; the hero is complete without it, so any
// failure here (no WebGL, context loss) just leaves the flat gradient.
//
// Depth does the storytelling: near shapes are bigger, brighter, and ride the
// scroll harder than far ones, which is what makes the parallax read as 3D
// rather than as a texture sliding around.
const COUNT = 42;

export default function LandingScene() {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = 'width:100%;height:100%;display:block';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 16;

    const group = new THREE.Group();
    scene.add(group);

    const geoms = [
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.OctahedronGeometry(1, 0),
      new THREE.TorusGeometry(0.8, 0.3, 8, 20),
      new THREE.TetrahedronGeometry(1, 0),
    ];
    const shapes = [];
    for (let i = 0; i < COUNT; i += 1) {
      const depth = Math.random(); // 0 = far, 1 = near
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.05 + depth * 0.13,
        wireframe: i % 3 === 0,
      });
      const mesh = new THREE.Mesh(geoms[i % geoms.length], mat);
      mesh.position.set((Math.random() - 0.5) * 38, (Math.random() - 0.5) * 24, -(1 - depth) * 14);
      mesh.scale.setScalar(0.35 + depth * 0.85);
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      mesh.userData = {
        depth,
        baseY: mesh.position.y,
        spinX: (Math.random() - 0.5) * 0.004,
        spinY: (Math.random() - 0.5) * 0.005,
        floatAmp: 0.35 + Math.random() * 0.5,
        floatFreq: 0.2 + Math.random() * 0.35,
        phase: Math.random() * Math.PI * 2,
      };
      group.add(mesh);
      shapes.push(mesh);
    }

    const resize = () => {
      const r = mount.getBoundingClientRect();
      if (!r.width || !r.height) return;
      renderer.setSize(r.width, r.height, false);
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    const pointer = { x: 0, y: 0 };
    const onPointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    let scroll = window.scrollY;
    const onScroll = () => { scroll = window.scrollY; };

    const clock = new THREE.Clock();
    const renderFrame = () => {
      const t = clock.getElapsedTime();
      for (const mesh of shapes) {
        const u = mesh.userData;
        mesh.rotation.x += u.spinX;
        mesh.rotation.y += u.spinY;
        mesh.position.y = u.baseY
          + Math.sin(t * u.floatFreq + u.phase) * u.floatAmp
          + scroll * 0.012 * (0.3 + u.depth);
      }
      group.rotation.y += (pointer.x * 0.08 - group.rotation.y) * 0.03;
      group.rotation.x += (pointer.y * 0.05 - group.rotation.x) * 0.03;
      renderer.render(scene, camera);
    };

    let raf = 0;
    const loop = () => { renderFrame(); raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      renderFrame(); // the shapes still decorate; nothing moves
    } else {
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      loop();
    }

    // No frames for a hero that is scrolled away or in a hidden tab.
    const io = new IntersectionObserver(([entry]) => {
      if (reduced) return;
      if (entry.isIntersecting && !document.hidden) { if (!raf) loop(); }
      else stop();
    });
    io.observe(mount);
    const onVisibility = () => {
      if (reduced) return;
      if (document.hidden) stop();
      else if (!raf) loop();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      geoms.forEach((g) => g.dispose());
      shapes.forEach((m) => m.material.dispose());
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" aria-hidden="true" />;
}
