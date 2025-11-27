export interface LoopResult {
  loops: number
  netApy: number
  leverage: number
  effLtv: number
  depegToLiq: number
  liqBonus: number
  annualEgld: number
  annualUsd: number
}

export interface MaxSafeResult extends LoopResult {}

/**
 * Calculates Net APY, leverage, effective LTV, depeg to liquidation percentage, and annual gains for N loops.
 * Replicates the Python script logic exactly.
 */
export function calculateLoopingYield(
  initialAmount: number,
  numLoops: number,
  ltv: number,
  lt: number,
  supplyApy: number,
  borrowApy: number,
  minBorrow = 0.01,
  liqBonus = 0.15,
  egldPrice = 35,
): LoopResult {
  let collateral = initialAmount
  let debt = 0.0
  let actualLoops = 0

  for (let i = 0; i < numLoops; i++) {
    const availableBorrow = ltv * collateral - debt
    if (availableBorrow < minBorrow) {
      break
    }
    const borrowed = availableBorrow
    debt += borrowed
    collateral += borrowed // Assume swap to xEGLD and supply
    actualLoops++
  }

  // Monthly compounding for precise annual yields
  const months = 12
  const grossRateMonthly = supplyApy / 100 / months
  const borrowRateMonthly = borrowApy / 100 / months
  const grossComp = collateral * (Math.pow(1 + grossRateMonthly, months) - 1)
  const borrowComp = debt * (Math.pow(1 + borrowRateMonthly, months) - 1)
  const netYield = grossComp - borrowComp
  const netApy = (netYield / initialAmount) * 100
  const leverage = collateral / initialAmount
  const effLtv = collateral > 0 ? debt / collateral : 0
  const depegToLiq = Math.max(0, (1 - effLtv / lt) * 100)
  const annualEgld = initialAmount * (netApy / 100)
  const annualUsd = annualEgld * egldPrice

  return {
    loops: actualLoops,
    netApy,
    leverage,
    effLtv,
    depegToLiq,
    liqBonus,
    annualEgld,
    annualUsd,
  }
}

/**
 * Finds the maximum safe loops where effective LTV stays below max_safe_ltv.
 * Replicates the Python script logic exactly.
 */
export function findMaxSafeLoops(
  initialAmount: number,
  ltv: number,
  lt: number,
  supplyApy: number,
  borrowApy: number,
  maxSafeLtv: number,
  minBorrow = 0.01,
  liqBonus = 0.15,
  egldPrice = 35,
): MaxSafeResult {
  let collateral = initialAmount
  let debt = 0.0
  let loops = 0

  while (true) {
    const availableBorrow = ltv * collateral - debt
    if (availableBorrow < minBorrow) {
      break
    }
    const nextDebt = debt + availableBorrow
    const nextCollateral = collateral + availableBorrow
    const nextLtv = nextDebt / nextCollateral
    if (nextLtv > maxSafeLtv) {
      break
    }
    debt = nextDebt
    collateral = nextCollateral
    loops++
  }

  // Monthly compounding for yields
  const months = 12
  const grossRateMonthly = supplyApy / 100 / months
  const borrowRateMonthly = borrowApy / 100 / months
  const grossComp = collateral * (Math.pow(1 + grossRateMonthly, months) - 1)
  const borrowComp = debt * (Math.pow(1 + borrowRateMonthly, months) - 1)
  const netYield = grossComp - borrowComp
  const netApy = (netYield / initialAmount) * 100
  const leverage = collateral / initialAmount
  const effLtv = collateral > 0 ? debt / collateral : 0
  const depegToLiq = Math.max(0, (1 - effLtv / lt) * 100)
  const annualEgld = initialAmount * (netApy / 100)
  const annualUsd = annualEgld * egldPrice

  return {
    loops,
    netApy,
    leverage,
    effLtv,
    depegToLiq,
    liqBonus,
    annualEgld,
    annualUsd,
  }
}
