"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import type { SimulationPoint } from "@/lib/calculations"

interface ApyChartProps {
  simulationPoints: SimulationPoint[]
  initialAmount: number
  highBorrowPeriods: number
  highBorrowDays: number
}

export function ApyChart({ simulationPoints, initialAmount, highBorrowPeriods, highBorrowDays }: ApyChartProps) {
  const chartData = simulationPoints.map((p) => ({
    day: p.day,
    netPosition: Number(p.netPosition.toFixed(2)),
    collateral: Number(p.collateral.toFixed(2)),
    debt: Number(p.debt.toFixed(2)),
  }))

  // Calculate min/max for Y axis
  const netPositions = chartData.map(d => d.netPosition)
  const minNet = Math.min(...netPositions)
  const maxNet = Math.max(...netPositions)
  const padding = (maxNet - minNet) * 0.1
  const yMin = Math.floor(minNet - padding)
  const yMax = Math.ceil(maxNet + padding)

  // Determine if position is growing overall
  const isGrowing = chartData.length > 1 && chartData[chartData.length - 1].netPosition > chartData[0].netPosition

  // Calculate high borrow period markers
  const totalHighDays = highBorrowPeriods * highBorrowDays
  const periodSpacing = highBorrowPeriods > 0 ? Math.floor(365 / highBorrowPeriods) : 0
  const highBorrowMarkers: { start: number; end: number }[] = []

  if (highBorrowPeriods > 0 && highBorrowDays > 0) {
    let currentDay = 0
    for (let i = 0; i < highBorrowPeriods; i++) {
      const startDay = currentDay + Math.floor(periodSpacing / 2) - Math.floor(highBorrowDays / 2)
      highBorrowMarkers.push({
        start: Math.max(0, startDay),
        end: Math.min(365, startDay + highBorrowDays),
      })
      currentDay += periodSpacing
    }
  }

  return (
    <div className="space-y-2">
      <div className="h-[250px] sm:h-[300px] w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="netPositionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={isGrowing ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={isGrowing ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

            {/* Initial amount reference line */}
            <ReferenceLine
              y={initialAmount}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
            />

            <XAxis
              dataKey="day"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              label={{ value: "Days", position: "insideBottom", offset: -5, fill: "hsl(var(--foreground))", fontSize: 11 }}
              tickFormatter={(value) => value === 0 ? "0" : value === 365 ? "365" : ""}
              ticks={[0, 91, 182, 273, 365]}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tickLine={{ stroke: "hsl(var(--border))" }}
              label={{ value: "Net Position (EGLD)", angle: -90, position: "insideLeft", fill: "hsl(var(--foreground))", fontSize: 10, dx: 10 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                color: "hsl(var(--foreground))",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => {
                if (name === "netPosition") return [`${value.toFixed(2)} EGLD`, "Net Position"]
                if (name === "collateral") return [`${value.toFixed(2)} EGLD`, "Collateral Value"]
                if (name === "debt") return [`${value.toFixed(2)} EGLD`, "Debt"]
                return [value, name]
              }}
              labelFormatter={(label) => `Day ${label}`}
              labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px" }}
            />

            <Area
              type="monotone"
              dataKey="netPosition"
              stroke={isGrowing ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
              strokeWidth={2}
              fill="url(#netPositionGradient)"
              dot={false}
              activeDot={{ r: 4, fill: isGrowing ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 text-[10px] sm:text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className={`w-3 h-0.5 ${isGrowing ? "bg-emerald-500" : "bg-red-500"}`} />
          <span>Net Position (EGLD)</span>
        </div>
      </div>
    </div>
  )
}
