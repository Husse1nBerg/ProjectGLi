export interface CarInput {
  makeModel: string;
  year: number;
  trim: string;
  buyingPrice: number;      // before tax, CAD
  currentMileage: number;   // km
  yearlyMileage: number;    // km per year
  ownershipYears: number;
  husseinMonthly: number;   // CAD Hussein contributes per month
}

export type Scenario = "conservative" | "realistic" | "strong" | "curve";

export interface Source {
  url: string;
  title: string;
}

export interface ResaleEstimate {
  conservativeResale: number;
  realisticResale: number;
  strongResale: number;
  explanation: string;
  sources: Source[];
}

export interface HelocResult {
  tax: number;
  totalPurchaseCost: number;
  expectedMileageAtSale: number;
  resaleValue: number;
  depreciationLoss: number;
  monthlyDepreciation: number;
  monthlyInterest: number;
  totalMonthlyCost: number;
  yearlyCost: number;
  totalOwnershipCost: number;
  husseinMonthly: number;
  abedMonthly: number;
  husseinTotal: number;
  abedTotal: number;
  overContribution: boolean; // husseinMonthly > totalMonthlyCost
  months: number;
}

export interface EquityRow {
  label: string;
  resale: number;
  equity: number; // resale - baseline resale; positive = equity returned, negative = shortfall
  husseinEquity: number;
  abedEquity: number;
}

export interface SavedCar {
  id: string;
  label: string;
  input: CarInput;
  resaleValue: number;
  scenario: Scenario;
  result: HelocResult;
}
