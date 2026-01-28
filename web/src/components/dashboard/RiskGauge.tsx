/**
 * Risk Gauge Component
 *
 * Circular gauge displaying current risk level with:
 * - Color-coded risk zones
 * - Animated transitions
 * - Risk breakdown details
 */

import { useMemo } from 'react';
import { AlertTriangle, Shield, Zap } from 'lucide-react';

interface RiskComponent {
  name: string;
  value: number;
  max: number;
}

interface RiskGaugeProps {
  riskScore: number; // 0-1
  entropy: number; // 0-1
  components?: RiskComponent[];
  trend?: 'increasing' | 'decreasing' | 'stable';
}

export function RiskGauge({
  riskScore,
  entropy,
  components = [],
  trend = 'stable',
}: RiskGaugeProps) {
  // Calculate gauge parameters
  const { color, label } = useMemo(() => {
    if (riskScore < 0.3) {
      return {
        color: '#00ff88',
        label: 'LOW',
        glowClass: 'glow-green',
      };
    } else if (riskScore < 0.6) {
      return {
        color: '#ffd700',
        label: 'MEDIUM',
        glowClass: 'glow-orange',
      };
    } else if (riskScore < 0.8) {
      return {
        color: '#ff6b35',
        label: 'HIGH',
        glowClass: 'glow-orange',
      };
    } else {
      return {
        color: '#ff3366',
        label: 'CRITICAL',
        glowClass: 'glow-red',
      };
    }
  }, [riskScore]);

  // SVG gauge parameters
  const size = 180;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI * 1.5; // 270 degrees
  const progress = riskScore * circumference;

  // Entropy bar parameters
  const entropyWidth = entropy * 100;

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="flex items-center gap-2">
          <AlertTriangle size={12} />
          Risk Assessment
        </span>
        <div className="flex items-center gap-1">
          {trend === 'increasing' && (
            <span className="text-[--color-cyber-red] text-xs">↑</span>
          )}
          {trend === 'decreasing' && (
            <span className="text-[--color-cyber-green] text-xs">↓</span>
          )}
          {trend === 'stable' && (
            <span className="text-white/40 text-xs">→</span>
          )}
        </div>
      </div>

      <div className="panel-content">
        {/* Main Gauge */}
        <div className="flex justify-center mb-6">
          <div className="relative" style={{ width: size, height: size * 0.8 }}>
            <svg
              width={size}
              height={size * 0.8}
              viewBox={`0 0 ${size} ${size * 0.8}`}
              className="transform -rotate-[135deg]"
            >
              {/* Background arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeLinecap="round"
              />

              {/* Risk zones */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="url(#riskGradient)"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeLinecap="round"
                opacity={0.2}
              />

              {/* Value arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${progress} ${circumference}`}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dasharray 0.5s ease, stroke 0.3s ease',
                  filter: `drop-shadow(0 0 8px ${color})`,
                }}
              />

              {/* Gradient definition */}
              <defs>
                <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00ff88" />
                  <stop offset="33%" stopColor="#ffd700" />
                  <stop offset="66%" stopColor="#ff6b35" />
                  <stop offset="100%" stopColor="#ff3366" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-0">
              <span
                className="text-4xl font-bold text-mono"
                style={{ color, textShadow: `0 0 20px ${color}` }}
              >
                {(riskScore * 100).toFixed(0)}
              </span>
              <span
                className="text-xs font-medium tracking-wider mt-1"
                style={{ color }}
              >
                {label}
              </span>
            </div>
          </div>
        </div>

        {/* Entropy Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="data-label flex items-center gap-1">
              <Zap size={10} />
              Decision Entropy
            </span>
            <span className="text-mono text-xs text-[--color-cyber-purple]">
              {(entropy * 100).toFixed(1)}%
            </span>
          </div>
          <div className="h-2 bg-[--color-space-800] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${entropyWidth}%`,
                background: `linear-gradient(90deg, #a855f7, #00d4ff)`,
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.5)',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-white/30 mt-1">
            <span>Confident</span>
            <span>Uncertain</span>
          </div>
        </div>

        {/* Risk Components */}
        {components.length > 0 && (
          <div className="space-y-3">
            <div className="data-label flex items-center gap-1">
              <Shield size={10} />
              Risk Components
            </div>
            {components.map((comp) => (
              <div key={comp.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-white/60">{comp.name}</span>
                  <span className="text-mono text-xs text-white/80">
                    {comp.value.toFixed(2)}
                  </span>
                </div>
                <div className="h-1 bg-[--color-space-800] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[--color-cyber-orange] transition-all duration-300"
                    style={{
                      width: `${(comp.value / comp.max) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Risk Summary */}
        <div className="mt-6 p-3 bg-[--color-space-900] rounded border border-white/5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="data-value-sm text-[--color-cyber-green]">
                {((1 - riskScore) * 100).toFixed(0)}%
              </div>
              <div className="data-label mt-1">Safety</div>
            </div>
            <div>
              <div className="data-value-sm text-[--color-cyber-blue]">
                {((1 - entropy) * 100).toFixed(0)}%
              </div>
              <div className="data-label mt-1">Confidence</div>
            </div>
            <div>
              <div
                className="data-value-sm"
                style={{ color }}
              >
                {riskScore < 0.3 ? 'A' : riskScore < 0.6 ? 'B' : riskScore < 0.8 ? 'C' : 'D'}
              </div>
              <div className="data-label mt-1">Grade</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
