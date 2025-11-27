export interface XoxnoMarketData {
  supplyApy: number
  borrowApy: number
  ltv: number
  liquidationThreshold: number
  price: number
  source: "live" | "fallback"
}

// Fallback values if SDK fails
export const FALLBACK_DATA: XoxnoMarketData = {
  supplyApy: 6.09,
  borrowApy: 4.53,
  ltv: 0.925,
  liquidationThreshold: 0.965,
  price: 8,
  source: "fallback",
}

export async function fetchXoxnoMarketData(): Promise<XoxnoMarketData> {
  try {
    const response = await fetch("/api/xoxno-market", {
      method: "GET",
      cache: "no-store",
    })

    if (!response.ok) {
      console.warn("[v0] Xoxno API returned non-OK status, using fallback")
      return FALLBACK_DATA
    }

    const data = await response.json()
    return data as XoxnoMarketData
  } catch (error) {
    console.warn("[v0] Failed to fetch Xoxno market data:", error)
    return FALLBACK_DATA
  }
}
