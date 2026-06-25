export interface Employee {
  uId: string;
  empId: string;
  name: string;
  email: string;
  phone: string;
  aadhaar: string;
  username: string;
  password?: string;
  gender: string;
  dob: string;
  bloodGroup?: string;
  address: string;
  salary: string;
  paidSalary: number;
  profileStatus: string;
  userType: string;
  createdAt: string;
  assignedCompany: Record<string, AssignedCompanyDetails>;
  salaryHistory: SalaryHistory; // ⬅️ use proper type here
  accessLevelMap: Record<string, boolean>; // ⬅️ instead of unknown
  salaryStatus: string;
  accessLevel: string;
  employmentType: string;
  salaryAmountHistory?: SalaryAmountEntry[];
}

export interface SalaryAmountEntry {
  salary: string;
  effectiveFrom: string; // YYYY-MM-DD
}

export interface AssignedCompanyDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  contactPersons: string;
  salary: number;
  status: string;
}

export interface SalaryRecord {
  paidSalary: number;
  status: string;
}

export interface SalaryHistoryEntry {
  status: string;
  paidSalary: number;
}

export type SalaryHistory = Record<string, SalaryHistoryEntry>;

export const months = [
  { name: "January", val: 1 },
  { name: "February", val: 2 },
  { name: "March", val: 3 },
  { name: "April", val: 4 },
  { name: "May", val: 5 },
  { name: "June", val: 6 },
  { name: "July", val: 7 },
  { name: "August", val: 8 },
  { name: "September", val: 9 },
  { name: "October", val: 10 },
  { name: "November", val: 11 },
  { name: "December", val: 12 },
];
