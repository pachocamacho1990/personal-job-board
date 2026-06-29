import React, { useRef, useEffect, useState } from 'react';
import { JobHistory } from '../types';
import { formatFullDate, formatRelativeTime } from '../utils';

interface JourneyMapProps {
  history: JobHistory[];
  currentStatus: string;
}

export const JourneyMap: React.FC<JourneyMapProps> = ({ history, currentStatus }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(500);

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth || 500);
    }
  }, [history]);

  const columns = ['interested', 'applied', 'forgotten', 'interview', 'pending', 'offer', 'rejected', 'archived'];
  const colWidth = 100;
  const padding = { top: 50, right: 30, bottom: 30, left: 30 };
  const totalWidth = padding.left + (columns.length - 1) * colWidth + padding.right;
  const width = Math.max(containerWidth, totalWidth);
  const height = Math.max(350, history.length * 80 + 120);

  const getX = (status: string) => {
    let idx = columns.indexOf(status);
    if (idx === -1) {
      idx = 0;
    }
    return padding.left + idx * colWidth;
  };

  const nodes: {
    x: number;
    y: number;
    status: string;
    date: string;
    label: string;
    isCurrent: boolean;
    isStart?: boolean;
  }[] = [];

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  );

  // 1. Add Start Node
  if (sortedHistory.length > 0) {
    const firstEntry = sortedHistory[0];
    if (firstEntry.previous_status) {
      nodes.push({
        x: getX(firstEntry.previous_status),
        y: padding.top,
        status: firstEntry.previous_status,
        date: firstEntry.changed_at,
        label: 'Start',
        isCurrent: false,
        isStart: true,
      });
    }
  }

  // 2. Add History Nodes
  sortedHistory.forEach((entry, i) => {
    const yOffset = nodes.length > 0 && nodes[0].isStart ? (i + 1) * 80 : i * 80;
    nodes.push({
      x: getX(entry.new_status),
      y: padding.top + yOffset,
      status: entry.new_status,
      date: entry.changed_at,
      label: formatFullDate(entry.changed_at),
      isCurrent: false,
    });
  });

  // If no history, show current status as single node
  if (nodes.length === 0) {
    nodes.push({
      x: getX(currentStatus),
      y: padding.top,
      status: currentStatus,
      date: new Date().toISOString(),
      label: 'Current Status',
      isCurrent: true,
    });
  } else {
    nodes[nodes.length - 1].isCurrent = true;
  }

  // Draw SVG paths
  let pathD = '';
  if (nodes.length > 1) {
    pathD = `M ${nodes[0].x} ${nodes[0].y}`;
    for (let i = 1; i < nodes.length; i++) {
      pathD += ` L ${nodes[i].x} ${nodes[i].y}`;
    }
  }

  return (
    <div className="journey-graph-container" id="journeyGraph" ref={containerRef} style={{ overflowX: 'auto' }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* Column Lines and Labels */}
        {columns.map((col, i) => {
          const x = padding.left + i * colWidth;
          const label = col.charAt(0).toUpperCase() + col.slice(1);
          return (
            <g key={col}>
              <line
                x1={x}
                y1={padding.top + 10}
                x2={x}
                y2={height - padding.bottom}
                stroke="#E2E8F0"
                strokeDasharray="4"
              />
              <text x={x} y={padding.top - 5} className="status-column-label" textAnchor="middle">
                {label}
              </text>
            </g>
          );
        })}

        {/* Path Line */}
        {pathD && <path d={pathD} className="journey-path active" />}

        {/* Nodes and Labels */}
        {nodes.map((node, index) => {
          const r = node.isCurrent ? 10 : 6;
          const classes = `journey-node ${node.isCurrent ? 'active' : ''}`;
          return (
            <g key={index}>
              <circle cx={node.x} cy={node.y} r={r} className={classes} />
              <text x={node.x + 15} y={node.y + 4} className="time-label">
                {formatRelativeTime(node.date)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
