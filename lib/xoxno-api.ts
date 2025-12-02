export interface XoxnoMarketData {
  supplyApy: number
  borrowApy: number
  ltv: number
  liquidationThreshold: number
  egldPrice: number // EGLD price in USD
  xegldRatio: number // How many EGLD you get per 1 xEGLD (e.g., 1.06 means 1 xEGLD = 1.06 EGLD)
  source: "live" | "fallback"
}

export async function fetchXoxnoMarketData(): Promise<XoxnoMarketData> {
  try {
    const response = await fetch("/api/xoxno-market", {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      throw new Error("Failed to fetch market data")
    }

    const data = await response.json()
    return data as XoxnoMarketData
  } catch (error) {
    console.error("Error fetching Xoxno market data:", error)
    // Return zeros if fetch fails
    return {
      supplyApy: 0,
      borrowApy: 0,
      ltv: 0,
      liquidationThreshold: 0,
      egldPrice: 0,
      xegldRatio: 0,
      source: "fallback",
    }
  }
}
