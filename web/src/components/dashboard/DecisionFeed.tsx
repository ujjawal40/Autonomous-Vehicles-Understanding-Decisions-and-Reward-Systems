/**
 * Decision Feed Component
 *
 * Real-time feed of agent decisions with timestamps and details.
 */

import { useRef, useEffect } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Minus,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Decision {
  id: string;
  timestamp: number;
  step: number;
  action: number;
  reward: number;
  cumulativeReward: number;
  confidence: number;
  isCollision?: boolean;
  isSuccess?: boolean;
  reasoning?: string;
}

interface DecisionFeedProps {
  decisions: Decision[];
  maxItems?: number;
  autoScroll?: boolean;
  onDecisionClick?: (decision: Decision) => void;
}

const ACTION_CONFIG = [
  { id: 0, label: 'Accelerate', icon: ArrowUp, color: '#00ff88', shortLabel: 'ACC' },
  { id: 1, label: 'Decelerate', icon: ArrowDown, color: '#ff6b35', shortLabel: 'DEC' },
  { id: 2, label: 'Lane Left', icon: ArrowLeft, color: '#00d4ff', shortLabel: 'L←' },
  { id: 3, label: 'Lane Right', icon: ArrowRight, color: '#00d4ff', shortLabel: 'R→' },
  { id: 4, label: 'Maintain', icon: Minus, color: '#a855f7', shortLabel: 'MNT' },
];

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 2,
  } as Intl.DateTimeFormatOptions);
}

export function DecisionFeed({
  decisions,
  maxItems = 50,
  autoScroll = true,
  onDecisionClick,
}: DecisionFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const displayedDecisions = decisions.slice(-maxItems);

  useEffect(() => {
    if (autoScroll && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [decisions, autoScroll]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-[--color-cyber-blue]" />
          <span className="text-xs text-white/50 uppercase tracking-wider">Decision Feed</span>
        </div>
        <span className="text-xs text-white/30">
          {decisions.length} decisions
        </span>
      </div>

      {/* Feed */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
      >
        {displayedDecisions.length === 0 ? (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            No decisions yet. Start training to see the feed.
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {displayedDecisions.map((decision) => {
              const actionConfig = ACTION_CONFIG[decision.action] || ACTION_CONFIG[4];
              const Icon = actionConfig.icon;

              return (
                <div
                  key={decision.id}
                  onClick={() => onDecisionClick?.(decision)}
                  className={`
                    p-2 rounded-lg border cursor-pointer transition-all
                    hover:bg-white/5
                    ${decision.isCollision
                      ? 'bg-[#ff3366]/10 border-[#ff3366]/30'
                      : decision.isSuccess
                      ? 'bg-[#00ff88]/10 border-[#00ff88]/30'
                      : 'bg-[--color-space-800] border-white/5'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    {/* Step number */}
                    <span className="text-[10px] font-mono text-white/30 w-8">
                      #{decision.step}
                    </span>

                    {/* Action icon */}
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${actionConfig.color}20` }}
                    >
                      <Icon size={12} style={{ color: actionConfig.color }} />
                    </div>

                    {/* Action label */}
                    <span className="text-xs font-medium text-white flex-1 truncate">
                      {actionConfig.label}
                    </span>

                    {/* Reward */}
                    <span
                      className={`text-xs font-mono ${
                        decision.reward >= 0 ? 'text-[--color-cyber-green]' : 'text-[--color-cyber-orange]'
                      }`}
                    >
                      {decision.reward >= 0 ? '+' : ''}{decision.reward.toFixed(2)}
                    </span>

                    {/* Status indicator */}
                    {decision.isCollision && (
                      <XCircle size={12} className="text-[#ff3366] flex-shrink-0" />
                    )}
                    {decision.isSuccess && (
                      <CheckCircle size={12} className="text-[#00ff88] flex-shrink-0" />
                    )}
                    {decision.confidence < 0.5 && !decision.isCollision && !decision.isSuccess && (
                      <AlertTriangle size={12} className="text-[#ff6b35] flex-shrink-0" />
                    )}
                  </div>

                  {/* Timestamp and cumulative reward */}
                  <div className="flex items-center justify-between mt-1 text-[10px] text-white/30">
                    <span>{formatTime(decision.timestamp)}</span>
                    <span>Total: {decision.cumulativeReward.toFixed(2)}</span>
                  </div>

                  {/* Reasoning (if provided) */}
                  {decision.reasoning && (
                    <p className="mt-1 text-[10px] text-white/40 truncate">
                      {decision.reasoning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {decisions.length > 0 && (
        <div className="p-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-white/40">Avg Reward</div>
            <div className="text-sm font-mono text-[--color-cyber-blue]">
              {(decisions.reduce((s, d) => s + d.reward, 0) / decisions.length).toFixed(3)}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/40">Total</div>
            <div className="text-sm font-mono text-[--color-cyber-green]">
              {decisions[decisions.length - 1]?.cumulativeReward.toFixed(2) || '0.00'}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/40">Collisions</div>
            <div className="text-sm font-mono text-[#ff3366]">
              {decisions.filter((d) => d.isCollision).length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
