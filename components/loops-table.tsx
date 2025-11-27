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
    <div className="w-full overflow-x-auto">
      <TooltipProvider>
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 sm:w-20 text-[10px] sm:text-sm px-2 sm:px-4">Loops</TableHead>
              <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4">Lev.</TableHead>
              <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4">APY</TableHead>
              <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4 hidden sm:table-cell">Eff LTV</TableHead>
              <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4">
                <span className="flex items-center gap-1">
                  <span className="hidden sm:inline">Depeg to Liq</span>
                  <span className="sm:hidden">Depeg</span>
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <p>
                        The percentage that xEGLD must depeg (drop in value relative to EGLD) before your position gets
                        liquidated (Health Factor {"<"} 1). Higher values are safer.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </span>
              </TableHead>
              <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4 hidden md:table-cell">Annual (EGLD)</TableHead>
              <TableHead className="text-[10px] sm:text-sm px-2 sm:px-4">Annual ($)</TableHead>
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
                  <TableCell className="font-medium text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4">
                    <div className="flex items-center gap-1">
                      {row.loops}
                      {row.loops === maxSafeLoops && (
                        <Badge variant="outline" className="text-[8px] sm:text-xs border-emerald-500 text-emerald-500 px-1 hidden sm:inline-flex">
                          Safe
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4">{row.leverage.toFixed(1)}x</TableCell>
                  <TableCell className={cn("font-medium text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4", row.netApy >= 0 ? "text-emerald-500" : "text-red-500")}>
                    {row.netApy.toFixed(1)}%
                  </TableCell>
                  <TableCell className="font-mono text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4 hidden sm:table-cell">{row.effLtv.toFixed(2)}</TableCell>
                  <TableCell className="py-2 sm:py-4 px-2 sm:px-4">
                    <span
                      className={cn(
                        "font-medium text-[10px] sm:text-sm",
                        isDangerous && "text-red-500",
                        !isDangerous && isRisky && "text-amber-500",
                        !isRisky && "text-emerald-500",
                      )}
                    >
                      {row.depegToLiq.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4 hidden md:table-cell">{row.annualEgld.toFixed(2)}</TableCell>
                  <TableCell className="text-emerald-500 font-medium text-[10px] sm:text-sm py-2 sm:py-4 px-2 sm:px-4 whitespace-nowrap">${row.annualUsd.toFixed(0)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TooltipProvider>
    </div>
  )
}
