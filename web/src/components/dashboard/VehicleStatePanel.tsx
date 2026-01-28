/**
 * Vehicle State Panel Component
 *
 * Displays the current state of the autonomous vehicle with gauges and indicators.
 */

import { useMemo } from 'react';
import {
  Gauge,
  Navigation,
  AlertOctagon,
  Thermometer,
  Battery,
  Compass,
  Car,
} from 'lucide-react';

interface VehicleState {
  speed: number;
  maxSpeed: number;
  acceleration: number;
  position: { x: number; y: number };
  heading: number;
  lane: number;
  totalLanes: number;
  steeringAngle: number;
  batteryLevel?: number;
  temperature?: number;
  collision: boolean;
  nearMiss: boolean;
}

interface VehicleStatePanelProps {
  state: VehicleState;
  showWarnings?: boolean;
}

export function VehicleStatePanel({ state, showWarnings = true }: VehicleStatePanelProps) {
  const speedPercent = (state.speed / state.maxSpeed) * 100;
  const speedColor = useMemo(() => {
    if (speedPercent > 90) return '#ff3366';
    if (speedPercent > 70) return '#ff6b35';
    return '#00d4ff';
  }, [speedPercent]);

  const headingDeg = (state.heading * 180) / Math.PI;

  return (
    <div className="space-y-4">
      {/* Status Warnings */}
      {showWarnings && (state.collision || state.nearMiss) && (
        <div
          className={`
            p-3 rounded-lg flex items-center gap-3 border
            ${state.collision
              ? 'bg-[#ff3366]/20 border-[#ff3366]/50'
              : 'bg-[#ff6b35]/20 border-[#ff6b35]/50'
            }
          `}
        >
          <AlertOctagon
            size={20}
            className={state.collision ? 'text-[#ff3366]' : 'text-[#ff6b35]'}
          />
          <div>
            <div className={`text-sm font-medium ${state.collision ? 'text-[#ff3366]' : 'text-[#ff6b35]'}`}>
              {state.collision ? 'COLLISION DETECTED' : 'NEAR MISS WARNING'}
            </div>
            <div className="text-xs text-white/50">
              {state.collision ? 'Episode terminated' : 'Reduce speed or change lane'}
            </div>
          </div>
        </div>
      )}

      {/* Speed Gauge */}
      <div className="p-4 bg-[--color-space-800] rounded-lg border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gauge size={16} className="text-[--color-cyber-blue]" />
            <span className="text-xs text-white/50 uppercase tracking-wider">Speed</span>
          </div>
          <span className="text-xs text-white/40">
            Max: {state.maxSpeed.toFixed(0)} m/s
          </span>
        </div>

        {/* Circular Gauge */}
        <div className="relative w-32 h-32 mx-auto">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background arc */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="198 66"
            />
            {/* Progress arc */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={speedColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(speedPercent / 100) * 198} 264`}
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-mono font-bold" style={{ color: speedColor }}>
              {state.speed.toFixed(1)}
            </span>
            <span className="text-xs text-white/40">m/s</span>
          </div>
        </div>

        {/* Acceleration indicator */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <span className="text-xs text-white/40">Acceleration:</span>
          <span
            className={`text-sm font-mono ${
              state.acceleration > 0
                ? 'text-[--color-cyber-green]'
                : state.acceleration < 0
                ? 'text-[--color-cyber-orange]'
                : 'text-white/50'
            }`}
          >
            {state.acceleration > 0 ? '+' : ''}{state.acceleration.toFixed(2)} m/s²
          </span>
        </div>
      </div>

      {/* Position & Navigation */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-[--color-space-800] rounded-lg border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Navigation size={14} className="text-[--color-cyber-green]" />
            <span className="text-xs text-white/40">Position</span>
          </div>
          <div className="space-y-1 font-mono text-sm">
            <div className="flex justify-between">
              <span className="text-white/50">X:</span>
              <span className="text-white">{state.position.x.toFixed(1)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50">Y:</span>
              <span className="text-white">{state.position.y.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-[--color-space-800] rounded-lg border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <Compass size={14} className="text-[--color-cyber-purple]" />
            <span className="text-xs text-white/40">Heading</span>
          </div>
          <div className="flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-full border-2 border-[--color-cyber-purple]/30 relative"
              style={{ transform: `rotate(${headingDeg}deg)` }}
            >
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[8px] border-transparent border-b-[--color-cyber-purple]" />
            </div>
            <span className="ml-3 text-sm font-mono text-[--color-cyber-purple]">
              {headingDeg.toFixed(0)}°
            </span>
          </div>
        </div>
      </div>

      {/* Lane Position */}
      <div className="p-3 bg-[--color-space-800] rounded-lg border border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Car size={14} className="text-[--color-cyber-blue]" />
          <span className="text-xs text-white/40">Lane Position</span>
        </div>
        <div className="flex items-center gap-2">
          {Array.from({ length: state.totalLanes }).map((_, i) => (
            <div
              key={i}
              className={`
                flex-1 h-8 rounded flex items-center justify-center
                transition-colors duration-200
                ${i === state.lane
                  ? 'bg-[--color-cyber-blue]/30 border-2 border-[--color-cyber-blue]'
                  : 'bg-white/5 border border-white/10'
                }
              `}
            >
              {i === state.lane && (
                <Car size={16} className="text-[--color-cyber-blue]" />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-white/30">
          <span>Leftmost</span>
          <span>Lane {state.lane + 1} of {state.totalLanes}</span>
          <span>Rightmost</span>
        </div>
      </div>

      {/* Steering Angle */}
      <div className="p-3 bg-[--color-space-800] rounded-lg border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/40">Steering Angle</span>
          <span className="text-sm font-mono text-white">
            {(state.steeringAngle * (180 / Math.PI)).toFixed(1)}°
          </span>
        </div>
        <div className="relative h-2 bg-white/10 rounded-full">
          <div className="absolute left-1/2 top-0 h-full w-0.5 bg-white/30" />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[--color-cyber-blue] transition-all duration-200"
            style={{
              left: `${50 + (state.steeringAngle * (180 / Math.PI) / 45) * 50}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-white/30">
          <span>-45°</span>
          <span>0°</span>
          <span>+45°</span>
        </div>
      </div>

      {/* Optional: Battery & Temperature */}
      {(state.batteryLevel !== undefined || state.temperature !== undefined) && (
        <div className="grid grid-cols-2 gap-3">
          {state.batteryLevel !== undefined && (
            <div className="p-3 bg-[--color-space-800] rounded-lg border border-white/5">
              <div className="flex items-center gap-2">
                <Battery
                  size={14}
                  className={state.batteryLevel > 20 ? 'text-[--color-cyber-green]' : 'text-[#ff3366]'}
                />
                <span className="text-xs text-white/40">Battery</span>
              </div>
              <div className="mt-2 h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${state.batteryLevel > 20 ? 'bg-[--color-cyber-green]' : 'bg-[#ff3366]'}`}
                  style={{ width: `${state.batteryLevel}%` }}
                />
              </div>
              <div className="text-right mt-1 text-xs font-mono text-white/50">
                {state.batteryLevel}%
              </div>
            </div>
          )}
          {state.temperature !== undefined && (
            <div className="p-3 bg-[--color-space-800] rounded-lg border border-white/5">
              <div className="flex items-center gap-2">
                <Thermometer
                  size={14}
                  className={state.temperature < 80 ? 'text-[--color-cyber-blue]' : 'text-[#ff3366]'}
                />
                <span className="text-xs text-white/40">Temperature</span>
              </div>
              <div className="mt-2 text-center">
                <span
                  className={`text-lg font-mono ${state.temperature < 80 ? 'text-[--color-cyber-blue]' : 'text-[#ff3366]'}`}
                >
                  {state.temperature}°C
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
