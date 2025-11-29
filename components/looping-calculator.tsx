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
import { RefreshCw, Info, TrendingUp, Zap, ExternalLink, HelpCircle, Radio, TrendingDown, Sparkles, AlertTriangle } from "lucide-react"
import { LoopsTable } from "@/components/loops-table"
import { ApyChart } from "@/components/apy-chart"
import {
  simulateYear,
  createDefaultHighBorrowPeriods,
  generateLtvComparison,
  type YearSimulationResult,
} from "@/lib/calculations"
import { fetchXoxnoMarketData, FALLBACK_DATA, type XoxnoMarketData } from "@/lib/xoxno-api"
import { useIMask } from "react-imask"

export function LoopingCalculator() {
  const [initialAmount, setInitialAmount] = useState(100)
  const [supplyApy, setSupplyApy] = useState(FALLBACK_DATA.supplyApy)
  const [borrowApy, setBorrowApy] = useState(FALLBACK_DATA.borrowApy)
  const [ltvTarget, setLtvTarget] = useState(FALLBACK_DATA.ltv) // Default to SDK's optimal LTV
  const [egldPrice, setEgldPrice] = useState<number>(FALLBACK_DATA.price)
  const [sdkLoading, setSdkLoading] = useState(true)
  const [dataSource, setDataSource] = useState<"live" | "fallback">("fallback")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // High borrow period settings
  const [highBorrowApy, setHighBorrowApy] = useState(21)
  const [highBorrowPeriods, setHighBorrowPeriods] = useState(3)
  const [highBorrowDaysPerPeriod, setHighBorrowDaysPerPeriod] = useState(15)

  // IMask refs for numeric inputs
  const initialAmountMask = useIMask({
    mask: Number,
    scale: 2,
    thousandsSeparator: '',
    radix: '.',
    mapToRadix: ['.'],
    min: 0,
  }, {
    defaultValue: initialAmount.toString(),
    onAccept: (value) => {
      const numValue = parseFloat(value as string) || 0
      setInitialAmount(numValue)
    }
  })

  const egldPriceMask = useIMask({
    mask: Number,
    scale: 2,
    thousandsSeparator: '',
    radix: '.',
    mapToRadix: ['.'],
    min: 0,
  }, {
    defaultValue: egldPrice.toString(),
    onAccept: (value) => {
      const numValue = parseFloat(value as string) || 0
      setEgldPrice(numValue)
    }
  })

  const supplyApyMask = useIMask({
    mask: Number,
    scale: 2,
    thousandsSeparator: '',
    radix: '.',
    mapToRadix: ['.'],
    min: 0,
  }, {
    defaultValue: supplyApy.toString(),
    onAccept: (value) => {
      const numValue = parseFloat(value as string) || 0
      setSupplyApy(numValue)
    }
  })

  const borrowApyMask = useIMask({
    mask: Number,
    scale: 2,
    thousandsSeparator: '',
    radix: '.',
    mapToRadix: ['.'],
    min: 0,
  }, {
    defaultValue: borrowApy.toString(),
    onAccept: (value) => {
      const numValue = parseFloat(value as string) || 0
      setBorrowApy(numValue)
    }
  })

  const highBorrowApyMask = useIMask({
    mask: Number,
    scale: 2,
    thousandsSeparator: '',
    radix: '.',
    mapToRadix: ['.'],
    min: 0,
  }, {
    defaultValue: highBorrowApy.toString(),
    onAccept: (value) => {
      const numValue = parseFloat(value as string) || 0
      setHighBorrowApy(numValue)
    }
  })

  const highBorrowPeriodsMask = useIMask({
    mask: Number,
    scale: 0,
    thousandsSeparator: '',
    min: 0,
    max: 12,
  }, {
    defaultValue: highBorrowPeriods.toString(),
    onAccept: (value) => {
      const numValue = Number.parseInt(value as string, 10) || 0
      setHighBorrowPeriods(Math.min(12, Math.max(0, numValue)))
    }
  })

  const highBorrowDaysMask = useIMask({
    mask: Number,
    scale: 0,
    thousandsSeparator: '',
    min: 1,
    max: 60,
  }, {
    defaultValue: highBorrowDaysPerPeriod.toString(),
    onAccept: (value) => {
      const numValue = Number.parseInt(value as string, 10) || 1
      setHighBorrowDaysPerPeriod(Math.min(60, Math.max(1, numValue)))
    }
  })

  const fetchMarketData = async () => {
    setSdkLoading(true)
    try {
      const data: XoxnoMarketData = await fetchXoxnoMarketData()

      setSupplyApy(data.supplyApy)
      setBorrowApy(data.borrowApy)
      setLtvTarget(data.ltv) // Use SDK's max LTV as optimal default
      setEgldPrice(data.price)
      setDataSource(data.source)
      setLastUpdated(new Date())

      // Update IMask values
      supplyApyMask.setValue(data.supplyApy.toString())
      borrowApyMask.setValue(data.borrowApy.toString())
      egldPriceMask.setValue(data.price.toString())
    } catch {
      setDataSource("fallback")
    } finally {
      setSdkLoading(false)
    }
  }

  useEffect(() => {
    fetchMarketData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentPrice = egldPrice

  // Build high borrow periods array (matching Python format)
  const highBorrowPeriodsArray = useMemo(() => {
    return createDefaultHighBorrowPeriods(
      highBorrowApy / 100, // Convert to decimal
      highBorrowPeriods,
      highBorrowDaysPerPeriod,
    )
  }, [highBorrowPeriods, highBorrowDaysPerPeriod, highBorrowApy])

  // Calculate leverage from LTV
  const leverage = useMemo(() => {
    return 1 / (1 - ltvTarget)
  }, [ltvTarget])

  // Simulate the year with STRESS TEST (high borrow periods)
  const stressTestSimulation: YearSimulationResult = useMemo(() => {
    return simulateYear(
      initialAmount,
      ltvTarget,
      supplyApy / 100,
      borrowApy / 100,
      highBorrowPeriodsArray,
      365,
    )
  }, [initialAmount, ltvTarget, supplyApy, borrowApy, highBorrowPeriodsArray])

  // Simulate the year with OPTIMISTIC path (no high borrow, normal APY only)
  const optimisticSimulation: YearSimulationResult = useMemo(() => {
    return simulateYear(
      initialAmount,
      ltvTarget,
      supplyApy / 100,
      borrowApy / 100,
      [], // No high borrow periods
      365,
    )
  }, [initialAmount, ltvTarget, supplyApy, borrowApy])

  // Generate LTV comparison data for the table
  const ltvComparisonData = useMemo(() => {
    const ltvSteps = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.92, 0.925]
    return generateLtvComparison(
      initialAmount,
      supplyApy / 100,
      borrowApy / 100,
      currentPrice,
      ltvSteps,
    )
  }, [initialAmount, supplyApy, borrowApy, currentPrice])

  // Determine if positions are growing
  const isOptimisticGrowing = optimisticSimulation.effectiveNetApy > 0
  const isStressTestGrowing = stressTestSimulation.effectiveNetApy > 0
  const totalHighBorrowDays = highBorrowPeriods * highBorrowDaysPerPeriod

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
                  Initial Deposit (xEGLD)
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
                  ref={initialAmountMask.ref as any}
                  placeholder="0"
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
                  ref={egldPriceMask.ref as any}
                  placeholder="0"
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
                  ref={supplyApyMask.ref as any}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  Normal Borrow APY (%)
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs sm:text-sm">Normal cost to borrow EGLD on xLend</p>
                    </TooltipContent>
                  </Tooltip>
                  {dataSource === "live" && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs">
                      SDK
                    </Badge>
                  )}
                </Label>
                <Input
                  ref={borrowApyMask.ref as any}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    Target LTV (%)
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs sm:text-sm">
                          Loan-to-Value ratio. Higher LTV = more leverage.
                          <br />Default is the max allowed in e-Mode (optimal when supply APY {">"} borrow APY).
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    {dataSource === "live" && (
                      <Badge variant="secondary" className="text-[10px] px-1">
                        Optimal
                      </Badge>
                    )}
                  </span>
                  <span className="text-sm font-mono text-muted-foreground">{(ltvTarget * 100).toFixed(1)}% → {leverage.toFixed(2)}×</span>
                </Label>
                <Slider
                  value={[ltvTarget * 100]}
                  onValueChange={([v]) => setLtvTarget(v / 100)}
                  min={50}
                  max={97.5}
                  step={0.5}
                />
              </div>

              {/* High Borrow Period Settings */}
              <div className="pt-3 sm:pt-4 border-t border-border space-y-3 sm:space-y-4">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Stress Test Parameters
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Configure high borrow APY periods to test worst-case scenarios.
                </p>

                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1">
                    High Borrow APY (%)
                    <Tooltip>
                      <TooltipTrigger>
                        <HelpCircle className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs text-xs">APY during high borrow periods</p>
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    ref={highBorrowApyMask.ref as any}
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Number of Periods</Label>
                    <Input
                      ref={highBorrowPeriodsMask.ref as any}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Days per Period</Label>
                    <Input
                      ref={highBorrowDaysMask.ref as any}
                      placeholder="1"
                    />
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Total high borrow days: <span className="font-medium text-foreground">{totalHighBorrowDays}</span> / 365
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Key Insight Alert */}
            <Alert className="border-cyan-500/30 bg-cyan-500/5">
              <Info className="h-4 w-4 text-cyan-500" />
              <AlertTitle className="text-sm sm:text-base text-cyan-600">Key Insight</AlertTitle>
              <AlertDescription className="text-xs sm:text-sm text-muted-foreground">
                <strong className="text-foreground">HIGH LTV ≠ HIGH RISK</strong> as long as supply APY {">"} borrow APY.
                Slow liquidation only happens when borrow APY {">"} supply APY — and even then, it&apos;s a slow, predictable increase in LTV, not sudden liquidation.
              </AlertDescription>
            </Alert>

            {/* Two Simulation Results Side by Side */}
            <div className="grid md:grid-cols-2 gap-4">
              {/* Optimistic Path */}
              <Card className={`border-2 ${isOptimisticGrowing ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                    Optimistic Path
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">
                    Normal borrow APY ({borrowApy}%) all year
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <p className={`text-lg sm:text-xl font-bold ${isOptimisticGrowing ? "text-emerald-500" : "text-red-500"}`}>
                        {optimisticSimulation.finalNetPosition.toFixed(2)}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">Final (xEGLD)</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <p className={`text-lg sm:text-xl font-bold ${isOptimisticGrowing ? "text-emerald-500" : "text-red-500"}`}>
                        {optimisticSimulation.effectiveNetApy >= 0 ? "+" : ""}{optimisticSimulation.effectiveNetApy.toFixed(1)}%
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">Net APY</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                    <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-muted-foreground">Earned</p>
                      <p className="font-medium text-emerald-500">+{optimisticSimulation.totalSupplyEarned.toFixed(2)}</p>
                    </div>
                    <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20">
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium text-red-500">-{optimisticSimulation.totalBorrowPaid.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-center text-emerald-500 font-medium text-sm">
                    ${(optimisticSimulation.finalNetPosition * currentPrice).toFixed(0)} USD
                  </p>
                </CardContent>
              </Card>

              {/* Stress Test */}
              <Card className={`border-2 ${isStressTestGrowing ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                    Stress Test
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-xs">
                    {highBorrowPeriods}×{highBorrowDaysPerPeriod}d of {highBorrowApy}% borrow APY
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <p className={`text-lg sm:text-xl font-bold ${isStressTestGrowing ? "text-emerald-500" : "text-amber-500"}`}>
                        {stressTestSimulation.finalNetPosition.toFixed(2)}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">Final (xEGLD)</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-background/50">
                      <p className={`text-lg sm:text-xl font-bold ${isStressTestGrowing ? "text-emerald-500" : "text-amber-500"}`}>
                        {stressTestSimulation.effectiveNetApy >= 0 ? "+" : ""}{stressTestSimulation.effectiveNetApy.toFixed(1)}%
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">Net APY</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] sm:text-xs">
                    <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-muted-foreground">Earned</p>
                      <p className="font-medium text-emerald-500">+{stressTestSimulation.totalSupplyEarned.toFixed(2)}</p>
                    </div>
                    <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20">
                      <p className="text-muted-foreground">Cost</p>
                      <p className="font-medium text-red-500">-{stressTestSimulation.totalBorrowPaid.toFixed(2)}</p>
                    </div>
                  </div>
                  <p className={`text-center font-medium text-sm ${isStressTestGrowing ? "text-emerald-500" : "text-amber-500"}`}>
                    ${(stressTestSimulation.finalNetPosition * currentPrice).toFixed(0)} USD
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <Card className="bg-muted/30">
              <CardContent className="py-4">
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-center">
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Initial</p>
                    <p className="text-lg sm:text-xl font-bold">{initialAmount} xEGLD</p>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Leverage</p>
                    <p className="text-lg sm:text-xl font-bold">{leverage.toFixed(2)}×</p>
                  </div>
                  <div className="text-muted-foreground">→</div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Range</p>
                    <p className="text-lg sm:text-xl font-bold">
                      <span className={isStressTestGrowing ? "text-emerald-500" : "text-amber-500"}>
                        {stressTestSimulation.finalNetPosition.toFixed(0)}
                      </span>
                      {" - "}
                      <span className="text-emerald-500">
                        {optimisticSimulation.finalNetPosition.toFixed(0)}
                      </span>
                      {" xEGLD"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* LTV Comparison Table */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">LTV Comparison</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Compare yields across different LTV levels (optimistic path)</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <LoopsTable data={ltvComparisonData} currentLtv={ltvTarget} />
              </CardContent>
            </Card>

            {/* Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-lg sm:text-xl">Position Evolution (Stress Test)</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Net position over 1 year with {totalHighBorrowDays} days of high borrow APY</CardDescription>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <ApyChart
                  simulationPoints={stressTestSimulation.points}
                  initialAmount={initialAmount}
                  highBorrowPeriods={highBorrowPeriods}
                  highBorrowDays={highBorrowDaysPerPeriod}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Educational Section */}
        <div className="mt-6 sm:mt-8 grid md:grid-cols-3 gap-4 sm:gap-6">
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
                Why High LTV Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
              <p>
                At <strong className="text-foreground">92.5% LTV</strong>, looping creates ~13.3× leverage on your supplied xEGLD.
              </p>
              <p>
                Your supply grows much faster than your debt — even with a few &quot;bad&quot; periods of high borrow.
              </p>
              <p>
                The net curve continues upward as long as supply APY {">"} borrow APY on average.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                When to Worry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Slow liquidation</strong> only happens when borrow APY {">"} supply APY consistently.
              </p>
              <p>
                Even then, it&apos;s a slow, predictable increase in LTV — not a sudden liquidation.
              </p>
              <p>
                It&apos;s not rational to borrow at extremely high interest → demand drops → APYs normalize.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
              <p>1. Supply xEGLD as collateral</p>
              <p>2. Borrow EGLD up to LTV limit</p>
              <p>3. Swap borrowed EGLD to xEGLD</p>
              <p>4. Supply new xEGLD, repeat until target LTV</p>
              <p className="text-xs mt-2">Higher LTV = more leverage = amplified spread between supply and borrow APY.</p>
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
