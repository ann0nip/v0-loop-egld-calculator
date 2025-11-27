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
      return FALLBACK_DATA
    }

    const data = await response.json()
    return data as XoxnoMarketData
  } catch (error) {
    return FALLBACK_DATA
  }
}
