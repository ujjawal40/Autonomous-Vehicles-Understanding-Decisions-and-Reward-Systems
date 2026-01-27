import { useRef, useEffect, useState } from 'react';

interface Vehicle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  isEgo: boolean;
}

interface HighwayCanvasProps {
  vehicles: Vehicle[];
  laneCount: number;
  onEgoHover: (isHovering: boolean, x: number, y: number) => void;
}

// Generate demo vehicles when no real data
function generateDemoVehicles(): Vehicle[] {
  return [
    { id: 'ego', x: 200, y: 6, vx: 30, vy: 0, isEgo: true },
    { id: 'car1', x: 350, y: 6, vx: 25, vy: 0, isEgo: false },
    { id: 'car2', x: 100, y: 10, vx: 28, vy: 0, isEgo: false },
    { id: 'car3', x: 450, y: 2, vx: 32, vy: 0, isEgo: false },
    { id: 'car4', x: 50, y: 14, vx: 26, vy: 0, isEgo: false },
    { id: 'car5', x: 500, y: 10, vx: 24, vy: 0, isEgo: false },
  ];
}

function drawCar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  isEgo: boolean
) {
  ctx.save();

  if (isEgo) {
    // Glow effect for ego vehicle
    ctx.shadowColor = color;
    ctx.shadowBlur = 25;
  }

  // Car body (rounded rectangle)
  const radius = 4;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  // Fill car body
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  if (isEgo) {
    gradient.addColorStop(0, '#00e5ff');
    gradient.addColorStop(0.5, '#00d4ff');
    gradient.addColorStop(1, '#0099cc');
  } else {
    gradient.addColorStop(0, '#4a5568');
    gradient.addColorStop(0.5, '#2d3748');
    gradient.addColorStop(1, '#1a202c');
  }
  ctx.fillStyle = gradient;
  ctx.fill();

  // Car outline
  ctx.strokeStyle = isEgo ? '#00fff2' : '#718096';
  ctx.lineWidth = isEgo ? 2 : 1;
  ctx.stroke();

  ctx.shadowBlur = 0;

  // Windshield
  const windshieldWidth = width * 0.3;
  const windshieldHeight = height * 0.6;
  const windshieldX = x + width - windshieldWidth - 5;
  const windshieldY = y + (height - windshieldHeight) / 2;

  ctx.fillStyle = isEgo ? 'rgba(0, 255, 242, 0.3)' : 'rgba(100, 150, 200, 0.3)';
  ctx.fillRect(windshieldX, windshieldY, windshieldWidth, windshieldHeight);

  // Headlights (front of car - right side since car faces right)
  ctx.fillStyle = isEgo ? '#00fff2' : '#ffd700';
  ctx.beginPath();
  ctx.arc(x + width - 3, y + 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + width - 3, y + height - 5, 3, 0, Math.PI * 2);
  ctx.fill();

  // Tail lights (back of car - left side)
  ctx.fillStyle = '#ff4444';
  ctx.fillRect(x, y + 3, 3, 4);
  ctx.fillRect(x, y + height - 7, 3, 4);

  ctx.restore();
}

