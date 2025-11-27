"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { HelpCircle } from "lucide-react"
import type { LoopResult } from "@/lib/calculations"
import { cn } from "@/lib/utils"

interface LoopsTableProps {
  data: LoopResult[]
  maxSafeLoops: number
}

export function LoopsTable({ data, maxSafeLoops }: LoopsTableProps) {
  return (
    <div className="overflow-x-auto">
      <TooltipProvider>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Loops</TableHead>
              <TableHead>Leverage</TableHead>
              <TableHead>Net APY</TableHead>
              <TableHead>Eff LTV</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  Depeg to Liq
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        The percentage that xEGLD must depeg (drop in value relative to EGLD) before your position gets
                        liquidated (Health Factor {"<"} 1). Higher values are safer.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TableHead>
              <TableHead>Annual (EGLD)</TableHead>
              <TableHead>Annual (USD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => {
              const isRisky = row.depegToLiq < 15
              const isDangerous = row.depegToLiq < 10
              const isSafe = row.loops <= maxSafeLoops

              return (
                <TableRow
                  key={row.loops}
                  className={cn(
                    isDangerous && "bg-red-500/10",
                    !isDangerous && isRisky && "bg-amber-500/10",
                    isSafe && !isRisky && "bg-emerald-500/5",
                  )}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {row.loops}
                      {row.loops === maxSafeLoops && (
                        <Badge variant="outline" className="text-xs border-emerald-500 text-emerald-500">
                          Safe
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{row.leverage.toFixed(2)}x</TableCell>
                  <TableCell className={row.netApy >= 0 ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                    {row.netApy.toFixed(2)}%
                  </TableCell>
                  <TableCell className="font-mono">{row.effLtv.toFixed(2)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "font-medium",
                        isDangerous && "text-red-500",
                        !isDangerous && isRisky && "text-amber-500",
                        !isRisky && "text-emerald-500",
                      )}
                    >
                      {row.depegToLiq.toFixed(2)}%
                    </span>
                  </TableCell>
                  <TableCell className="font-mono">{row.annualEgld.toFixed(2)}</TableCell>
                  <TableCell className="text-emerald-500 font-medium">${row.annualUsd.toFixed(2)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  )
}
