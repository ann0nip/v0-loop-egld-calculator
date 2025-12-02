"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { LoopResult } from "@/lib/calculations"
import { cn } from "@/lib/utils"

interface LoopsTableProps {
  data: LoopResult[]
  currentLtv?: number
}

export function LoopsTable({ data, currentLtv }: LoopsTableProps) {
  return (
    <div className="w-full overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 sm:w-24 text-[10px] sm:text-sm px-2 sm:px-4">LTV</TableHead>
            <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4">Leverage</TableHead>
            <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4">Net APY</TableHead>
            <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4 hidden sm:table-cell">Final (EGLD eq.)</TableHead>
            <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4 hidden md:table-cell">Annual (EGLD eq.)</TableHead>
            <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4">Annual ($)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => {
            const isPositive = row.netApy >= 0
            const isCurrentLtv = currentLtv !== undefined && Math.abs(row.effLtv - currentLtv) < 0.001

            return (
              <TableRow
                key={row.effLtv}
                className={cn(
                  isPositive ? "bg-emerald-500/5 hover:bg-emerald-500/10" : "bg-red-500/5 hover:bg-red-500/10",
                  isCurrentLtv && "ring-2 ring-emerald-500 ring-inset"
                )}
              >
                <TableCell className="font-medium text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4">
                  <div className="flex items-center gap-1">
                    {(row.effLtv * 100).toFixed(1)}%
                    {isCurrentLtv && (
                      <Badge variant="outline" className="text-[8px] sm:text-xs border-emerald-500 text-emerald-500 px-1 hidden sm:inline-flex">
                        Selected
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4 font-mono">
                  {row.leverage.toFixed(2)}×
                </TableCell>
                <TableCell className={cn(
                  "font-medium text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4",
                  isPositive ? "text-emerald-500" : "text-red-500"
                )}>
                  {row.netApy >= 0 ? "+" : ""}{row.netApy.toFixed(1)}%
                </TableCell>
                <TableCell className="font-mono text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4 hidden sm:table-cell">
                  {row.finalPosition.toFixed(2)}
                </TableCell>
                <TableCell className="font-mono text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4 hidden md:table-cell">
                  {row.annualEgld >= 0 ? "+" : ""}{row.annualEgld.toFixed(2)}
                </TableCell>
                <TableCell className={cn(
                  "font-medium text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4 whitespace-nowrap",
                  isPositive ? "text-emerald-500" : "text-red-500"
                )}>
                  {row.annualUsd >= 0 ? "+" : "-"}${Math.abs(row.annualUsd).toFixed(0)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