export function HighwayCanvas({ vehicles, laneCount, onEgoHover }: HighwayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const [demoOffset, setDemoOffset] = useState(0);

  // Use demo vehicles if no real vehicles provided
  const displayVehicles = vehicles.length > 0 ? vehicles : generateDemoVehicles();
  const isDemo = vehicles.length === 0;

  useEffect(() => {
    // Animate demo mode
    if (isDemo) {
      const animate = () => {
        setDemoOffset(prev => (prev + 2) % 1000);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }
  }, [isDemo]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with device pixel ratio for crisp rendering
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const laneHeight = height / laneCount;

    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0a0a12');
    bgGradient.addColorStop(1, '#0d0d18');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw road surface
    ctx.fillStyle = '#1a1a24';
    ctx.fillRect(0, 10, width, height - 20);

    // Draw lane markings (dashed lines)
    ctx.setLineDash([30, 20]);
    ctx.lineWidth = 3;

    for (let i = 1; i < laneCount; i++) {
      const y = i * laneHeight;
      ctx.strokeStyle = i === 2 ? 'rgba(255, 200, 0, 0.6)' : 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw road edges (solid lines)
    ctx.setLineDash([]);
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 4;

    // Top edge
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(width, 8);
    ctx.stroke();

    // Bottom edge
    ctx.beginPath();
    ctx.moveTo(0, height - 8);
    ctx.lineTo(width, height - 8);
    ctx.stroke();

    // Draw shoulder lines
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);

    ctx.beginPath();
    ctx.moveTo(0, 15);
    ctx.lineTo(width, 15);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height - 15);
    ctx.lineTo(width, height - 15);
    ctx.stroke();

    ctx.setLineDash([]);

    // Find ego vehicle for camera positioning
    const egoVehicle = displayVehicles.find(v => v.isEgo);
    const baseOffset = isDemo ? demoOffset : 0;
    const cameraX = egoVehicle ? egoVehicle.x + baseOffset - width * 0.3 : baseOffset;

    // Draw road markers/distance indicators
    ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.font = '10px monospace';
    for (let marker = Math.floor(cameraX / 100) * 100; marker < cameraX + width + 100; marker += 100) {
      const screenX = marker - cameraX;
      if (screenX >= 0 && screenX <= width) {
        ctx.fillRect(screenX - 1, height - 25, 2, 10);
        ctx.fillText(`${marker}m`, screenX - 15, height - 28);
      }
    }

    // Draw vehicles (other vehicles first, then ego on top)
    const sortedVehicles = [...displayVehicles].sort((a, b) => (a.isEgo ? 1 : 0) - (b.isEgo ? 1 : 0));

    sortedVehicles.forEach(vehicle => {
      const vehicleX = vehicle.x + (isDemo ? baseOffset : 0);
      const screenX = vehicleX - cameraX;

      // Calculate lane position (y is in meters, convert to screen)
      const screenY = (vehicle.y / (laneCount * 4)) * (height - 40) + 20;

      // Skip if off screen
      if (screenX < -80 || screenX > width + 80) return;

      const carWidth = 60;
      const carHeight = 28;

      drawCar(
        ctx,
        screenX - carWidth / 2,
        screenY - carHeight / 2,
        carWidth,
        carHeight,
        vehicle.isEgo ? '#00d4ff' : '#4a5568',
        vehicle.isEgo
      );

      // Draw speed indicator above ego vehicle
      if (vehicle.isEgo) {
        ctx.fillStyle = '#00fff2';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${vehicle.vx.toFixed(0)} m/s`, screenX, screenY - carHeight / 2 - 10);

        // Draw direction arrow
        ctx.strokeStyle = '#00fff2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX + carWidth / 2 + 5, screenY);
        ctx.lineTo(screenX + carWidth / 2 + 20, screenY);
        ctx.lineTo(screenX + carWidth / 2 + 15, screenY - 5);
        ctx.moveTo(screenX + carWidth / 2 + 20, screenY);
        ctx.lineTo(screenX + carWidth / 2 + 15, screenY + 5);
        ctx.stroke();
      }
    });

    // Draw "DEMO MODE" overlay if in demo
    if (isDemo) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(width / 2 - 80, 10, 160, 30);
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 1;
      ctx.strokeRect(width / 2 - 80, 10, 160, 30);
      ctx.fillStyle = '#00d4ff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('DEMO MODE', width / 2, 30);
    }

  }, [displayVehicles, laneCount, demoOffset, isDemo]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const egoVehicle = displayVehicles.find(v => v.isEgo);
    if (egoVehicle) {
      const width = rect.width;
      const height = rect.height;
      const cameraX = egoVehicle.x + (isDemo ? demoOffset : 0) - width * 0.3;
      const screenX = egoVehicle.x + (isDemo ? demoOffset : 0) - cameraX;
      const screenY = (egoVehicle.y / (laneCount * 4)) * (height - 40) + 20;

      const distance = Math.sqrt((x - screenX) ** 2 + (y - screenY) ** 2);
      onEgoHover(distance < 50, e.clientX, e.clientY);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative bg-space-950">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onEgoHover(false, 0, 0)}
      />
    </div>
  );
}
