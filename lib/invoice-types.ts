// Types for invoice data structure
export interface CompanyDetails {
  name: string;
  address: string;
  city: string;
  gstin: string;
  stateName: string;
  stateCode: string;
  email: string;
  phone?: string;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsn: string;
  quantity: number;
  unit: string;
  rate: number;
  gstRate: number;
  taxType: "GST" | "IGST";
}

export interface InvoiceData {
  id?: string;
  invoiceNo: string;
  invoiceDate: string;
  deliveryNoteNo?: string;
  deliveryNoteDate?: string;
  referenceNo?: string;
  referenceDate?: string;
  buyerOrderNo?: string;
  dispatchDocNo?: string;
  dispatchedThrough?: string;
  paymentMode?: string;
  termsOfDelivery?: string;
  destination?: string;
  other_references?: string;

  // Company details
  company: CompanyDetails;
  consignee: CompanyDetails;
  buyer: CompanyDetails;

  // Line items
  lineItems: InvoiceLineItem[];

  // Bank details
  bankName?: string;
  accountHolder?: string;
  accountNo?: string;
  branchIFSCode?: string;

  // Additional info
  notes?: string;
}

export const defaultInvoiceData: InvoiceData = {
  invoiceNo: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  company: {
    name: "STUDIO 7",
    address: "Main Road, Kathara, Bokaro",
    city: "Bokaro",
    gstin: "20DVVPK2774Q1ZQ",
    stateName: "Jharkhand,",
    stateCode: "20",
    email: "photo.studio7@gmail.com",
    phone: "77620806044"
  },
  consignee: {
    name: "",
    address: "",
    city: "",
    gstin: "",
    stateName: "",
    stateCode: "",
    email: "",
  },
  buyer: {
    name: "",
    address: "",
    city: "",
    gstin: "",
    stateName: "",
    stateCode: "",
    email: "",
  },
  lineItems: [],
  bankName: "BANK OF INDIA (C/A)",
  accountHolder: "STUDIO 7",
  accountNo: "496320110001148",
  branchIFSCode: "BKID0004963",
};
