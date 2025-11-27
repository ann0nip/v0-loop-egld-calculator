"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts"
import type { LoopResult } from "@/lib/calculations"

interface ApyChartProps {
  data: LoopResult[]
  maxSafeLoops: number
  maxSafeLtv: number
}

export function ApyChart({ data, maxSafeLoops }: ApyChartProps) {
  const chartData = data.map((d) => ({
    loops: d.loops,
    netApy: Number(d.netApy.toFixed(2)),
    effLtv: Number((d.effLtv * 100).toFixed(2)),
    depeg: Number(d.depegToLiq.toFixed(2)),
  }))

  const maxLoops = chartData.length

  return (
    <div className="h-[250px] sm:h-[300px] w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />

          {/* Risk zones */}
          <ReferenceArea x1={1} x2={maxSafeLoops} fill="rgb(16, 185, 129)" fillOpacity={0.1} />
          <ReferenceArea x1={maxSafeLoops} x2={maxLoops} fill="rgb(239, 68, 68)" fillOpacity={0.1} />

          <XAxis
            dataKey="loops"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
            label={{ value: "Loops", position: "insideBottom", offset: -5, fill: "hsl(var(--foreground))", fontSize: 11 }}
          />
          <YAxis
            tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
            label={{ value: "Net APY (%)", angle: -90, position: "insideLeft", fill: "hsl(var(--foreground))", fontSize: 11 }}
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
              if (name === "netApy") return [`${value.toFixed(2)}%`, "Net APY"]
              if (name === "effLtv") return [`${value.toFixed(2)}%`, "Eff LTV"]
              if (name === "depeg") return [`${value.toFixed(2)}%`, "Depeg to Liq"]
              return [value, name]
            }}
            labelFormatter={(label) => `Loop ${label}`}
            labelStyle={{ color: "hsl(var(--foreground))", fontSize: "12px" }}
          />

          <ReferenceLine
            x={maxSafeLoops}
            stroke="rgb(16, 185, 129)"
            strokeDasharray="5 5"
            label={{
              value: "Max Safe",
              fill: "rgb(16, 185, 129)",
              fontSize: 10,
              position: "top"
            }}
          />

          <Line
            type="monotone"
            dataKey="netApy"
            stroke="rgb(16, 185, 129)"
            strokeWidth={2}
            dot={{ fill: "rgb(16, 185, 129)", strokeWidth: 2, r: 3 }}
            activeDot={{ r: 5, fill: "rgb(16, 185, 129)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
