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
  uniform float uP;
  uniform float uAspect;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - 0.5;
    p.x *= uAspect;
    float dist = length(p);

    float maxR = length(vec2(uAspect * 0.5, 0.5)) + 0.04;
    float t = 1.0 - pow(1.0 - uP, 2.8);
    float r = t * maxR;

    float soft = 0.013;
    float filled = 1.0 - smoothstep(r - soft, r + soft, dist);
    float ring   = smoothstep(r - soft * 12.0, r - soft * 2.0, dist)
                 * (1.0 - smoothstep(r - soft, r + soft * 0.5, dist));

    vec3 bg   = vec3(0.109, 0.129, 0.196);
    vec3 blue = vec3(0.22, 0.631, 1.0);

    vec3 col = bg * filled + blue * ring * 2.4;
    float a  = min(filled + ring * 0.7, 1.0);

    gl_FragColor = vec4(col, a);
  }
`;

function Iris({ onNavigate }) {
  const matRef = useRef();
  const progress = useRef(0);
  const done = useRef(false);
  const { size } = useThree();

  const uniforms = useMemo(() => ({
    uP:      { value: 0.0 },
    uAspect: { value: size.width / size.height },
  }), []);

  useFrame((_, dt) => {
    progress.current = Math.min(progress.current + dt * 2.0, 1.0);
    if (matRef.current) matRef.current.uniforms.uP.value = progress.current;
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
