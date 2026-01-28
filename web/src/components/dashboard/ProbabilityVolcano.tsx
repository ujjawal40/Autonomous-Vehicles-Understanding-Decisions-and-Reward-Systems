/**
 * 3D Probability Volcano Visualization
 *
 * Four view modes:
 * 1. Realtime - Live probability distribution
 * 2. Animated - Replay of current episode
 * 3. Episode Surface - 3D surface for single episode
 * 4. All Episodes - Stacked visualization of all episodes
 */

import { useState, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { Activity, Play, Layers, BarChart3 } from 'lucide-react';

interface ProbabilityData {
  step: number;
  probs: number[];
  action: number;
}

interface EpisodeData {
  episode: number;
  steps: ProbabilityData[];
}

interface ProbabilityVolcanoProps {
  currentProbs: number[];
  currentStep: number;
  episodeHistory: ProbabilityData[];
  allEpisodes: EpisodeData[];
  actionLabels?: string[];
}

type ViewMode = 'realtime' | 'animated' | 'surface' | 'stacked';

const ACTIONS = ['North', 'East', 'South', 'West'];
const COLORS = ['#00d4ff', '#00ff88', '#ff6b35', '#a855f7'];

// Realtime Bar Chart
function RealtimeBars({ probs, colors }: { probs: number[]; colors: string[] }) {
  const barsRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (barsRef.current) {
      barsRef.current.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh) {
          const targetHeight = Math.max(0.1, probs[i] * 4);
          child.scale.y = THREE.MathUtils.lerp(child.scale.y, targetHeight, 0.1);
          child.position.y = child.scale.y / 2;
        }
      });
    }
  });

  return (
    <group ref={barsRef}>
      {probs.map((prob, i) => (
        <group key={i} position={[(i - 1.5) * 1.2, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.8, 1, 0.8]} />
            <meshStandardMaterial
              color={colors[i]}
              emissive={colors[i]}
              emissiveIntensity={0.3}
              transparent
              opacity={0.9}
            />
          </mesh>
          <Text
            position={[0, -0.5, 0]}
            fontSize={0.25}
            color="#ffffff"
            anchorY="top"
          >
            {ACTIONS[i]}
          </Text>
          <Text
            position={[0, prob * 4 + 0.3, 0]}
            fontSize={0.2}
            color={colors[i]}
          >
            {(prob * 100).toFixed(1)}%
          </Text>
        </group>
      ))}
    </group>
  );
}

