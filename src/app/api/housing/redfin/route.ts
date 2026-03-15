import { NextResponse } from "next/server";

// Example snapshot based on Redfin's U.S. housing market overview:
// https://www.redfin.com/us-housing-market
export async function GET() {
  return NextResponse.json({
    source: "Redfin",
    url: "https://www.redfin.com/us-housing-market",
    asOf: "2026-01-01",
    medianSalePrice: 423_029,
    medianSalePriceYoY: 1.1,
    homesSold: 281_925,
    homesSoldYoY: -7.6,
    homesForSale: 1_685_754,
    homesForSaleYoY: 1.5,
    mortgage30yRate: 6.1,
    mortgage30yRateYoYDelta: -0.86,
    topMetrosFastestGrowing: [
      { metro: "St. Petersburg, FL", salePriceYoY: 31.3 },
      { metro: "Augusta-Richmond County, GA", salePriceYoY: 24.5 },
      { metro: "Tallahassee, FL", salePriceYoY: 22.1 },
      { metro: "Chesapeake, VA", salePriceYoY: 16.4 },
      { metro: "Pompano Beach, FL", salePriceYoY: 15.1 },
      { metro: "Scottsdale, AZ", salePriceYoY: 15.0 },
      { metro: "Anchorage, AK", salePriceYoY: 13.3 },
      { metro: "Miami, FL", salePriceYoY: 11.5 },
      { metro: "Cincinnati, OH", salePriceYoY: 11.2 },
      { metro: "Hollywood, FL", salePriceYoY: 9.4 },
    ],
    migrationInbound: [
      { metro: "Sacramento, CA", netInflow: 9400 },
      { metro: "Phoenix, AZ", netInflow: 7100 },
      { metro: "Sarasota, FL", netInflow: 4300 },
      { metro: "Cape Coral, FL", netInflow: 4200 },
      { metro: "Nashville, TN", netInflow: 4100 },
      { metro: "Orlando, FL", netInflow: 3700 },
      { metro: "Myrtle Beach, SC", netInflow: 3500 },
      { metro: "Salisbury, MD", netInflow: 3000 },
      { metro: "Jacksonville, FL", netInflow: 3000 },
      { metro: "Hilo, HI", netInflow: 2600 },
    ],
    migrationOutbound: [
      { metro: "Los Angeles, CA", netOutflow: 31200 },
      { metro: "New York, NY", netOutflow: 24600 },
      { metro: "Seattle, WA", netOutflow: 18000 },
      { metro: "San Francisco, CA", netOutflow: 17100 },
      { metro: "Washington, DC", netOutflow: 17000 },
      { metro: "Chicago, IL", netOutflow: 11500 },
      { metro: "Philadelphia, PA", netOutflow: 3600 },
      { metro: "Hartford, CT", netOutflow: 3600 },
      { metro: "Atlanta, GA", netOutflow: 3500 },
      { metro: "Dallas, TX", netOutflow: 2600 },
    ],
  });
}

