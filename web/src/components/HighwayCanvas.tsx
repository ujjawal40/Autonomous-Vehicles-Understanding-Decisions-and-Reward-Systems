import { useRef, useEffect } from 'react';

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

export function HighwayCanvas({ vehicles, laneCount, onEgoHover }: HighwayCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const width = canvas.width;
    const height = canvas.height;
    const laneHeight = height / laneCount;

    // Clear canvas
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, width, height);

    // Draw lane markings
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
    ctx.setLineDash([20, 20]);
    ctx.lineWidth = 2;

    for (let i = 1; i < laneCount; i++) {
      const y = i * laneHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw road edges
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.setLineDash([]);
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(width, 0);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, height);
    ctx.stroke();

    // Find ego vehicle for camera positioning
    const egoVehicle = vehicles.find(v => v.isEgo);
    const cameraX = egoVehicle ? egoVehicle.x - width * 0.3 : 0;

    // Draw vehicles
    vehicles.forEach(vehicle => {
      const screenX = vehicle.x - cameraX;
      const screenY = (vehicle.y / (laneCount * 4)) * height;

      // Skip if off screen
      if (screenX < -50 || screenX > width + 50) return;

      const carWidth = 40;
      const carHeight = 20;

      if (vehicle.isEgo) {
        // Draw ego vehicle with glow
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(screenX - carWidth / 2, screenY - carHeight / 2, carWidth, carHeight);

        // Draw direction indicator
        ctx.fillStyle = '#00fff2';
        ctx.beginPath();
        ctx.moveTo(screenX + carWidth / 2, screenY);
        ctx.lineTo(screenX + carWidth / 2 + 10, screenY - 5);
        ctx.lineTo(screenX + carWidth / 2 + 10, screenY + 5);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
      } else {
        // Draw other vehicles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(screenX - carWidth / 2, screenY - carHeight / 2, carWidth, carHeight);
      }
    });

    // Draw speed lines (motion effect)
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const y = Math.random() * height;
      const x = Math.random() * width;
      const lineLength = 30 + Math.random() * 50;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - lineLength, y);
      ctx.stroke();
    }

  }, [vehicles, laneCount]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if hovering over ego vehicle
    const egoVehicle = vehicles.find(v => v.isEgo);
    if (egoVehicle) {
      const cameraX = egoVehicle.x - canvas.width * 0.3;
      const screenX = egoVehicle.x - cameraX;
      const screenY = (egoVehicle.y / (laneCount * 4)) * canvas.height;

      const distance = Math.sqrt((x - screenX) ** 2 + (y - screenY) ** 2);
      onEgoHover(distance < 40, e.clientX, e.clientY);
    }
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onEgoHover(false, 0, 0)}
      />
    </div>
  );
}
