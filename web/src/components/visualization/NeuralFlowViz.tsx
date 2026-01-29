/**
 * Neural Flow Visualization
 *
 * Shows the AI "thinking" process with animated nodes and connections.
 * Probabilities flow through the network, with the selected action glowing.
 */

import { useEffect, useRef, useState } from 'react';

interface ActionProbability {
  id: string;
  name: string;
  probability: number;
  color: string;
}

interface NeuralFlowVizProps {
  probabilities: ActionProbability[];
  selectedAction: string;
  isAnimating?: boolean;
}

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  progress: number;
  color: string;
  size: number;
  actionId: string;
}

export function NeuralFlowViz({ probabilities, selectedAction, isAnimating = true }: NeuralFlowVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Node positions
  const getNodePositions = (width: number, height: number) => {
    const centerX = width / 2;
    const inputY = height * 0.15;
    const hiddenY = height * 0.45;
    const outputY = height * 0.8;

    // Input layer (state representation)
    const inputNodes = [
      { x: centerX - 120, y: inputY, label: 'Speed', type: 'input' },
      { x: centerX - 60, y: inputY, label: 'Dist', type: 'input' },
      { x: centerX, y: inputY, label: 'Lane', type: 'input' },
      { x: centerX + 60, y: inputY, label: 'Traffic', type: 'input' },
      { x: centerX + 120, y: inputY, label: 'Risk', type: 'input' },
    ];

    // Hidden layer (processing)
    const hiddenNodes = [
      { x: centerX - 100, y: hiddenY, label: '', type: 'hidden' },
      { x: centerX - 50, y: hiddenY, label: '', type: 'hidden' },
      { x: centerX, y: hiddenY, label: '', type: 'hidden' },
      { x: centerX + 50, y: hiddenY, label: '', type: 'hidden' },
      { x: centerX + 100, y: hiddenY, label: '', type: 'hidden' },
    ];

    // Output layer (actions)
    const outputSpacing = 80;
    const outputStartX = centerX - ((probabilities.length - 1) * outputSpacing) / 2;
    const outputNodes = probabilities.map((p, i) => ({
      x: outputStartX + i * outputSpacing,
      y: outputY,
      label: p.name,
      type: 'output',
      actionId: p.id,
      probability: p.probability,
      color: p.color,
      isSelected: p.id === selectedAction,
    }));

    return { inputNodes, hiddenNodes, outputNodes };
  };

  // Create particles flowing through the network
  const createParticle = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string,
    actionId: string
  ): Particle => ({
    x: startX,
    y: startY,
    targetX: endX,
    targetY: endY,
    speed: 0.02 + Math.random() * 0.02,
    progress: 0,
    color,
    size: 2 + Math.random() * 2,
    actionId,
  });

  // Animation loop
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

    const { inputNodes, hiddenNodes, outputNodes } = getNodePositions(dimensions.width, dimensions.height);
    let lastParticleTime = 0;

    const animate = (timestamp: number) => {
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw connections (input -> hidden)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      inputNodes.forEach((input) => {
        hiddenNodes.forEach((hidden) => {
          ctx.beginPath();
          ctx.moveTo(input.x, input.y);
          ctx.lineTo(hidden.x, hidden.y);
          ctx.stroke();
        });
      });

      // Draw connections (hidden -> output) with probability-based opacity
      hiddenNodes.forEach((hidden) => {
        outputNodes.forEach((output) => {
          const opacity = 0.05 + output.probability * 0.3;
          ctx.strokeStyle = output.isSelected
            ? `rgba(0, 255, 136, ${opacity + 0.2})`
            : `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = output.isSelected ? 2 : 1;
          ctx.beginPath();
          ctx.moveTo(hidden.x, hidden.y);
          ctx.lineTo(output.x, output.y);
          ctx.stroke();
        });
      });

      // Create new particles periodically
      if (isAnimating && timestamp - lastParticleTime > 100) {
        lastParticleTime = timestamp;

        // Particles from input to hidden
        const randomInput = inputNodes[Math.floor(Math.random() * inputNodes.length)];
        const randomHidden = hiddenNodes[Math.floor(Math.random() * hiddenNodes.length)];
        particlesRef.current.push(
          createParticle(randomInput.x, randomInput.y, randomHidden.x, randomHidden.y, '#00d4ff', '')
        );

        // Particles from hidden to output (weighted by probability)
        const randomHidden2 = hiddenNodes[Math.floor(Math.random() * hiddenNodes.length)];
        const totalProb = probabilities.reduce((sum, p) => sum + p.probability, 0);
        let rand = Math.random() * totalProb;
        let targetOutput = outputNodes[0];
        for (const output of outputNodes) {
          rand -= output.probability;
          if (rand <= 0) {
            targetOutput = output;
            break;
          }
        }
        particlesRef.current.push(
          createParticle(
            randomHidden2.x,
            randomHidden2.y,
            targetOutput.x,
            targetOutput.y,
            targetOutput.color,
            targetOutput.actionId
          )
        );
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        particle.progress += particle.speed;

        if (particle.progress >= 1) return false;

        // Move particle toward target
        particle.x = particle.x + (particle.targetX - particle.x) * particle.speed * 3;
        particle.y = particle.y + (particle.targetY - particle.y) * particle.speed * 3;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);

        // Glow effect
        const gradient = ctx.createRadialGradient(
          particle.x,
          particle.y,
          0,
          particle.x,
          particle.y,
          particle.size * 3
        );
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(0.5, particle.color + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        return true;
      });

      // Draw input nodes
      inputNodes.forEach((node) => {
        // Glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 20);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
        ctx.fill();

        // Node
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a0f';
        ctx.fill();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '10px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y - 18);
      });

      // Draw hidden nodes
      hiddenNodes.forEach((node) => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Draw output nodes (actions)
      outputNodes.forEach((node) => {
        const pulseScale = node.isSelected ? 1 + Math.sin(timestamp / 200) * 0.1 : 1;
        const radius = 18 * pulseScale;

        // Outer glow for selected
        if (node.isSelected) {
          const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 40);
          glowGradient.addColorStop(0, node.color + '60');
          glowGradient.addColorStop(0.5, node.color + '20');
          glowGradient.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 40, 0, Math.PI * 2);
          ctx.fill();
        }

        // Probability ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * node.probability);
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Background ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = node.isSelected ? node.color + '40' : '#0a0a0f';
        ctx.fill();
        ctx.strokeStyle = node.isSelected ? node.color : 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Percentage text
        ctx.fillStyle = node.isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.7)';
        ctx.font = `${node.isSelected ? 'bold ' : ''}12px "Space Grotesk", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(node.probability * 100)}%`, node.x, node.y);

        // Label
        ctx.fillStyle = node.isSelected ? node.color : 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${node.isSelected ? 'bold ' : ''}11px "Space Grotesk", sans-serif`;
        ctx.fillText(node.label, node.x, node.y + 35);
      });

      // Layer labels
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.font = '9px "Space Grotesk", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('STATE INPUT', 10, dimensions.height * 0.15);
      ctx.fillText('HIDDEN LAYER', 10, dimensions.height * 0.45);
      ctx.fillText('ACTION OUTPUT', 10, dimensions.height * 0.8);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions, probabilities, selectedAction, isAnimating]);

  return (
    <div className="relative w-full h-full bg-[#030305]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
