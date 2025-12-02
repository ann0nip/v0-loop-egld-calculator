export interface XoxnoMarketData {
  supplyApy: number
  borrowApy: number
  ltv: number
  liquidationThreshold: number
  egldPrice: number // EGLD price in USD
  xegldRatio: number // How many EGLD you get per 1 xEGLD (e.g., 1.06 means 1 xEGLD = 1.06 EGLD)
  source: "live" | "error"
}

export class XoxnoApiError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "XoxnoApiError"
  }
}

export async function fetchXoxnoMarketData(): Promise<XoxnoMarketData> {
  const response = await fetch("/api/xoxno-market", {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new XoxnoApiError("Failed to fetch market data from server")
  }

  const data = await response.json()

  // If the API returned error source, throw so caller can handle it
  if (data.source === "error") {
    throw new XoxnoApiError("Xoxno SDK returned an error")
  }

  return data as XoxnoMarketData
}
