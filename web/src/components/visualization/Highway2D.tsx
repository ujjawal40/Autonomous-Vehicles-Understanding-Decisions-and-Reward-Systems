/**
 * Highway 2D Visualization
 *
 * Bird's eye view of highway with scrolling lanes, ego vehicle, and traffic.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface Vehicle {
  id: string;
  x: number;
  y: number;
  lane: number;
  speed: number;
  isEgo: boolean;
  color: string;
}

interface Highway2DProps {
  lanes?: number;
  egoSpeed?: number;
  egoLane?: number;
  traffic?: Vehicle[];
  isSimulating?: boolean;
  onVehicleClick?: (vehicle: Vehicle) => void;
}

export function Highway2D({
  lanes = 4,
  egoSpeed = 80,
  egoLane = 1,
  traffic = [],
  isSimulating = true,
  onVehicleClick,
}: Highway2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [hoveredVehicle, setHoveredVehicle] = useState<string | null>(null);

  // Initialize traffic
  useEffect(() => {
    if (traffic.length > 0) {
      setVehicles(traffic);
      return;
    }

    // Generate random traffic
    const newVehicles: Vehicle[] = [];
    const colors = ['#ff6b35', '#ffcc00', '#a855f7', '#ff3366', '#00ff88'];

    for (let i = 0; i < 12; i++) {
      newVehicles.push({
        id: `car-${i}`,
        x: Math.random() * 800 - 200,
        y: 0,
        lane: Math.floor(Math.random() * lanes),
        speed: 60 + Math.random() * 40,
        isEgo: false,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setVehicles(newVehicles);
  }, [lanes, traffic]);

  // Draw car shape
  const drawCar = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      color: string,
      isEgo: boolean,
      isHovered: boolean
    ) => {
      ctx.save();
      ctx.translate(x, y);

      // Shadow
      ctx.shadowColor = isEgo ? 'rgba(0, 212, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = isEgo ? 20 : 10;
      ctx.shadowOffsetY = 5;

      // Car body
      ctx.beginPath();
      ctx.roundRect(-width / 2, -height / 2, width, height, 4);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.shadowColor = 'transparent';

      // Windshield
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(-width / 2 + 4, -height / 2 + 4, width - 8, height * 0.25, 2);
      ctx.fill();

      // Rear window
      ctx.beginPath();
      ctx.roundRect(-width / 2 + 4, height / 2 - height * 0.25 - 4, width - 8, height * 0.2, 2);
      ctx.fill();

      // Headlights (front)
      ctx.fillStyle = isEgo ? '#ffffff' : '#ffcc00';
      ctx.beginPath();
      ctx.ellipse(-width / 3, -height / 2 - 2, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width / 3, -height / 2 - 2, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Taillights (rear)
      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.ellipse(-width / 3, height / 2 + 2, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(width / 3, height / 2 + 2, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ego vehicle glow ring
      if (isEgo) {
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(0, 0, width / 2 + 8, height / 2 + 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Direction indicator
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(0, -height / 2 - 8);
        ctx.lineTo(-5, -height / 2 - 3);
        ctx.lineTo(5, -height / 2 - 3);
        ctx.closePath();
        ctx.fill();
      }

      // Hover effect
      if (isHovered && !isEgo) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, 6);
        ctx.stroke();
      }

      ctx.restore();
    },
    []
  );

  // Animation and rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(canvas.parentElement!);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const laneWidth = dimensions.width / lanes;
    const carWidth = laneWidth * 0.5;
    const carHeight = carWidth * 2;

    const animate = () => {
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);

      // Clear with gradient background
      const bgGradient = ctx.createLinearGradient(0, 0, 0, dimensions.height);
      bgGradient.addColorStop(0, '#1a1a2e');
      bgGradient.addColorStop(1, '#0f0f1a');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Update offset for scrolling effect
      if (isSimulating) {
        offsetRef.current += egoSpeed * 0.05;
        if (offsetRef.current > 100) offsetRef.current = 0;
      }

      // Draw road surface
      ctx.fillStyle = '#2d2d44';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // Draw lane dividers
      for (let i = 0; i <= lanes; i++) {
        const x = i * laneWidth;
        const isEdge = i === 0 || i === lanes;

        ctx.strokeStyle = isEdge ? '#ffcc00' : '#ffffff';
        ctx.lineWidth = isEdge ? 4 : 2;

        if (isEdge) {
          // Solid edge lines
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, dimensions.height);
          ctx.stroke();
        } else {
          // Dashed lane dividers with scroll animation
          ctx.setLineDash([30, 20]);
          ctx.lineDashOffset = -offsetRef.current * 2;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, dimensions.height);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      // Draw distance markers
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.font = '12px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      for (let d = 0; d < dimensions.height; d += 100) {
        const markerY = (d + offsetRef.current * 2) % dimensions.height;
        ctx.fillText(`${Math.floor((dimensions.height - markerY) / 10)}m`, 30, markerY);
      }

      // Ego vehicle position
      const egoX = (egoLane + 0.5) * laneWidth;
      const egoY = dimensions.height * 0.7;

      // Update and draw traffic vehicles
      setVehicles((prev) =>
        prev.map((v) => {
          if (!isSimulating) return v;

          // Move relative to ego
          let newY = v.y + (egoSpeed - v.speed) * 0.1;

          // Wrap around
          if (newY > dimensions.height + 100) {
            newY = -100;
            return {
              ...v,
              y: newY,
              lane: Math.floor(Math.random() * lanes),
              speed: 60 + Math.random() * 40,
            };
          }
          if (newY < -150) {
            newY = dimensions.height + 100;
          }

          return { ...v, y: newY };
        })
      );

      // Draw traffic
      vehicles.forEach((v) => {
        const vx = (v.lane + 0.5) * laneWidth;
        drawCar(ctx, vx, v.y, carWidth, carHeight, v.color, false, v.id === hoveredVehicle);
      });

      // Draw ego vehicle
      drawCar(ctx, egoX, egoY, carWidth * 1.1, carHeight * 1.1, '#00d4ff', true, false);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, lanes, egoSpeed, egoLane, vehicles, isSimulating, drawCar, hoveredVehicle]);

  // Handle mouse interaction
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const laneWidth = dimensions.width / lanes;
      const carWidth = laneWidth * 0.5;
      const carHeight = carWidth * 2;

      // Check if hovering over any vehicle
      let found = false;
      for (const v of vehicles) {
        const vx = (v.lane + 0.5) * laneWidth;
        if (
          x > vx - carWidth / 2 &&
          x < vx + carWidth / 2 &&
          y > v.y - carHeight / 2 &&
          y < v.y + carHeight / 2
        ) {
          setHoveredVehicle(v.id);
          found = true;
          break;
        }
      }

      if (!found) {
        setHoveredVehicle(null);
      }
    },
    [dimensions, lanes, vehicles]
  );

  const handleClick = useCallback(
    (_e: React.MouseEvent<HTMLCanvasElement>) => {
      if (hoveredVehicle && onVehicleClick) {
        const vehicle = vehicles.find((v) => v.id === hoveredVehicle);
        if (vehicle) {
          onVehicleClick(vehicle);
        }
      }
    },
    [hoveredVehicle, vehicles, onVehicleClick]
  );

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
        className="w-full h-full cursor-crosshair"
      />
    </div>
  );
}
