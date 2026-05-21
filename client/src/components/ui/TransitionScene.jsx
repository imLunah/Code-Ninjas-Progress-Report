import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;
  uniform float uProgress;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    // Camera-moving-down: UV drifts upward + slight perspective zoom toward bottom
    vec2 uv = vUv;
    float camT = uProgress * uProgress; // accelerate camera feel
    uv.y += camT * 0.07;
    // Perspective tilt: bottom of screen expands outward (diving sensation)
    float perspY = (uv.y - 0.5) * camT * 0.12;
    uv.y += perspY;
    uv.x += (uv.x - 0.5) * camT * 0.06;

    // Iris center drifts up as camera goes down
    vec2 center = vec2(0.5, 0.5 + camT * 0.06);
    vec2 p = uv - center;
    p.x *= uAspect;

    // Liquid wave distortion on the edge
    float wt = uTime * 2.8;
    float wave = sin(p.x * 9.0 + wt)           * 0.018
               + sin(p.y * 7.0 + wt * 0.75)    * 0.016
               + sin(length(p) * 15.0 - wt * 1.5) * 0.012
               + sin(p.x * 4.0 - p.y * 6.0 + wt * 1.2) * 0.008;

    float dist = length(p) + wave;
    float maxR = length(vec2(uAspect * 0.5 + 0.1, 0.62));
    float t    = 1.0 - pow(1.0 - uProgress, 2.7);
    float r    = t * maxR;

    float edgeW  = 0.025 + abs(wave) * 1.4;
    float filled = 1.0 - smoothstep(r - edgeW, r + edgeW, dist);
    float rim    = smoothstep(r - edgeW * 7.0, r - edgeW, dist)
                 * (1.0 - smoothstep(r - edgeW * 0.6, r + edgeW, dist));

    // Chromatic aberration — R and B channels shift at the rim (glass refraction)
    float shift  = rim * 0.03 + wave * 0.5;
    float rFill  = 1.0 - smoothstep(r - edgeW * 1.4 - shift, r + edgeW * 0.6 - shift, dist);
    float bFill  = 1.0 - smoothstep(r - edgeW * 0.6 + shift, r + edgeW * 1.4 + shift, dist);

    // Caustic light patterns (wave interference)
    float cx = sin(p.x * 22.0 + uTime * 1.6) * sin(p.y * 18.0 - uTime * 1.2);
    float cy = sin(p.x * 15.0 - uTime * 0.9) * sin(p.y * 24.0 + uTime * 1.4);
    float caustic = pow(max(cx * cy, 0.0), 1.4) * 0.45 * filled;

    // Two drifting specular highlights (glass surface glint)
    vec2 sp = p;
    float spec = pow(max(0.0, 1.0 - length(sp - vec2(
        0.08 + sin(uTime * 0.6) * 0.12,
        0.10 + cos(uTime * 0.45) * 0.10)) * 8.5), 4.5)
      + pow(max(0.0, 1.0 - length(sp - vec2(
        -0.16 + cos(uTime * 0.5) * 0.10,
        -0.06 + sin(uTime * 0.38) * 0.08)) * 11.0), 5.0) * 0.55;
    spec *= filled;

    // Frosted glass surface noise
    float surf = vnoise(p * 5.5 + uTime * 0.035) * vnoise(p * 10.0 - uTime * 0.028);
    surf *= filled * 0.14;

    // Depth glow toward camera — brighter near screen center as we "dive in"
    float depthGlow = (1.0 - length(p) / maxR) * camT * filled * 0.18;

    // Colors
    vec3 bg    = vec3(0.109, 0.129, 0.196);
    vec3 blue  = vec3(0.22,  0.631, 1.0);
    vec3 cyan  = vec3(0.35,  0.85,  1.0);
    vec3 white = vec3(0.82,  0.92,  1.0);

    // Base fill with chromatic split
    vec3 col;
    col.r = bg.r * rFill;
    col.g = bg.g * filled;
    col.b = bg.b * bFill;

    // Rim glow (liquid glass edge)
    col += cyan * rim * 2.2;

    // Caustics
    col += blue * caustic;

    // Specular
    col += white * spec * 2.6;

    // Surface glass texture
    col += white * surf;

    // Depth glow
    col += cyan * depthGlow;

    float alpha = min(filled + rim * 0.9, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

function Iris({ onNavigate }) {
  const matRef  = useRef();
  const progress = useRef(0);
  const elapsed  = useRef(0);
  const done     = useRef(false);
  const { size } = useThree();

  const uniforms = useMemo(() => ({
    uProgress: { value: 0.0 },
    uTime:     { value: 0.0 },
    uAspect:   { value: size.width / size.height },
  }), []);

  useFrame((state, dt) => {
    progress.current = Math.min(progress.current + dt * 1.85, 1.0);
    elapsed.current += dt;

    // Move the actual Three.js camera down and forward for any 3D elements
    state.camera.position.y = -progress.current * 0.5;
    state.camera.position.z = 1.0 + progress.current * 0.25;

    if (matRef.current) {
      matRef.current.uniforms.uProgress.value = progress.current;
      matRef.current.uniforms.uTime.value     = elapsed.current;
    }

    if (!done.current && progress.current >= 0.97) {
      done.current = true;
      onNavigate();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        transparent
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function TransitionScene({ onNavigate }) {
  return (
    <Canvas
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 1] }}
    >
      <Iris onNavigate={onNavigate} />
    </Canvas>
  );
}
