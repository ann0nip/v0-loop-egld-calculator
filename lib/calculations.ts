export interface LoopResult {
  loops: number
  netApy: number
  leverage: number
  effLtv: number
  annualEgld: number // Annual yield in EGLD equivalent
  annualUsd: number
  finalPosition: number // Final net position in EGLD equivalent after 1 year
}

export interface SimulationPoint {
  day: number
  netPosition: number // Net position in EGLD equivalent (collateral value - debt)
  collateral: number // Collateral value in EGLD equivalent
  debt: number // Debt in EGLD
}

export interface YearSimulationResult {
  points: SimulationPoint[]
  finalNetPosition: number
  effectiveNetApy: number
  totalSupplyEarned: number
  totalBorrowPaid: number
  leverage: number
  effLtv: number
}

export interface HighBorrowPeriod {
  startDay: number
  endDay: number
  borrowApy: number
}

/**
 * Converts APR to daily rate using compound interest formula
 * This matches the Python implementation: (1 + apr) ** (1/365) - 1
 */
function aprToDaily(apr: number): number {
  return Math.pow(1 + apr, 1 / 365) - 1
}

/**
 * Calculates theoretical leverage and position for a given LTV target
 * Uses the formula: leverage = 1 / (1 - ltv)
 * This matches the Python implementation exactly
 */
export function calculateTheoreticalPosition(
  initialAmount: number,
  ltvTarget: number,
): { supply: number; borrow: number; leverage: number } {
  const leverage = 1 / (1 - ltvTarget)
  const borrowMultiple = leverage - 1

  const supply = initialAmount * leverage
  const borrow = initialAmount * borrowMultiple

  return { supply, borrow, leverage }
}

/**
 * Simulates position evolution over N days with variable borrow APY periods
 * This matches the Python simulation_engine.py exactly
 *
 * @param initialAmount - Initial deposit in EGLD (the EGLD value you start with)
 * @param ltvTarget - Target LTV ratio (e.g., 0.925 for 92.5%)
 * @param supplyApr - xEGLD staking APR as decimal (e.g., 0.165 for 16.5%) - this captures xegldRatio growth
 * @param borrowAprNormal - EGLD borrow APR as decimal (e.g., 0.12 for 12%)
 * @param highBorrowPeriods - Array of high borrow periods for stress testing
 * @param days - Number of days to simulate
 */
export function simulateYear(
  initialAmount: number,
  ltvTarget: number,
  supplyApr: number,
  borrowAprNormal: number,
  highBorrowPeriods: HighBorrowPeriod[] = [],
  days: number = 365,
): YearSimulationResult {
  // Calculate theoretical leverage (matches Python exactly)
  const leverage = 1 / (1 - ltvTarget)
  const borrowMultiple = leverage - 1

  // Convert APR to daily rates (matches Python exactly)
  const supplyDaily = aprToDaily(supplyApr)
  const borrowDailyNormal = aprToDaily(borrowAprNormal)

  // Initialize supply and borrow (matches Python exactly)
  // Supply represents the EGLD-equivalent value of your xEGLD collateral
  // Borrow is the EGLD debt
  // The supplyApr already captures the xEGLD/EGLD ratio appreciation (staking rewards)
  let supply = initialAmount * leverage
  let borrow = initialAmount * borrowMultiple

  const points: SimulationPoint[] = []
  let totalSupplyEarned = 0
  let totalBorrowPaid = 0

  // Record initial state
  points.push({
    day: 0,
    netPosition: supply - borrow,
    collateral: supply,
    debt: borrow,
  })

  // Simulate each day (matches Python loop exactly)
  for (let day = 0; day < days; day++) {
    // Determine borrow rate for this day
    let dailyBorrowRate = borrowDailyNormal

    for (const period of highBorrowPeriods) {
      if (day >= period.startDay && day <= period.endDay) {
        dailyBorrowRate = aprToDaily(period.borrowApy)
        break
      }
    }

    // Track interest before applying
    const supplyBefore = supply
    const borrowBefore = borrow

    // Apply daily interest (matches Python exactly)
    supply *= (1 + supplyDaily)
    borrow *= (1 + dailyBorrowRate)

    totalSupplyEarned += supply - supplyBefore
    totalBorrowPaid += borrow - borrowBefore

    // Record state every 7 days or on last day
    if ((day + 1) % 7 === 0 || day === days - 1) {
      points.push({
        day: day + 1,
        netPosition: supply - borrow,
        collateral: supply,
        debt: borrow,
      })
    }
  }

  const finalNetPosition = supply - borrow
  const effectiveNetApy = (finalNetPosition / initialAmount - 1) * 100

  return {
    points,
    finalNetPosition,
    effectiveNetApy,
    totalSupplyEarned,
    totalBorrowPaid,
    leverage,
    effLtv: ltvTarget,
  }
}

