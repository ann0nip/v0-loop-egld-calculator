import { NextResponse } from "next/server"
import { FALLBACK_DATA } from "@/lib/xoxno-api"

export async function GET() {
  try {
    const { buildSdk, XOXNOClient } = await import("@xoxno/sdk-js")

    const sdk = buildSdk(new XOXNOClient())

    const [xegldProfile, egldProfile] = await Promise.all([
      sdk.lending.market
        .token("XEGLD-e413ed")
        .profile(), // xEGLD for supply APY, LTV, LT, price
      sdk.lending.market
        .token("eGLD-900f09")
        .profile(), // eGLD for borrow APY
    ])

    // Supply APY: xEGLD native staking yield, multiply by 100 for percentage
    const rawNativeApy = xegldProfile.extraApy?.nativeApy
    const supplyApy = typeof rawNativeApy === "number" ? rawNativeApy * 100 : FALLBACK_DATA.supplyApy

    const rawBorrowApy = egldProfile.borrowApy
    const borrowApy = typeof rawBorrowApy === "number" ? rawBorrowApy * 100 : FALLBACK_DATA.borrowApy

    // E-Mode values from xEGLD: stored as strings like "9250" meaning 92.50%
    const eModeProfile = xegldProfile.eModeCategoryProfiles?.[0]

    let ltv = FALLBACK_DATA.ltv
    let liquidationThreshold = FALLBACK_DATA.liquidationThreshold

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

    // Price from xEGLD
    const rawPrice = xegldProfile.indexes?.usdPriceShort
    const price = typeof rawPrice === "number" ? rawPrice : FALLBACK_DATA.price

    return NextResponse.json({
      supplyApy: Number(supplyApy.toFixed(2)),
      borrowApy: Number(borrowApy.toFixed(2)),
      ltv: Number(ltv.toFixed(2)),
      liquidationThreshold: Number(liquidationThreshold.toFixed(2)),
      price: Number(price.toFixed(2)),
      source: "live",
    })
  } catch (error) {
    console.error("[v0] Xoxno SDK error:", error)
    return NextResponse.json(FALLBACK_DATA)
  }
}