// Animated Timeline
function AnimatedTimeline({
  history,
  colors,
}: {
  history: ProbabilityData[];
  colors: string[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    const index = Math.floor(time * 2) % Math.max(1, history.length);
    setCurrentIndex(index);
  });

  const currentData = history[currentIndex] || { probs: [0.25, 0.25, 0.25, 0.25] };

  return (
    <group ref={groupRef}>
      {/* Current bars */}
      {currentData.probs.map((prob, i) => (
        <group key={i} position={[(i - 1.5) * 1.2, 0, 0]}>
          <mesh position={[0, prob * 2, 0]}>
            <boxGeometry args={[0.8, prob * 4, 0.8]} />
            <meshStandardMaterial
              color={colors[i]}
              emissive={colors[i]}
              emissiveIntensity={i === currentData.action ? 0.6 : 0.2}
              transparent
              opacity={i === currentData.action ? 1 : 0.6}
            />
          </mesh>
        </group>
      ))}

      {/* Timeline indicator */}
      <Text
        position={[0, 4.5, 0]}
        fontSize={0.3}
        color="#00d4ff"
      >
        Step {currentIndex + 1} / {history.length}
      </Text>

      {/* Trail visualization */}
      {history.slice(Math.max(0, currentIndex - 10), currentIndex).map((data, idx) => (
        <group
          key={idx}
          position={[0, 0, -(currentIndex - Math.max(0, currentIndex - 10) - idx) * 0.5]}
          scale={[0.5, 0.5, 0.1]}
        >
          {data.probs.map((prob, i) => (
            <mesh
              key={i}
              position={[(i - 1.5) * 1.2, prob * 2, 0]}
            >
              <boxGeometry args={[0.8, prob * 4, 0.8]} />
              <meshStandardMaterial
                color={colors[i]}
                transparent
                opacity={0.1 + (idx / 10) * 0.2}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// 3D Surface Plot
function SurfacePlot({
  history,
  colors,
}: {
  history: ProbabilityData[];
  colors: string[];
}) {
  const geometry = useMemo(() => {
    const width = ACTIONS.length;
    const depth = Math.max(1, history.length);

    const positions: number[] = [];
    const colorArray: number[] = [];

    for (let z = 0; z < depth; z++) {
      const data = history[z] || { probs: [0.25, 0.25, 0.25, 0.25] };
      for (let x = 0; x < width; x++) {
        const height = data.probs[x] * 3;
        positions.push(
          (x - width / 2 + 0.5) * 1.5,
          height,
          (z - depth / 2 + 0.5) * 0.3
        );

        const color = new THREE.Color(colors[x]);
        colorArray.push(color.r, color.g, color.b);
      }
    }

    const indices: number[] = [];
    for (let z = 0; z < depth - 1; z++) {
      for (let x = 0; x < width - 1; x++) {
        const a = z * width + x;
        const b = a + 1;
        const c = a + width;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colorArray, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    return geo;
  }, [history, colors]);

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          wireframe
          color="#ffffff"
          transparent
          opacity={0.1}
        />
      </mesh>
    </group>
  );
}

// Stacked Episodes
function StackedEpisodes({
  episodes,
  colors,
}: {
  episodes: EpisodeData[];
  colors: string[];
}) {
  const maxEpisodes = Math.min(10, episodes.length);
  const displayEpisodes = episodes.slice(-maxEpisodes);

  return (
    <group>
      {displayEpisodes.map((episode, epIdx) => {
        const avgProbs = ACTIONS.map((_, actionIdx) => {
          const sum = episode.steps.reduce(
            (acc, step) => acc + (step.probs[actionIdx] || 0),
            0
          );
          return sum / Math.max(1, episode.steps.length);
        });

        return (
          <group
            key={episode.episode}
            position={[0, 0, (epIdx - maxEpisodes / 2) * 1.5]}
          >
            {avgProbs.map((prob, i) => (
              <mesh
                key={i}
                position={[(i - 1.5) * 1.2, prob * 2, 0]}
              >
                <boxGeometry args={[0.6, prob * 4, 0.6]} />
                <meshStandardMaterial
                  color={colors[i]}
                  emissive={colors[i]}
                  emissiveIntensity={0.2}
                  transparent
                  opacity={0.5 + (epIdx / maxEpisodes) * 0.5}
                />
              </mesh>
            ))}
            <Text
              position={[-3, 0, 0]}
              fontSize={0.25}
              color="#ffffff"
              anchorX="right"
            >
              Ep {episode.episode}
            </Text>
          </group>
        );
      })}
    </group>
  );
}

// Main Scene
function Scene({
  viewMode,
  currentProbs,
  episodeHistory,
  allEpisodes,
}: {
  viewMode: ViewMode;
  currentProbs: number[];
  episodeHistory: ProbabilityData[];
  allEpisodes: EpisodeData[];
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00d4ff" />

      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a1a1a"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#333333"
        fadeDistance={30}
        position={[0, -0.01, 0]}
      />

      {viewMode === 'realtime' && (
        <RealtimeBars probs={currentProbs} colors={COLORS} />
      )}

      {viewMode === 'animated' && (
        <AnimatedTimeline history={episodeHistory} colors={COLORS} />
      )}

      {viewMode === 'surface' && (
        <SurfacePlot history={episodeHistory} colors={COLORS} />
      )}

      {viewMode === 'stacked' && (
        <StackedEpisodes episodes={allEpisodes} colors={COLORS} />
      )}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={3}
        maxDistance={20}
        target={[0, 1, 0]}
      />
    </>
  );
}

export function ProbabilityVolcano({
  currentProbs,
  currentStep,
  episodeHistory,
  allEpisodes,
  actionLabels = ACTIONS,
}: ProbabilityVolcanoProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('realtime');

  const VIEW_MODES = [
    { id: 'realtime' as const, label: 'Realtime', icon: Activity },
    { id: 'animated' as const, label: 'Animated', icon: Play },
    { id: 'surface' as const, label: 'Surface', icon: BarChart3 },
    { id: 'stacked' as const, label: 'Episodes', icon: Layers },
  ];

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span>3D Probability Distribution</span>
        <span className="text-mono text-xs text-[--color-cyber-blue]">
          Step {currentStep}
        </span>
      </div>

      {/* View Mode Tabs */}
      <div className="px-4 pt-3">
        <div className="tab-list">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`tab ${viewMode === mode.id ? 'active' : ''}`}
            >
              <mode.icon size={12} className="inline mr-1" />
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 min-h-0">
        <Canvas
          camera={{ position: [5, 5, 5], fov: 50 }}
          className="three-canvas"
        >
          <Scene
            viewMode={viewMode}
            currentProbs={currentProbs}
            episodeHistory={episodeHistory}
            allEpisodes={allEpisodes}
          />
        </Canvas>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-white/5">
        <div className="flex justify-center gap-6">
          {actionLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: COLORS[i] }}
              />
              <span className="text-xs text-white/60">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
