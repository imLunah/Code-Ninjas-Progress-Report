import { useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { motion } from 'framer-motion';

const VERT = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

// Always fully opaque — bg color outside the iris means the canvas
// is invisible when first mounted (exact same color as landing page).
// Glass effect paints on top. No transparent pixels = no possible cut.
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
    return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),
               mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
  }

  void main() {
    // Camera-dive warp
    vec2 uv  = vUv;
    float cam = uP * uP;
    uv.y += cam * 0.065;
    uv.y += (uv.y - 0.5) * cam * 0.10;
    uv.x += (uv.x - 0.5) * cam * 0.045;

    vec2 center = vec2(0.5, 0.5 + cam * 0.05);
    vec2 p = uv - center;
    p.x *= uAspect;

    // Organic edge wave
    float wt   = uTime * 2.0;
    float wave = sin(p.x * 7.0 + wt)          * 0.009
               + sin(p.y * 5.5 + wt * 0.75)   * 0.008
               + sin(length(p)*11.0 - wt*1.3) * 0.006;

    float dist = length(p) + wave;
    // Generous maxR guarantees all 4 corners are covered
    float maxR = length(vec2(uAspect * 0.5 + 0.14, 0.66));
    float t    = 1.0 - pow(1.0 - uP, 3.0);
    float r    = t * maxR;

    float ew     = 0.016 + abs(wave) * 0.7;
    float filled = 1.0 - smoothstep(r - ew, r + ew, dist);
    float rim    = smoothstep(r - ew * 6.0, r - ew * 0.5, dist)
                 * (1.0 - smoothstep(r - ew * 0.4, r + ew, dist));
    float blend  = min(filled + rim * 0.88, 1.0);

    // Frosted interior
    float topLift = smoothstep(0.15, -0.2, p.y / max(r, 0.001)) * filled;
    float frost   = filled * (0.07 + topLift * 0.11);
    float surface = vnoise(p*7.0 + uTime*0.025) * vnoise(p*13.0 - uTime*0.02) * filled * 0.06;

    // Apple crescent — bright arc at top-left
    float angle   = atan(p.y, p.x);
    float topArc  = 0.5 + 0.5 * sin(angle + PI * 0.55);
    float rimCres = rim * pow(topArc, 2.2) * 2.8;
    float rimSoft = rim * 0.55;

    // Inner edge line (glass thickness)
    float innerLine = smoothstep(r - ew*4.5, r - ew*3.0, dist)
                    * (1.0 - smoothstep(r - ew*3.0, r - ew*2.0, dist))
                    * filled * pow(topArc, 1.3) * 0.5;

    // Chromatic aberration
    float ca   = rim * 0.012 + abs(wave) * 0.3;
    float rFil = 1.0 - smoothstep(r - ew - ca, r + ew - ca, dist);
    float bFil = 1.0 - smoothstep(r - ew + ca, r + ew + ca, dist);

    // Single moving glint
    float glint = pow(max(0.0, 1.0 - length(p - vec2(
        -0.04 + sin(uTime*0.45)*0.07,
         0.07 + cos(uTime*0.35)*0.05)) * 10.5), 5.0) * filled;

    float bloom = (1.0 - smoothstep(0.0, r * 0.75, dist)) * cam * filled * 0.10;

    vec3 bg    = vec3(0.109, 0.129, 0.196);
    vec3 white = vec3(0.88,  0.93,  1.0);
    vec3 blue  = vec3(0.28,  0.62,  1.0);

    vec3 glass;
    glass.r = bg.r * rFil;
    glass.g = bg.g * filled;
    glass.b = bg.b * bFil;
    glass += white * frost + white * surface;
    glass += white * rimCres + blue * rimSoft * 1.4;
    glass += white * innerLine;
    glass += white * glint * 2.0 + blue * bloom;

    // ALWAYS OPAQUE: outside iris = exact landing-page bg, no transparent pixels
    vec3 final = mix(bg, glass, blend);
    gl_FragColor = vec4(final, 1.0);
  }
`;

function Iris({ onNavigate, onIrisDone }) {
  const matRef    = useRef();
  const progress  = useRef(0);
  const elapsed   = useRef(0);
  const navigated = useRef(false);
  const done      = useRef(false);
  const { size, camera } = useThree();

  const uniforms = useMemo(() => ({
    uP:      { value: 0.0 },
    uTime:   { value: 0.0 },
    uAspect: { value: size.width / size.height },
  }), []);

  useFrame((_, dt) => {
    progress.current = Math.min(progress.current + dt * 1.9, 1.0);
    elapsed.current += dt;

    camera.position.y = -progress.current * 0.45;
    camera.position.z =  1.0 + progress.current * 0.2;

    if (matRef.current) {
      matRef.current.uniforms.uP.value    = progress.current;
      matRef.current.uniforms.uTime.value = elapsed.current;
    }

    // Navigate at 72% — iris covers >97% of screen, login page renders behind canvas
    if (!navigated.current && progress.current >= 0.72) {
      navigated.current = true;
      onNavigate();
    }

    // Iris done at 100% — triggers canvas fade-out
    if (!done.current && progress.current >= 0.995) {
      done.current = true;
      onIrisDone();
    }
  });

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default function TransitionScene({ onNavigate, onComplete }) {
  const [fadeOut, setFadeOut] = useState(false);
  const handleIrisDone = useCallback(() => setFadeOut(true), []);

  return (
    <motion.div
      style={{ position: 'fixed', inset: 0, zIndex: 50 }}
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={() => { if (fadeOut) onComplete(); }}
    >
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
        camera={{ position: [0, 0, 1] }}
      >
        <Iris onNavigate={onNavigate} onIrisDone={handleIrisDone} />
      </Canvas>
    </motion.div>
  );
}
