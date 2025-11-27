"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RefreshCw, AlertTriangle, Info, TrendingUp, Shield, Zap, ExternalLink, HelpCircle, Radio } from "lucide-react"
import { LoopsTable } from "@/components/loops-table"
import { ApyChart } from "@/components/apy-chart"
import { calculateLoopingYield, findMaxSafeLoops, type LoopResult } from "@/lib/calculations"
import { fetchXoxnoMarketData, FALLBACK_DATA, type XoxnoMarketData } from "@/lib/xoxno-api"

export function LoopingCalculator() {
  const [initialAmount, setInitialAmount] = useState(1000)
  const [supplyApy, setSupplyApy] = useState(FALLBACK_DATA.supplyApy)
  const [borrowApy, setBorrowApy] = useState(FALLBACK_DATA.borrowApy)
  const [ltv, setLtv] = useState(FALLBACK_DATA.ltv)
  const [lt, setLt] = useState(FALLBACK_DATA.liquidationThreshold)
  const [egldPrice, setEgldPrice] = useState<number>(FALLBACK_DATA.price)
  const [maxSafeLtv, setMaxSafeLtv] = useState(0.92)
  const [liqBonus, setLiqBonus] = useState(0.15)
  const [numLoops, setNumLoops] = useState(5)
  const [sdkLoading, setSdkLoading] = useState(true)
  const [dataSource, setDataSource] = useState<"live" | "fallback">("fallback")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchMarketData = async () => {
    setSdkLoading(true)
    try {
      const data: XoxnoMarketData = await fetchXoxnoMarketData()

      setSupplyApy(data.supplyApy)
      setBorrowApy(data.borrowApy)
      setLtv(data.ltv)
      setLt(data.liquidationThreshold)
      setEgldPrice(data.price)
      setDataSource(data.source)
      setLastUpdated(new Date())
    } catch (error) {
      console.error("[v0] Failed to fetch market data:", error)
      setDataSource("fallback")
    } finally {
      setSdkLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketData()
  }, [])

  const currentPrice = egldPrice

  const loopsData = useMemo(() => {
    const results: LoopResult[] = []
    for (let n = 1; n <= numLoops; n++) {
      results.push(calculateLoopingYield(initialAmount, n, ltv, lt, supplyApy, borrowApy, 0.01, liqBonus, currentPrice))
    }
    return results
  }, [initialAmount, numLoops, ltv, lt, supplyApy, borrowApy, liqBonus, currentPrice])

  const maxSafe = useMemo(() => {
    return findMaxSafeLoops(initialAmount, ltv, lt, supplyApy, borrowApy, maxSafeLtv, 0.01, liqBonus, currentPrice)
  }, [initialAmount, ltv, lt, supplyApy, borrowApy, maxSafeLtv, liqBonus, currentPrice])

  const chartData = useMemo(() => {
    const data: LoopResult[] = []
    for (let n = 1; n <= Math.max(maxSafe.loops + 2, numLoops); n++) {
      data.push(calculateLoopingYield(initialAmount, n, ltv, lt, supplyApy, borrowApy, 0.01, liqBonus, currentPrice))
    }
    return data
  }, [initialAmount, ltv, lt, supplyApy, borrowApy, maxSafe.loops, numLoops, liqBonus, currentPrice])

  const hasWarning = loopsData.some((d) => d.netApy < 0) || loopsData.some((d) => d.depegToLiq < 10)

  return (
    <TooltipProvider>
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 overflow-x-hidden">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 w-full">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground text-center wrap-break-word px-2">xLend Looping Yield Calculator</h1>
          </div>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg px-2">MultiversX DeFi Tool for xEGLD Multiply Strategies</p>
        </div>

        <Card className="mb-4 sm:mb-6 bg-linear-to-br from-emerald-500/10 via-emerald-500/5 to-cyan-500/10 border-emerald-500/20">
          <CardContent className="py-4 sm:py-5 px-4 sm:px-6">
            {/* Mobile Layout */}
            <div className="sm:hidden space-y-4">
              {/* Price Section */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="font-bold text-emerald-500 text-lg">X</span>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">xEGLD Price</p>
                    <p className="text-2xl font-bold text-foreground">${currentPrice.toFixed(2)}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 ${
                    dataSource === "live"
                      ? "text-emerald-500 border-emerald-500/50 bg-emerald-500/5"
                      : "text-amber-500 border-amber-500/50 bg-amber-500/5"
                  }`}
                >
                  <Radio className={`w-2.5 h-2.5 mr-1 ${dataSource === "live" ? "text-emerald-500" : "text-amber-500"}`} />
                  <span className="text-[10px]">{dataSource === "live" ? "Live" : "Fallback"}</span>
                </Badge>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMarketData}
                disabled={sdkLoading}
                className="w-full gap-2 bg-background/50 hover:bg-background"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${sdkLoading ? "animate-spin" : ""}`} />
                <span className="text-xs">Refresh from Xoxno SDK</span>
              </Button>

              {/* Last Updated */}
              {lastUpdated && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex sm:flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <span className="font-bold text-emerald-500">X</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Live xEGLD Price (from Xoxno SDK)</p>
                  <p className="text-2xl font-bold text-foreground">${currentPrice.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      dataSource === "live"
                        ? "text-emerald-500 border-emerald-500/50"
                        : "text-amber-500 border-amber-500/50"
                    }
                  >
                    <Radio
                      className={`w-3 h-3 mr-1 ${dataSource === "live" ? "text-emerald-500" : "text-amber-500"}`}
                    />
                    {dataSource === "live" ? "Live Data" : "Fallback Data"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchMarketData}
                    disabled={sdkLoading}
                    className="gap-2 bg-transparent"
                  >
                    <RefreshCw className={`w-4 h-4 ${sdkLoading ? "animate-spin" : ""}`} />
                    Refresh from SDK
                  </Button>
                </div>
                {lastUpdated && (
                  <p className="text-xs text-muted-foreground">Last updated: {lastUpdated.toLocaleTimeString()}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Input Panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Configuration
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Adjust parameters to simulate your strategy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  Initial Amount (xEGLD)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs sm:text-sm">Your starting xEGLD collateral amount</p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(Number(e.target.value) || 0)}
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  xEGLD Price ($)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs sm:text-sm">Current xEGLD price from Xoxno SDK (editable)</p>
                    </TooltipContent>
                  </Tooltip>
                  {dataSource === "live" && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      SDK
                    </Badge>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={egldPrice}
                  onChange={(e) => setEgldPrice(Number(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  Supply APY (%)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs sm:text-sm">Current yield for supplying xEGLD on xLend</p>
                    </TooltipContent>
                  </Tooltip>
                  {dataSource === "live" && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      SDK
                    </Badge>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={supplyApy}
                  onChange={(e) => setSupplyApy(Number(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  Borrow APY (%)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs sm:text-sm">Current cost to borrow EGLD on xLend</p>
                    </TooltipContent>
                  </Tooltip>
                  {dataSource === "live" && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      SDK
                    </Badge>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={borrowApy}
                  onChange={(e) => setBorrowApy(Number(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    Loops to Show
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs sm:text-sm">Number of loop iterations to display in the table</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">{numLoops}</span>
                </Label>
                <Slider value={[numLoops]} onValueChange={([v]) => setNumLoops(v)} min={1} max={10} step={1} />
              </div>

              <div className="pt-3 sm:pt-4 border-t border-border space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Advanced Settings</p>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      LTV (e-Mode)
                      {dataSource === "live" && (
                        <Badge variant="secondary" className="text-[10px] px-1">
                          SDK
                        </Badge>
                      )}
                    </Label>
                    <Input
                      type="number"
                      step="0.001"
                      value={ltv}
                      onChange={(e) => setLtv(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      Liq. Threshold
                      {dataSource === "live" && (
                        <Badge variant="secondary" className="text-[10px] px-1">
                          SDK
                        </Badge>
                      )}
                    </Label>
                    <Input type="number" step="0.001" value={lt} onChange={(e) => setLt(Number(e.target.value) || 0)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Max Safe LTV</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={maxSafeLtv}
                      onChange={(e) => setMaxSafeLtv(Number(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Liq. Bonus</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={liqBonus}
                      onChange={(e) => setLiqBonus(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Warnings */}
            {hasWarning && (
              <Alert variant="destructive" className="border-amber-500/50 bg-amber-500/10 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-sm sm:text-base">Risk Warning</AlertTitle>
                <AlertDescription className="text-xs sm:text-sm">
                  {loopsData.some((d) => d.netApy < 0) && "Some configurations result in negative APY. "}
                  {loopsData.some((d) => d.depegToLiq < 10) &&
                    "Low depeg buffer detected (<10%). Consider fewer loops for safety."}
                </AlertDescription>
              </Alert>
            )}

            {/* Max Safe Loops Card */}
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                  Max Safe Loops: {maxSafe.loops}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Effective LTV stays below {(maxSafeLtv * 100).toFixed(0)}% threshold (assuming no depeg)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/50 min-w-0">
                    <p className="text-base sm:text-lg md:text-2xl font-bold text-foreground truncate">{maxSafe.leverage.toFixed(2)}x</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Leverage</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/50 min-w-0">
                    <p className={`text-base sm:text-lg md:text-2xl font-bold truncate ${maxSafe.netApy >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                      {maxSafe.netApy.toFixed(2)}%
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Net APY</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/50 min-w-0">
                    <p className="text-base sm:text-lg md:text-2xl font-bold text-foreground truncate">{maxSafe.annualEgld.toFixed(2)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Annual (EGLD)</p>
                  </div>
                  <div className="text-center p-2 sm:p-3 rounded-lg bg-background/50 min-w-0">
                    <p className="text-base sm:text-lg md:text-2xl font-bold text-emerald-500 truncate">${maxSafe.annualUsd.toFixed(0)}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Annual (USD)</p>
                  </div>
                </div>
                <p className="mt-3 sm:mt-4 text-[10px] sm:text-xs text-muted-foreground flex items-start gap-2">
                  <Info className="w-3 h-3 sm:w-4 sm:h-4 shrink-0 mt-0.5" />
                  <span>Assumes perfect peg between xEGLD and EGLD. &quot;Depeg to Liq&quot; shows the % price drop needed to
                  trigger liquidation (HF{"<"}1).</span>
                </p>
              </CardContent>
            </Card>

            {/* Loops Table */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Loop Comparison</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Compare yields and risks across different loop counts</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <LoopsTable data={loopsData} maxSafeLoops={maxSafe.loops} />
              </CardContent>
            </Card>

            {/* Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">APY Projection</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Projected net APY across different loop counts</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <ApyChart data={chartData} maxSafeLoops={maxSafe.loops} maxSafeLtv={maxSafeLtv} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Educational Section */}
        <div className="mt-6 sm:mt-8 grid md:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                Risks to Consider
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Depeg Risk:</strong> If xEGLD loses peg to EGLD, your collateral
                value drops, risking liquidation.
              </p>
              <p>
                <strong className="text-foreground">Rate Changes:</strong> Borrow APY can spike during high demand,
                reducing or eliminating profits.
              </p>
              <p>
                <strong className="text-foreground">Slippage:</strong> Large swaps may incur slippage, affecting actual
                yields.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
              <p>1. Supply xEGLD as collateral</p>
              <p>2. Borrow EGLD up to LTV limit</p>
              <p>3. Swap borrowed EGLD to xEGLD</p>
              <p>4. Supply new xEGLD, repeat N times</p>
              <p className="text-xs mt-2">Each loop increases leverage and yield, but also risk.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                Safety Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
              <p>
                • Start with <strong className="text-foreground">1-2 loops</strong> for {"<"}20% risk
              </p>
              <p>• Monitor your Health Factor daily</p>
              <p>• Keep buffer for rate spikes</p>
              <p>• Understand liquidation mechanics</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center px-4">
          <a
            href="https://xoxno.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm sm:text-base text-emerald-500 hover:text-emerald-400 transition-colors"
          >
            Open xLend on Xoxno <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4" />
          </a>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 max-w-2xl mx-auto">
            This calculator is for educational purposes only and is not affiliated with Xoxno. Always DYOR and
            understand the risks before investing.
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}
