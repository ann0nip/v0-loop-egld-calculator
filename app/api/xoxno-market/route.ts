import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { buildSdk, XOXNOClient } = await import("@xoxno/sdk-js")

    const sdk = buildSdk(new XOXNOClient())

    // Get xEGLD profile for supply APY, LTV, LT, and price data
    const xegldProfile = await sdk.lending.market
      .token("XEGLD-e413ed")
      .profile()

    // Get EGLD profile for borrow APY
    const egldProfile = await sdk.lending.market.token("EGLD").profile()

    // Supply APY: xEGLD native staking yield, multiply by 100 for percentage
    const rawNativeApy = xegldProfile.extraApy?.nativeApy
    const supplyApy = typeof rawNativeApy === "number" ? rawNativeApy * 100 : 0

    // Borrow APY: EGLD borrow APY, multiply by 100 for percentage
    const rawBorrowApy = egldProfile.borrowApy
    const borrowApy = typeof rawBorrowApy === "number" ? rawBorrowApy * 100 : 0

    // E-Mode values from xEGLD: stored as strings like "9250" meaning 92.50%
    const eModeProfile = xegldProfile.eModeCategoryProfiles?.[0]

    let ltv = 0
    let liquidationThreshold = 0

    if (eModeProfile) {
      const rawLtv = Number.parseInt(eModeProfile.ltv, 10)
      const rawLt = Number.parseInt(eModeProfile.liquidationThreshold, 10)

      if (!isNaN(rawLtv)) {
        ltv = rawLtv / 10000 // "9250" -> 0.925
      }
      if (!isNaN(rawLt)) {
        liquidationThreshold = rawLt / 10000 // "9650" -> 0.965
      }
    }

    // Get EGLD price directly from EGLD profile
    const egldIndexes = egldProfile.indexes as any
    const rawEgldPrice = egldIndexes?.safePriceUsdShort
    const egldPrice = typeof rawEgldPrice === "number" ? rawEgldPrice : 0

    // Get xEGLD/EGLD exchange rate from xEGLD profile
    // safePriceEgldShort tells us how many EGLD equals 1 xEGLD
    // Example: safePriceEgldShort = 1.0589 means 1 xEGLD = 1.0589 EGLD
    const xegldIndexes = xegldProfile.indexes as any
    const rawXegldRatio = xegldIndexes?.safePriceEgldShort
    const xegldRatio = typeof rawXegldRatio === "number" ? rawXegldRatio : 0

    return NextResponse.json({
      supplyApy: Number(supplyApy.toFixed(2)),
      borrowApy: Number(borrowApy.toFixed(2)),
      ltv: Number(ltv.toFixed(4)),
      liquidationThreshold: Number(liquidationThreshold.toFixed(4)),
      egldPrice: Number(egldPrice.toFixed(2)),
      xegldRatio: Number(xegldRatio.toFixed(6)),
      source: "live",
    })
  } catch (error) {
    console.error("[v0] Xoxno SDK error:", error)
    return NextResponse.json({
      supplyApy: null,
      borrowApy: null,
      ltv: null,
      liquidationThreshold: null,
      egldPrice: null,
      xegldRatio: null,
      source: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 })
  }
}
