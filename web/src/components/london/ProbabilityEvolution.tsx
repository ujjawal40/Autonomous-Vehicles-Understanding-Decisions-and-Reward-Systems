import { useRef, useEffect } from 'react';

interface EpisodeSummary {
  episode: number;
  avgProbs: Record<string, number>;
  totalReward: number;
  steps: number;
}

interface ProbabilityEvolutionProps {
  data: EpisodeSummary[];
  currentEpisode: number;
}

const ACTION_COLORS: Record<string, string> = {
  '0': '#00d4ff', // NORTH - cyan
  '1': '#00ff88', // EAST - green
  '2': '#ff6b35', // SOUTH - orange
  '3': '#ff3366', // WEST - red
  '4': '#a855f7', // NORTHEAST - purple
  '5': '#fbbf24', // SOUTHEAST - yellow
  '6': '#06b6d4', // SOUTHWEST - teal
  '7': '#ec4899', // NORTHWEST - pink
};

const ACTION_NAMES: Record<string, string> = {
  '0': 'N',
  '1': 'E',
  '2': 'S',
  '3': 'W',
  '4': 'NE',
  '5': 'SE',
  '6': 'SW',
  '7': 'NW',
};

export function ProbabilityEvolution({ data, currentEpisode }: ProbabilityEvolutionProps) {
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
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 40, right: 20, bottom: 50, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Clear canvas
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, width, height);

    // Draw title
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('PROBABILITY EVOLUTION', padding.left, 25);

    if (data.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for data...', width / 2, height / 2);
      return;
    }

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, height - padding.bottom);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, height - padding.bottom);
    ctx.lineTo(width - padding.right, height - padding.bottom);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight * i) / 4;
      const value = 1 - i * 0.25;
      ctx.fillText(value.toFixed(2), padding.left - 5, y + 3);

      // Grid line
      ctx.strokeStyle = '#1f2937';
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // X-axis label
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    ctx.fillText('Episode', width / 2, height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Probability', 0, 0);
    ctx.restore();

    // Calculate x scale
    const maxEpisode = Math.max(...data.map(d => d.episode), currentEpisode);
    const xScale = chartWidth / Math.max(maxEpisode, 1);

    // X-axis episode markers
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'center';
    const episodeStep = Math.max(1, Math.floor(maxEpisode / 10));
    for (let ep = 0; ep <= maxEpisode; ep += episodeStep) {
      const x = padding.left + ep * xScale;
      ctx.fillText(ep.toString(), x, height - padding.bottom + 15);
    }

    // Draw stacked area chart for each action
    const actions = Object.keys(ACTION_COLORS);

    // First pass: draw filled areas (stacked)
    actions.forEach((action, _actionIndex) => {
      if (data.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(padding.left, height - padding.bottom);

      // Build the path
      data.forEach((d, i) => {
        const x = padding.left + d.episode * xScale;
        const prob = d.avgProbs[action] || 0;
        const y = padding.top + chartHeight * (1 - prob);

        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      // Close the path
      const lastX = padding.left + data[data.length - 1].episode * xScale;
      ctx.lineTo(lastX, height - padding.bottom);
      ctx.closePath();

      // Fill with transparency
      const color = ACTION_COLORS[action];
      ctx.fillStyle = color + '20'; // 20% opacity
      ctx.fill();
    });

    // Second pass: draw lines
    actions.forEach((action) => {
      if (data.length < 1) return;

      ctx.beginPath();
      ctx.strokeStyle = ACTION_COLORS[action];
      ctx.lineWidth = 2;

      data.forEach((d, i) => {
        const x = padding.left + d.episode * xScale;
        const prob = d.avgProbs[action] || 0;
        const y = padding.top + chartHeight * (1 - prob);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw points
      data.forEach((d) => {
        const x = padding.left + d.episode * xScale;
        const prob = d.avgProbs[action] || 0;
        const y = padding.top + chartHeight * (1 - prob);

        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = ACTION_COLORS[action];
        ctx.fill();
      });
    });

    // Draw current episode marker
    if (currentEpisode > 0) {
      const markerX = padding.left + currentEpisode * xScale;
      ctx.strokeStyle = '#00d4ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(markerX, padding.top);
      ctx.lineTo(markerX, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw legend
    const legendX = width - padding.right - 80;
    const legendY = padding.top + 10;

    ctx.fillStyle = 'rgba(10, 10, 18, 0.9)';
    ctx.fillRect(legendX - 10, legendY - 5, 90, actions.length * 18 + 10);

    actions.forEach((action, i) => {
      const y = legendY + i * 18 + 10;

      // Color box
      ctx.fillStyle = ACTION_COLORS[action];
      ctx.fillRect(legendX, y - 8, 12, 12);

      // Label
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ACTION_NAMES[action], legendX + 18, y + 2);
    });

  }, [data, currentEpisode]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}

// 3D-style visualization component (isometric view)
export function ProbabilityEvolution3D({ data, currentEpisode }: ProbabilityEvolutionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = '#00d4ff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('3D PROBABILITY SURFACE', 20, 25);

    if (data.length === 0) {
      ctx.fillStyle = '#6b7280';
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Building probability surface...', width / 2, height / 2);
      return;
    }

    // Isometric projection parameters
    const centerX = width / 2;
    const centerY = height / 2 + 30;
    const scaleX = 15;
    const scaleY = 8;
    const scaleZ = 100;

    // Transform to isometric coordinates
    const toIso = (episode: number, action: number, probability: number): [number, number] => {
      const x = (episode - data.length / 2) * scaleX;
      const y = (action - 4) * scaleY;
      const z = probability * scaleZ;

      // Isometric projection
      const isoX = centerX + (x - y) * 0.866;
      const isoY = centerY + (x + y) * 0.5 - z;

      return [isoX, isoY];
    };

    // Draw grid base
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;

    const actions = Object.keys(ACTION_COLORS);
    const maxEpisode = data.length;

    // Draw grid lines
    for (let ep = 0; ep <= maxEpisode; ep += 2) {
      ctx.beginPath();
      const [x1, y1] = toIso(ep, 0, 0);
      const [x2, y2] = toIso(ep, 7, 0);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    for (let a = 0; a <= 7; a++) {
      ctx.beginPath();
      const [x1, y1] = toIso(0, a, 0);
      const [x2, y2] = toIso(maxEpisode, a, 0);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Draw probability bars (3D effect)
    data.forEach((d, epIndex) => {
      actions.forEach((action) => {
        const prob = d.avgProbs[action] || 0;
        if (prob < 0.01) return;

        const actionIdx = parseInt(action);
        const [baseX, baseY] = toIso(epIndex, actionIdx, 0);
        const [topX, topY] = toIso(epIndex, actionIdx, prob);

        // Bar width
        const barWidth = scaleX * 0.6;

        // Draw 3D bar
        const color = ACTION_COLORS[action];

        // Front face
        ctx.fillStyle = color + 'cc';
        ctx.beginPath();
        ctx.moveTo(baseX - barWidth / 2, baseY);
        ctx.lineTo(baseX + barWidth / 2, baseY);
        ctx.lineTo(topX + barWidth / 2, topY);
        ctx.lineTo(topX - barWidth / 2, topY);
        ctx.closePath();
        ctx.fill();

        // Top face
        ctx.fillStyle = color;
        const depth = scaleY * 0.4;
        ctx.beginPath();
        ctx.moveTo(topX - barWidth / 2, topY);
        ctx.lineTo(topX + barWidth / 2, topY);
        ctx.lineTo(topX + barWidth / 2 + depth * 0.5, topY - depth * 0.3);
        ctx.lineTo(topX - barWidth / 2 + depth * 0.5, topY - depth * 0.3);
        ctx.closePath();
        ctx.fill();

        // Right face
        ctx.fillStyle = color + '99';
        ctx.beginPath();
        ctx.moveTo(baseX + barWidth / 2, baseY);
        ctx.lineTo(topX + barWidth / 2, topY);
        ctx.lineTo(topX + barWidth / 2 + depth * 0.5, topY - depth * 0.3);
        ctx.lineTo(baseX + barWidth / 2 + depth * 0.5, baseY - depth * 0.3);
        ctx.closePath();
        ctx.fill();
      });
    });

    // Axis labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px "JetBrains Mono", monospace';

    // Episode axis
    ctx.textAlign = 'center';
    const [epLabelX, epLabelY] = toIso(maxEpisode / 2, -1, 0);
    ctx.fillText('Episode →', epLabelX, epLabelY + 20);

    // Action axis
    const [actLabelX, actLabelY] = toIso(-1, 4, 0);
    ctx.fillText('Action', actLabelX - 30, actLabelY);

    // Probability axis
    ctx.save();
    ctx.translate(30, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Probability', 0, 0);
    ctx.restore();

    // Legend
    const legendX = 20;
    const legendY = height - 100;

    ctx.fillStyle = 'rgba(10, 10, 18, 0.9)';
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    ctx.fillRect(legendX - 5, legendY - 5, 70, 90);
    ctx.strokeRect(legendX - 5, legendY - 5, 70, 90);

    actions.slice(0, 4).forEach((action, i) => {
      const y = legendY + i * 20 + 10;
      ctx.fillStyle = ACTION_COLORS[action];
      ctx.fillRect(legendX, y - 6, 10, 10);
      ctx.fillStyle = '#9ca3af';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(ACTION_NAMES[action], legendX + 15, y + 3);
    });

  }, [data, currentEpisode]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
