export interface Contributor {
  id: string;
  name: string;
  monthly: number; // entered monthly amount; ignored for the LAST contributor (pays the remainder)
}

export interface CarInput {
  makeModel: string;
  year: number;
  trim: string;
  transmission: string;     // "" = unspecified; e.g. Automatic, Manual, DSG, CVT
  buyingPrice: number;      // before tax
  currentMileage: number;   // km
  yearlyMileage: number;    // km per year
  ownershipYears: number;
  interestRate: number;     // annual HELOC rate as a percent (e.g. 4.45); falls back to 4.45 if blank
  contributors: Contributor[]; // 2–3 people splitting the cost; last one pays the remainder
  aiNotes: string;          // freeform extra context for the AI resale lookup
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
  contributors: { name: string; monthly: number; total: number }[];
  overContribution: boolean; // entered shares sum to more than the total monthly cost
  months: number;
}

export interface EquityRow {
  label: string;
  resale: number;
  equity: number; // resale - baseline resale; positive = equity returned, negative = shortfall
  contributorEquity: number[]; // equity split, aligned to the baseline result's contributors
}

export interface SavedCar {
  id: string;
  label: string;
  input: CarInput;
  resaleValue: number;
  scenario: Scenario;
  result: HelocResult;
}