/**
 * Creates high borrow periods distributed through the year
 * Matches Python logic: periods are placed at roughly even intervals
 * Python defaults: [(30,44), (120,134), (250,264)] for 3 periods of 15 days
 */
export function createDefaultHighBorrowPeriods(
  highBorrowApr: number,
  numPeriods: number = 3,
  daysPerPeriod: number = 15,
): HighBorrowPeriod[] {
  if (numPeriods === 0 || daysPerPeriod === 0) {
    return []
  }

  const periods: HighBorrowPeriod[] = []

  // Match Python's default spacing pattern
  // For 3 periods: starts at ~day 30, 120, 250
  if (numPeriods === 3) {
    const starts = [30, 120, 250]
    for (let i = 0; i < 3; i++) {
      periods.push({
        startDay: starts[i],
        endDay: starts[i] + daysPerPeriod - 1,
        borrowApy: highBorrowApr,
      })
    }
  } else {
    // For other configurations, distribute evenly
    const spacing = Math.floor(365 / (numPeriods + 1))
    for (let i = 0; i < numPeriods; i++) {
      const startDay = spacing * (i + 1) - Math.floor(daysPerPeriod / 2)
      periods.push({
        startDay: Math.max(0, startDay),
        endDay: Math.min(364, startDay + daysPerPeriod - 1),
        borrowApy: highBorrowApr,
      })
    }
  }

  return periods
}

/**
 * Calculates Net APY, leverage, and annual gains for display in the table
 * Uses theoretical leverage and proper compound interest
 */
export function calculateLoopingYield(
  initialAmount: number,
  ltvTarget: number,
  supplyApr: number, // as decimal
  borrowApr: number, // as decimal
  egldPrice: number = 35,
): LoopResult {
  const leverage = 1 / (1 - ltvTarget)
  const borrowMultiple = leverage - 1

  // Convert APR to daily rates
  const supplyDaily = aprToDaily(supplyApr)
  const borrowDaily = aprToDaily(borrowApr)

  // Initialize
  let supply = initialAmount * leverage
  let borrow = initialAmount * borrowMultiple

  // Compound for 365 days
  for (let day = 0; day < 365; day++) {
    supply *= (1 + supplyDaily)
    borrow *= (1 + borrowDaily)
  }

  const finalPosition = supply - borrow
  const netYield = finalPosition - initialAmount
  const netApy = (netYield / initialAmount) * 100

  return {
    loops: Math.round(Math.log(leverage) / Math.log(1 / (1 - ltvTarget)) * 10) / 10, // Approximate loops
    netApy,
    leverage,
    effLtv: ltvTarget,
    annualEgld: netYield,
    annualUsd: netYield * egldPrice,
    finalPosition,
  }
}

/**
 * Generates results for different LTV levels for the comparison table
 */
export function generateLtvComparison(
  initialAmount: number,
  supplyApr: number,
  borrowApr: number,
  egldPrice: number,
  ltvSteps: number[] = [0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.92, 0.925],
): LoopResult[] {
  return ltvSteps.map(ltv => calculateLoopingYield(initialAmount, ltv, supplyApr, borrowApr, egldPrice))
}
