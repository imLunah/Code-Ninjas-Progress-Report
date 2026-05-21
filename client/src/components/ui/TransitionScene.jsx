import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Apple-style liquid glass: frosted interior, bright rim crescent,
// clean chromatic edge, subtle caustics, camera-dive warp
const FRAG = `
  precision highp float;
  uniform float uP;
  uniform float uTime;
  uniform float uAspect;
  varying vec2 vUv;

  const float PI = 3.14159265;

  float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){
    vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }

  void main() {
    // Camera-dive: perspective pinch pulls toward bottom as you descend
    vec2 uv = vUv;
    float cam = uP * uP;
    uv.y += cam * 0.065;
    uv.y += (uv.y - 0.5) * cam * 0.10;
    uv.x += (uv.x - 0.5) * cam * 0.045;

    vec2 center = vec2(0.5, 0.5 + cam * 0.05);
    vec2 p = uv - center;
    p.x *= uAspect;

    // Subtle organic liquid edge
    float wt = uTime * 2.0;
    float wave = sin(p.x * 7.0 + wt)            * 0.009
               + sin(p.y * 5.5 + wt * 0.75)     * 0.008
               + sin(length(p)*11.0 - wt*1.3)   * 0.006;

    float dist = length(p) + wave;
    float maxR = length(vec2(uAspect * 0.5 + 0.09, 0.61));
    float t    = 1.0 - pow(1.0 - uP, 3.0);
    float r    = t * maxR;

    float ew     = 0.016 + abs(wave) * 0.7;
    float filled = 1.0 - smoothstep(r - ew, r + ew, dist);
    float rim    = smoothstep(r - ew * 6.0, r - ew * 0.5, dist)
                 * (1.0 - smoothstep(r - ew * 0.4, r + ew, dist));

    // ── Apple glass interior ─────────────────────────────────────────
    // Soft frosted layer: bg + gentle white bloom toward center-top
    float topLift = smoothstep(0.15, -0.2, p.y / max(r, 0.001)) * filled;
    float frost   = filled * (0.07 + topLift * 0.11);

    // Very subtle inner noise (frosted surface texture)
    float surface = vnoise(p * 7.0 + uTime * 0.025) * vnoise(p * 13.0 - uTime * 0.02);
    surface *= filled * 0.06;

    // ── Apple rim highlight ──────────────────────────────────────────
    // Bright crescent at top-left — the defining Apple glass look
    float angle   = atan(p.y, p.x);
    float topArc  = 0.5 + 0.5 * sin(angle + PI * 0.55); // peaks upper-left
    float rimCres = rim * pow(topArc, 2.2) * 2.8;        // sharp bright crescent

    // Soft secondary glow around full rim
    float rimSoft = rim * 0.55;

    // Thin inner-edge line (glass thickness)
    float innerLine = smoothstep(r - ew*4.5, r - ew*3.0, dist)
                    * (1.0 - smoothstep(r - ew*3.0, r - ew*2.0, dist))
                    * filled * pow(topArc, 1.3) * 0.5;

    // ── Chromatic aberration (clean, Apple-subtle) ───────────────────
    float ca   = rim * 0.012 + abs(wave) * 0.3;
    float rFil = 1.0 - smoothstep(r - ew - ca, r + ew - ca, dist);
    float bFil = 1.0 - smoothstep(r - ew + ca, r + ew + ca, dist);

    // ── Moving specular glint (single, understated) ──────────────────
    float glint = pow(max(0.0,
      1.0 - length(p - vec2(
        -0.04 + sin(uTime*0.45)*0.07,
         0.07 + cos(uTime*0.35)*0.05)) * 10.5), 5.0) * filled;

    // ── Depth bloom: center brightens as you "enter" ─────────────────
    float bloom = (1.0 - smoothstep(0.0, r * 0.75, dist)) * cam * filled * 0.10;

    // ── Colors ───────────────────────────────────────────────────────
    vec3 bg    = vec3(0.109, 0.129, 0.196);   // #1c2132
    vec3 white = vec3(0.88,  0.93,  1.0);
    vec3 blue  = vec3(0.28,  0.62,  1.0);

    // Base fill with chromatic split
    vec3 col;
    col.r = bg.r * rFil;
    col.g = bg.g * filled;
    col.b = bg.b * bFil;

    col += white * frost;          // frosted interior
    col += white * surface;        // surface texture
    col += white * rimCres;        // bright top crescent (the Apple look)
    col += blue  * rimSoft * 1.4;  // rim ambient glow
    col += white * innerLine;      // inner edge
    col += white * glint * 2.0;    // specular
    col += blue  * bloom;          // depth

    float alpha = min(filled + rim * 0.88, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

function Iris({ onNavigate }) {
  const matRef   = useRef();
  const progress = useRef(0);
  const elapsed  = useRef(0);
  const done     = useRef(false);
  const { size, camera } = useThree();

  const uniforms = useMemo(() => ({
    uP:      { value: 0.0 },
    uTime:   { value: 0.0 },
    uAspect: { value: size.width / size.height },
  }), []);

  useFrame((_, dt) => {
    progress.current = Math.min(progress.current + dt * 1.9, 1.0);
    elapsed.current += dt;

    // Actual Three.js camera dives down and forward
    camera.position.y = -progress.current * 0.45;
    camera.position.z =  1.0 + progress.current * 0.2;

    if (matRef.current) {
      matRef.current.uniforms.uP.value    = progress.current;
      matRef.current.uniforms.uTime.value = elapsed.current;
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
