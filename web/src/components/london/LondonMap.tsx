import { useRef, useEffect, useState } from 'react';

interface Intersection {
  id: number;
  x: number;
  y: number;
  neighbors: number[];
  streetNames: string[];
}

interface Road {
  startId: number;
  endId: number;
  length: number;
  name: string;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface MapData {
  intersections: Intersection[];
  roads: Road[];
  bounds: Bounds;
}

interface LondonMapProps {
  mapData: MapData | null;
  currentNode: number | null;
  targetNode: number | null;
  pathTaken: number[];
  optimalPath: number[];
  onNodeHover?: (node: Intersection | null) => void;
}

export function LondonMap({
  mapData,
  currentNode,
  targetNode,
  pathTaken,
  optimalPath,
  onNodeHover,
}: LondonMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<Intersection | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !mapData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = 40;

    // Calculate scale
    const bounds = mapData.bounds;
    const mapWidth = bounds.maxX - bounds.minX;
    const mapHeight = bounds.maxY - bounds.minY;
    const scale = Math.min(
      (width - 2 * padding) / mapWidth,
      (height - 2 * padding) / mapHeight
    );

    // Transform function
    const transform = (x: number, y: number): [number, number] => {
      const tx = padding + (x - bounds.minX) * scale;
      const ty = height - padding - (y - bounds.minY) * scale; // Flip Y
      return [tx, ty];
    };

    // Clear canvas
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0a0a12');
    bgGradient.addColorStop(1, '#0d0d18');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Draw title
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('LONDON • SOHO DISTRICT', 10, 25);

    // Create intersection lookup
    const intersectionMap = new Map<number, Intersection>();
    mapData.intersections.forEach(i => intersectionMap.set(i.id, i));

    // Draw roads (all roads first)
    ctx.strokeStyle = 'rgba(100, 100, 120, 0.4)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    mapData.roads.forEach(road => {
      const start = intersectionMap.get(road.startId);
      const end = intersectionMap.get(road.endId);
      if (!start || !end) return;

      const [x1, y1] = transform(start.x, start.y);
      const [x2, y2] = transform(end.x, end.y);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    // Draw optimal path
    if (optimalPath.length > 1) {
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
      ctx.lineWidth = 8;
      ctx.setLineDash([10, 10]);

      ctx.beginPath();
      for (let i = 0; i < optimalPath.length; i++) {
        const node = intersectionMap.get(optimalPath[i]);
        if (!node) continue;
        const [x, y] = transform(node.x, node.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw path taken
    if (pathTaken.length > 1) {
      // Glow effect
      ctx.shadowColor = '#00d4ff';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 4;

      ctx.beginPath();
      for (let i = 0; i < pathTaken.length; i++) {
        const node = intersectionMap.get(pathTaken[i]);
        if (!node) continue;
        const [x, y] = transform(node.x, node.y);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw direction arrows along path
      ctx.fillStyle = '#00d4ff';
      for (let i = 0; i < pathTaken.length - 1; i++) {
        const from = intersectionMap.get(pathTaken[i]);
        const to = intersectionMap.get(pathTaken[i + 1]);
        if (!from || !to) continue;

        const [x1, y1] = transform(from.x, from.y);
        const [x2, y2] = transform(to.x, to.y);

        // Draw arrow at midpoint
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);

        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-4, -4);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Draw intersections
    mapData.intersections.forEach(intersection => {
      const [x, y] = transform(intersection.x, intersection.y);

      const isStart = pathTaken.length > 0 && pathTaken[0] === intersection.id;
      const isTarget = intersection.id === targetNode;
      const isCurrent = intersection.id === currentNode;
      const isOnPath = pathTaken.includes(intersection.id);
      const isHovered = hoveredNode?.id === intersection.id;

      // Node size
      let radius = 4;
      if (isStart || isTarget || isCurrent) radius = 10;
      else if (isOnPath) radius = 6;
      if (isHovered) radius += 2;

      // Draw glow for special nodes
      if (isTarget) {
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Target icon (flag)
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🏁', x, y - 18);
      } else if (isCurrent) {
        // Animated pulse effect
        const pulse = (Date.now() % 1000) / 1000;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20 + pulse * 10;
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(x, y, radius + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Car icon
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🚗', x, y - 18);
      } else if (isStart) {
        ctx.shadowColor = '#ff6b35';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ff6b35';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📍', x, y - 16);
      } else if (isOnPath) {
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = isHovered ? '#6b7280' : '#374151';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw legend
    const legendY = height - 60;
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';

    // Start
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(15, legendY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('Start', 25, legendY + 4);

    // Target
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.arc(80, legendY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('Target', 90, legendY + 4);

    // Current
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(155, legendY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('Agent', 165, legendY + 4);

    // Optimal path
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.5)';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(225, legendY);
    ctx.lineTo(255, legendY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#00ff88';
    ctx.fillText('Optimal', 260, legendY + 4);

  }, [mapData, currentNode, targetNode, pathTaken, optimalPath, hoveredNode]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!mapData || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const padding = 40;

    const bounds = mapData.bounds;
    const mapWidth = bounds.maxX - bounds.minX;
    const mapHeight = bounds.maxY - bounds.minY;
    const scale = Math.min(
      (rect.width - 2 * padding) / mapWidth,
      (rect.height - 2 * padding) / mapHeight
    );

    // Find closest node
    let closest: Intersection | null = null;
    let closestDist = 20; // Max distance to detect hover

    for (const intersection of mapData.intersections) {
      const tx = padding + (intersection.x - bounds.minX) * scale;
      const ty = rect.height - padding - (intersection.y - bounds.minY) * scale;

      const dist = Math.sqrt((mouseX - tx) ** 2 + (mouseY - ty) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closest = intersection;
      }
    }

    setHoveredNode(closest);
    onNodeHover?.(closest);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHoveredNode(null);
          onNodeHover?.(null);
        }}
      />
      {hoveredNode && (
        <div
          className="absolute pointer-events-none bg-space-900/95 border border-cyber-blue/50
                     rounded-lg px-3 py-2 text-xs font-mono shadow-lg"
          style={{
            left: '50%',
            bottom: 80,
            transform: 'translateX(-50%)',
          }}
        >
          <div className="text-cyber-blue font-bold">Node #{hoveredNode.id}</div>
          {hoveredNode.streetNames.length > 0 && (
            <div className="text-gray-400 mt-1">
              {hoveredNode.streetNames.slice(0, 2).join(' / ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
