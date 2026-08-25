import React, { useState, useId } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { TrendDataPoint } from '../../types';

interface TrendChartProps {
  title: string;
  description?: string;
  data: TrendDataPoint[];
  primaryKey?: 'invoiced_amount' | 'procurement_value' | 'order_count';
  secondaryKey?: 'collected_amount';
  primaryLabel?: string;
  secondaryLabel?: string;
  isCurrency?: boolean;
  className?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  title,
  description,
  data,
  primaryKey = 'invoiced_amount',
  secondaryKey = 'collected_amount',
  primaryLabel = 'Invoiced',
  secondaryLabel = 'Collected',
  isCurrency = true,
  className = '',
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartId = useId();

  if (!data || data.length === 0) {
    return (
      <Card className={`p-6 ${className}`}>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          No trend data recorded for the selected date range.
        </div>
      </Card>
    );
  }

  // Parse values safely
  const parsedData = data.map((d) => ({
    date: d.date,
    pVal: Number(d[primaryKey] || 0),
    sVal: secondaryKey ? Number(d[secondaryKey] || 0) : 0,
    orderCount: d.order_count,
  }));

  const maxVal = Math.max(
    ...parsedData.map((d) => Math.max(d.pVal, d.sVal)),
    100
  );

  // SVG dimensions
  const svgWidth = 700;
  const svgHeight = 240;
  const paddingX = 40;
  const paddingY = 25;
  const chartW = svgWidth - paddingX * 2;
  const chartH = svgHeight - paddingY * 2;

  const getX = (index: number) => {
    if (parsedData.length <= 1) return paddingX + chartW / 2;
    return paddingX + (index / (parsedData.length - 1)) * chartW;
  };

  const getY = (val: number) => {
    return paddingY + chartH - (val / maxVal) * chartH;
  };

  // Build SVG Path strings
  const primaryPoints = parsedData.map((d, i) => `${getX(i)},${getY(d.pVal)}`).join(' ');
  const secondaryPoints = parsedData.map((d, i) => `${getX(i)},${getY(d.sVal)}`).join(' ');

  const primaryArea = `M ${getX(0)},${paddingY + chartH} L ${primaryPoints} L ${getX(
    parsedData.length - 1
  )},${paddingY + chartH} Z`;

  const formatVal = (val: number) => {
    if (!isCurrency) return val.toLocaleString();
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(1)}k`;
    return `₹${val.toLocaleString()}`;
  };

  const activeItem = hoverIndex !== null ? parsedData[hoverIndex] : null;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
            {title}
          </CardTitle>
          {description && (
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {description}
            </CardDescription>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-primary-500 inline-block"></span>
            <span className="text-slate-700 dark:text-slate-300">{primaryLabel}</span>
          </div>
          {secondaryKey && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-slate-700 dark:text-slate-300">{secondaryLabel}</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-56 select-none"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${title} chart visualization`}
        >
          <defs>
            <linearGradient id={`${chartId}-grad-p`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = paddingY + chartH * (1 - ratio);
            const labelVal = maxVal * ratio;
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="3 3"
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono"
                >
                  {formatVal(labelVal)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={primaryArea} fill={`url(#${chartId}-grad-p)`} />

          {/* Primary Trend Line */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={primaryPoints}
          />

          {/* Secondary Trend Line if applicable */}
          {secondaryKey && (
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={secondaryPoints}
            />
          )}

          {/* Interactive Hover Vertical Line & Points */}
          {hoverIndex !== null && (
            <g>
              <line
                x1={getX(hoverIndex)}
                y1={paddingY}
                x2={getX(hoverIndex)}
                y2={paddingY + chartH}
                stroke="#64748b"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoverIndex)}
                cy={getY(parsedData[hoverIndex].pVal)}
                r="4.5"
                fill="#3b82f6"
                stroke="#ffffff"
                strokeWidth="2"
              />
              {secondaryKey && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(parsedData[hoverIndex].sVal)}
                  r="4"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
            </g>
          )}

          {/* Transparent Hover Hit Boxes */}
          {parsedData.map((_, i) => (
            <rect
              key={i}
              x={getX(i) - (chartW / parsedData.length) / 2}
              y={0}
              width={chartW / parsedData.length}
              height={svgHeight}
              fill="transparent"
              className="cursor-pointer"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
          ))}
        </svg>

        {/* Floating Tooltip */}
        {activeItem && hoverIndex !== null && (
          <div
            className="absolute top-2 pointer-events-none transform -translate-x-1/2 bg-slate-900/95 dark:bg-slate-950 text-white text-xs rounded-lg p-2.5 shadow-xl border border-slate-700/80 z-20 backdrop-blur-sm min-w-[140px]"
            style={{
              left: `${(getX(hoverIndex) / svgWidth) * 100}%`,
            }}
          >
            <p className="font-bold text-slate-300 font-mono text-[11px] mb-1">
              {activeItem.date}
            </p>
            <div className="space-y-0.5 font-medium">
              <div className="flex items-center justify-between gap-3 text-blue-400">
                <span>{primaryLabel}:</span>
                <span className="font-mono font-bold">
                  {isCurrency ? `₹${activeItem.pVal.toLocaleString()}` : activeItem.pVal}
                </span>
              </div>
              {secondaryKey && (
                <div className="flex items-center justify-between gap-3 text-emerald-400">
                  <span>{secondaryLabel}:</span>
                  <span className="font-mono font-bold">
                    {isCurrency ? `₹${activeItem.sVal.toLocaleString()}` : activeItem.sVal}
                  </span>
                </div>
              )}
              {activeItem.orderCount !== undefined && (
                <div className="flex items-center justify-between gap-3 text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                  <span>Orders:</span>
                  <span className="font-mono font-bold text-slate-200">
                    {activeItem.orderCount}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* X-Axis Date Indicators */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2 px-2">
        <span>{parsedData[0]?.date}</span>
        {parsedData.length > 2 && (
          <span>{parsedData[Math.floor(parsedData.length / 2)]?.date}</span>
        )}
        <span>{parsedData[parsedData.length - 1]?.date}</span>
      </div>
    </Card>
  );
};
