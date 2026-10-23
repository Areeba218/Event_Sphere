
import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";

function ExhibitionHall() {
  const hallRef = useRef();
  const ringsRef = useRef();
  const boothsRef = useRef();

  useFrame((state, delta) => {
    if (hallRef.current) {
      hallRef.current.rotation.y += delta * 0.12;
    }

    if (ringsRef.current) {
      ringsRef.current.rotation.z += delta * 0.16;
      ringsRef.current.rotation.x =
        Math.sin(state.clock.elapsedTime * 0.3) * 0.12;
    }

    if (boothsRef.current) {
      boothsRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
    }
  });

  const booths = [
    [-2.1, -0.8, 0.1, "#1955E9"],
    [-0.7, -0.8, -0.1, "#FF61CF"],
    [0.7, -0.8, 0.1, "#8C52FF"],
    [2.1, -0.8, -0.1, "#1955E9"],
  ];

  return (
    <>
      <ambientLight intensity={1.2} />
      <pointLight
        position={[3, 3, 4]}
        intensity={35}
        color="#FF61CF"
      />
      <pointLight
        position={[-3, 1, 2]}
        intensity={30}
        color="#1955E9"
      />
      <spotLight
        position={[0, 5, 1]}
        intensity={25}
        color="#FFFFFF"
        angle={0.6}
        penumbra={1}
      />

      <Stars
        radius={35}
        depth={18}
        count={350}
        factor={2}
        saturation={0}
        fade
        speed={0.4}
      />

      <group ref={hallRef}>
        {/* Exhibition platform */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.25, 0]}
        >
          <cylinderGeometry args={[3.25, 3.45, 0.16, 64]} />
          <meshStandardMaterial
            color="#19101F"
            metalness={0.75}
            roughness={0.3}
          />
        </mesh>

        {/* Glowing platform edge */}
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.15, 0]}
        >
          <torusGeometry args={[3.1, 0.025, 12, 100]} />
          <meshBasicMaterial color="#FF61CF" />
        </mesh>

        {/* Main exhibition structure */}
        <mesh position={[0, 0.15, -0.4]}>
          <boxGeometry args={[2.5, 2.1, 0.16]} />
          <meshStandardMaterial
            color="#30113A"
            emissive="#6C1B83"
            emissiveIntensity={0.6}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* Inner illuminated panel */}
        <mesh position={[0, 0.2, -0.29]}>
          <boxGeometry args={[2.1, 1.7, 0.035]} />
          <meshStandardMaterial
            color="#21102C"
            emissive="#1955E9"
            emissiveIntensity={0.45}
          />
        </mesh>

        {/* Floating centerpiece */}
        <Float speed={1.3} rotationIntensity={0.2} floatIntensity={0.45}>
          <mesh position={[0, 0.25, 0.25]}>
            <icosahedronGeometry args={[0.62, 1]} />
            <meshPhysicalMaterial
              color="#FF61CF"
              emissive="#A51B85"
              emissiveIntensity={1.2}
              metalness={0.7}
              roughness={0.18}
              clearcoat={1}
            />
          </mesh>
        </Float>

        {/* Orbiting rings */}
        <group ref={ringsRef} position={[0, 0.2, 0.2]}>
          <mesh rotation={[0.9, 0.2, 0.3]}>
            <torusGeometry args={[1.05, 0.018, 12, 100]} />
            <meshBasicMaterial color="#FF61CF" />
          </mesh>

          <mesh rotation={[0.3, 0.9, 0.8]}>
            <torusGeometry args={[1.25, 0.012, 12, 100]} />
            <meshBasicMaterial color="#4A8BFF" />
          </mesh>
        </group>

        {/* Booths */}
        <group ref={boothsRef}>
          {booths.map(([x, y, z, color], index) => (
            <group key={index} position={[x, y, z]}>
              <mesh position={[0, 0.3, 0]}>
                <boxGeometry args={[0.85, 0.65, 0.7]} />
                <meshStandardMaterial
                  color="#24152D"
                  metalness={0.55}
                  roughness={0.35}
                />
              </mesh>

              <mesh position={[0, 0.65, 0.02]}>
                <boxGeometry args={[0.9, 0.07, 0.74]} />
                <meshBasicMaterial color={color} />
              </mesh>

              <mesh position={[0, 0.32, 0.36]}>
                <planeGeometry args={[0.48, 0.34]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.75}
                />
              </mesh>
            </group>
          ))}
        </group>

        {/* Side pillars */}
        {[-2.6, 2.6].map((x) => (
          <mesh key={x} position={[x, 0.05, -0.2]}>
            <boxGeometry args={[0.09, 2.1, 0.12]} />
            <meshBasicMaterial color="#8B43FF" />
          </mesh>
        ))}
      </group>
    </>
  );
}

export default function EventScene() {
  return (
    <div className="event-scene">
      <Canvas
        camera={{ position: [0, 1.1, 8.2], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ExhibitionHall />
      </Canvas>
    </div>
  );
}
