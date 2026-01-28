/**
 * Highway Canvas Component
 *
 * 2D Canvas visualization of the highway environment with vehicles.
 */

import { useRef, useEffect, useCallback } from 'react';

interface Vehicle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  width: number;
  height: number;
  isEgo: boolean;
  lane: number;
}

interface HighwayConfig {
  lanes: number;
  laneWidth: number;
  roadLength: number;
}

interface HighwayCanvasProps {
  vehicles: Vehicle[];
  config: HighwayConfig;
  egoVehicle?: Vehicle;
  showGrid?: boolean;
  showTrajectory?: boolean;
  trajectoryPoints?: { x: number; y: number }[];
  onVehicleClick?: (vehicle: Vehicle) => void;
  className?: string;
}

const COLORS = {
  road: '#1a1a2e',
  lane: '#2d2d44',
  laneLine: '#3d3d5c',
  laneLineYellow: '#ffcc00',
  ego: '#00d4ff',
  egoGlow: 'rgba(0, 212, 255, 0.3)',
  other: '#ff6b35',
  otherDark: '#cc5629',
  trajectory: 'rgba(0, 255, 136, 0.5)',
  grid: 'rgba(255, 255, 255, 0.05)',
  text: 'rgba(255, 255, 255, 0.6)',
};

export function HighwayCanvas({
  vehicles,
  config,
  egoVehicle,
  showGrid = false,
  showTrajectory = false,
  trajectoryPoints = [],
  onVehicleClick,
  className = '',
}: HighwayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Clear canvas
      ctx.fillStyle = COLORS.road;
      ctx.fillRect(0, 0, width, height);

      // Calculate scale and offset for centering on ego vehicle
      const scale = height / (config.lanes * config.laneWidth * 1.5);
      const offsetX = egoVehicle ? width / 2 - egoVehicle.x * scale : 0;
      const offsetY = height / 2;

      ctx.save();
      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      // Draw grid if enabled
      if (showGrid) {
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 0.5 / scale;
        const gridSize = 10;
        for (let x = -500; x < 500; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, -config.lanes * config.laneWidth);
          ctx.lineTo(x, config.lanes * config.laneWidth);
          ctx.stroke();
        }
        for (let y = -config.lanes * config.laneWidth; y < config.lanes * config.laneWidth; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(-500, y);
          ctx.lineTo(500, y);
          ctx.stroke();
        }
      }

      // Draw road surface
      const roadHeight = config.lanes * config.laneWidth;
      ctx.fillStyle = COLORS.lane;
      ctx.fillRect(-500, -roadHeight / 2, 1000, roadHeight);

      // Draw lane lines
      for (let i = 0; i <= config.lanes; i++) {
        const y = -roadHeight / 2 + i * config.laneWidth;
        const isEdge = i === 0 || i === config.lanes;

        ctx.strokeStyle = isEdge ? COLORS.laneLineYellow : COLORS.laneLine;
        ctx.lineWidth = isEdge ? 0.3 : 0.15;

        if (isEdge) {
          // Solid edge lines
          ctx.beginPath();
          ctx.moveTo(-500, y);
          ctx.lineTo(500, y);
          ctx.stroke();
        } else {
          // Dashed lane dividers
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(-500, y);
          ctx.lineTo(500, y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw trajectory
      if (showTrajectory && trajectoryPoints.length > 1) {
        ctx.strokeStyle = COLORS.trajectory;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(trajectoryPoints[0].x, trajectoryPoints[0].y);
        for (let i = 1; i < trajectoryPoints.length; i++) {
          ctx.lineTo(trajectoryPoints[i].x, trajectoryPoints[i].y);
        }
        ctx.stroke();

        // Draw trajectory points
        trajectoryPoints.forEach((point, i) => {
          const alpha = i / trajectoryPoints.length;
          ctx.fillStyle = `rgba(0, 255, 136, ${alpha * 0.5})`;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 0.3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw vehicles
      vehicles.forEach((vehicle) => {
        ctx.save();
        ctx.translate(vehicle.x, vehicle.y);
        ctx.rotate(vehicle.heading);

        if (vehicle.isEgo) {
          // Draw ego vehicle glow
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, vehicle.width);
          gradient.addColorStop(0, COLORS.egoGlow);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, vehicle.width, 0, Math.PI * 2);
          ctx.fill();

          // Draw ego vehicle body
          ctx.fillStyle = COLORS.ego;
          ctx.beginPath();
          ctx.roundRect(
            -vehicle.height / 2,
            -vehicle.width / 2,
            vehicle.height,
            vehicle.width,
            0.3
          );
          ctx.fill();

          // Draw windshield
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.beginPath();
          ctx.roundRect(
            vehicle.height / 4,
            -vehicle.width / 3,
            vehicle.height / 4,
            vehicle.width / 1.5,
            0.2
          );
          ctx.fill();

          // Draw direction indicator
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.moveTo(vehicle.height / 2 + 0.3, 0);
          ctx.lineTo(vehicle.height / 2, -0.3);
          ctx.lineTo(vehicle.height / 2, 0.3);
          ctx.closePath();
          ctx.fill();
        } else {
          // Draw other vehicle
          ctx.fillStyle = COLORS.other;
          ctx.beginPath();
          ctx.roundRect(
            -vehicle.height / 2,
            -vehicle.width / 2,
            vehicle.height,
            vehicle.width,
            0.2
          );
          ctx.fill();

          // Draw darker roof
          ctx.fillStyle = COLORS.otherDark;
          ctx.beginPath();
          ctx.roundRect(
            -vehicle.height / 4,
            -vehicle.width / 3,
            vehicle.height / 2,
            vehicle.width / 1.5,
            0.15
          );
          ctx.fill();
        }

        ctx.restore();
      });

      // Draw distance markers
      if (egoVehicle) {
        ctx.fillStyle = COLORS.text;
        ctx.font = `${1.5}px sans-serif`;
        ctx.textAlign = 'center';

        for (let d = -100; d <= 100; d += 50) {
          if (d !== 0) {
            const x = egoVehicle.x + d;
            const y = -roadHeight / 2 - 2;
            ctx.fillText(`${d > 0 ? '+' : ''}${d}m`, x, y);
          }
        }
      }

      ctx.restore();

      // Draw HUD overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(10, 10, 120, 60);
      ctx.strokeStyle = COLORS.ego;
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, 120, 60);

      ctx.fillStyle = COLORS.text;
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`Vehicles: ${vehicles.length}`, 20, 30);
      ctx.fillText(`Lanes: ${config.lanes}`, 20, 45);
      if (egoVehicle) {
        ctx.fillText(`Speed: ${(egoVehicle.vx).toFixed(1)} m/s`, 20, 60);
      }
    },
    [vehicles, config, egoVehicle, showGrid, showTrajectory, trajectoryPoints]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        draw(ctx, width, height);
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    ctx.save();
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    draw(ctx, width, height);
    ctx.restore();
  }, [draw]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!onVehicleClick || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Simple hit detection (could be improved with proper coordinate transformation)
      const clicked = vehicles.find((v) => {
        const dx = Math.abs(x - rect.width / 2);
        const dy = Math.abs(y - rect.height / 2);
        return dx < 20 && dy < 10;
      });

      if (clicked) {
        onVehicleClick(clicked);
      }
    },
    [vehicles, onVehicleClick]
  );

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />
    </div>
  );
}
