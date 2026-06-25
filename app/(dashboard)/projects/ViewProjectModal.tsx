"use client";

import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer } from "lucide-react";
import { Project } from "./types";

interface Deliverable {
  id: string;
  name: string;
  qty: string;
  description: string;
}

interface ViewProjectModalProps {
  project?: Project | null;
  status?: string;
  open: boolean;
  onOpenChange?: () => void;
  isAdmin?: boolean;
  headerImageUrl?: string;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    bankName: string;
    accountNo: string;
    ifsc: string;
    upi: string;
    gst?: string;
  };
}

// Utility functions
const checkEmpty = (fallback: string, value?: string) => {
  return value && value.trim() !== "" ? value : fallback;
};

const convertTo12Hour = (time: string) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

function ViewProjectModal({
  project,
  open,
  onOpenChange,
  isAdmin = false,
  headerImageUrl = "/Header.png",
  companyInfo = {
    name: "Studio 7",
    address: "D2, Urmila Ray Complex, Circular Rd, Lalpur, Ranchi, Jharkhand 834001",
    phone: "+91 76208 06044",
    email: "photos.studio7@gmail.com",
    bankName: "HDFC",
    accountNo: "50200102398651",
    ifsc: "HDFC0002834",
    upi: "7620806044@hdfc",
    gst: "20DVVPK2774Q1ZQ",
  },
}: ViewProjectModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!project) return null;

  const totalCredit =
    project.transactionHistory?.reduce(
      (sum, trx) => (trx.type === "credit" ? sum + trx.amount : sum),
      0
    ) ?? 0;

  const dueAmount = (project.finalAmount ?? 0) - totalCredit;
  const totalExtraExpenses = project.extraExpenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0
  );

  function formatDatePure(dateStr: string) {
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  }

  // Function to handle print
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups for printing");
      return;
    }

    const content = printContent.innerHTML;

    const styles = `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: A4;
          margin: 15mm 10mm;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.5;
          color: #1a1a1a;
          background: white;
          font-size: 11px;
        }
        
        .print-wrapper {
          width: 100%;
        }
        
        /* Header Styles - First page only */
        .quotation-header {
          text-align: center;
          border-bottom: 3px solid #2563eb;
          margin-bottom: 20px;
        }
        
        .header-image {
          width: 100%;
          object-fit: cover;
          margin-bottom: 10px;
        }
        
        .quotation-title {
          font-size: 24px;
          font-weight: 700;
          color: #1e40af;
          letter-spacing: 2px;
          margin-top: 10px;
        }
        
        .quotation-number {
          font-size: 11px;
          color: #64748b;
          margin-top: 5px;
        }
        
        /* Content Area */
        .quotation-content {
          padding: 0;
        }
        
        /* Client Info Section */
        .client-info-section {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 12px 15px;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          border-radius: 8px;
          border-left: 4px solid #2563eb;
        }
        
        .client-info-left, .client-info-right {
          flex: 1;
        }
        
        .info-label {
          font-size: 9px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        
        .info-value {
          font-size: 12px;
          font-weight: 500;
          color: #1e293b;
        }
        
        .info-row {
          margin-bottom: 8px;
        }
        
        /* Section Headers */
        .section-header {
          font-size: 13px;
          font-weight: 600;
          color: #1e40af;
          padding: 8px 12px;
          background: #eff6ff;
          border-radius: 5px;
          margin: 15px 0 10px;
          border-left: 3px solid #2563eb;
        }
        
        /* Tables */
        .styled-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 15px;
          font-size: 10px;
        }
        
        .styled-table th {
          background: #1e40af;
          color: white;
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .styled-table th:first-child {
          border-radius: 5px 0 0 0;
        }
        
        .styled-table th:last-child {
          border-radius: 0 5px 0 0;
        }
        
        .styled-table td {
          padding: 8px 10px;
          border-bottom: 1px solid #e2e8f0;
          color: #334155;
        }
        
        .styled-table tr:nth-child(even) {
          background: #f8fafc;
        }
        
        .styled-table tr:hover {
          background: #f1f5f9;
        }
        
        /* Summary Box */
        .summary-box {
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          color: white;
          padding: 15px 20px;
          border-radius: 10px;
          margin: 20px 0;
        }
        
        .summary-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
          text-align: center;
          border-bottom: 1px solid rgba(255,255,255,0.3);
          padding-bottom: 8px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        
        .summary-item {
          text-align: center;
        }
        
        .summary-label {
          font-size: 9px;
          opacity: 0.85;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .summary-value {
          font-size: 16px;
          font-weight: 700;
          margin-top: 3px;
        }
        
        .summary-value.highlight {
          color: #fbbf24;
        }
        
        /* Notes Section */
        .notes-section {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 12px 15px;
          margin: 15px 0;
        }
        
        .notes-title {
          font-size: 11px;
          font-weight: 600;
          color: #92400e;
          margin-bottom: 5px;
        }
        
        .notes-content {
          font-size: 10px;
          color: #78350f;
          white-space: pre-wrap;
        }
        
        /* Terms Section */
        .terms-section {
          margin: 15px 0;
          padding: 12px 15px;
          background: #f8fafc;
          border-radius: 8px;
          font-size: 9px;
          color: #64748b;
        }
        
        .terms-title {
          font-size: 10px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
        }
        
        .terms-list {
          list-style: none;
          padding: 0;
        }
        
        .terms-list li {
          padding-left: 15px;
          position: relative;
          margin-bottom: 4px;
        }
        
        .terms-list li:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #2563eb;
          font-weight: bold;
        }
        
        /* Footer Styles - End of document only */
        .quotation-footer {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: white;
          padding: 20px 25px;
          margin-top: 30px;
          border-radius: 10px;
          page-break-inside: avoid;
        }
        
        .footer-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
        }
        
        .footer-section {
          font-size: 10px;
        }
        
        .footer-title {
          font-size: 11px;
          font-weight: 600;
          color: #93c5fd;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .footer-text {
          color: #cbd5e1;
          line-height: 1.6;
        }
        
        .bank-details {
          background: rgba(255,255,255,0.1);
          padding: 10px;
          border-radius: 6px;
        }
        
        .bank-row {
          display: flex;
          margin-bottom: 4px;
        }
        
        .bank-label {
          font-weight: 600;
          width: 70px;
          color: #93c5fd;
        }
        
        .bank-value {
          color: white;
        }
        
        .upi-highlight {
          background: #fbbf24;
          color: #1e293b;
          padding: 4px 10px;
          border-radius: 4px;
          font-weight: 600;
          display: inline-block;
          margin-top: 6px;
        }
        
        .footer-bottom {
          text-align: center;
          margin-top: 15px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.2);
          font-size: 10px;
          color: #94a3b8;
        }
        
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin: 30px 0 20px;
          padding-top: 20px;
          page-break-inside: avoid;
        }
        
        .signature-box {
          text-align: center;
          width: 180px;
        }
        
        .signature-line {
          border-top: 1px solid #64748b;
          margin-bottom: 5px;
          padding-top: 30px;
        }
        
        .signature-label {
          font-size: 9px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        /* Print specific styles */
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .styled-table {
            page-break-inside: auto;
          }
          
          .styled-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .styled-table thead {
            display: table-header-group;
          }
          
          .section-header {
            page-break-after: avoid;
          }
          
          .summary-box {
            page-break-inside: avoid;
          }
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${project.projectName || "Project"} - Quotation</title>
          ${styles}
        </head>
        <body>
          <div class="print-wrapper">
            <!-- Header with Image - Only appears at top of first page -->
            <div class="quotation-header">
              <img src="${headerImageUrl}" alt="Company Header" class="header-image" onerror="this.style.display='none'" />
            </div>
            
            <!-- Main Content - Flows naturally across pages -->
            <div class="quotation-content">
              ${content}
              
              <!-- Signature Section -->
              <div class="signature-section">
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <div class="signature-label">Client Signature</div>
                </div>
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <div class="signature-label">For ${companyInfo.name}</div>
                </div>
              </div>
              
              <!-- Footer with Financial Information - Only at end of last page -->
              <div class="quotation-footer">
                <div class="footer-grid">
                  <div class="footer-section">
                    <div class="footer-title">Contact Us</div>
                    <div class="footer-text">
                      <strong>${companyInfo.name}</strong><br/>
                      ${companyInfo.address}<br/>
                      Phone: ${companyInfo.phone}<br/>
                      Email: ${companyInfo.email}<br/>
                    </div>
                  </div>
                  
                  <div class="footer-section">
                    <div class="footer-title">Bank Details</div>
                    <div class="bank-details">
                      <div class="bank-row">
                        <span class="bank-label">Bank:</span>
                        <span class="bank-value">${companyInfo.bankName}</span>
                      </div>
                      <div class="bank-row">
                        <span class="bank-label">Account:</span>
                        <span class="bank-value">${companyInfo.accountNo}</span>
                      </div>
                      <div class="bank-row">
                        <span class="bank-label">IFSC:</span>
                        <span class="bank-value">${companyInfo.ifsc}</span>
                      </div>
                      <div class="upi-highlight">UPI: ${companyInfo.upi}</div>
                    </div>
                  </div>
                  
                  <div class="footer-section">
                    <div class="footer-title">Payment Summary</div>
                    <div class="bank-details">
                      <div class="bank-row">
                        <span class="bank-label">Total:</span>
                        <span class="bank-value">₹${project.finalAmount.toLocaleString(
                          "en-IN"
                        )}</span>
                      </div>
                      <div class="bank-row">
                        <span class="bank-label">Paid:</span>
                        <span class="bank-value">₹${totalCredit.toLocaleString("en-IN")}</span>
                      </div>
                      <div class="bank-row" style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.3);">
                        <span class="bank-label" style="color: #fbbf24; font-size: 11px;">Due:</span>
                        <span class="bank-value" style="color: #fbbf24; font-size: 14px; font-weight: 700;">₹${dueAmount.toLocaleString(
                          "en-IN"
                        )}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="footer-bottom">
                  ${
                    companyInfo.gst ? `GSTIN: ${companyInfo.gst} | ` : ""
                  }This is a computer-generated quotation.
                </div>
              </div>
            </div>
          </div>

          <!-- Terms & Conditions -->
          <div class="terms-section" style="margin-top: 30px; font-size: 12px; line-height: 1.5; color: #1e293b;">
            <h3 style="font-size: 14px; font-weight: 700; margin-bottom: 8px; text-transform: uppercase;">
              Terms & Conditions
            </h3>

            <ul style="padding-left: 18px; margin: 0;">
              <li>A 50% deposit is required at the time of booking to secure your event date.</li>
              <li>30% of the total payment must be made on or before the wedding date.</li>
              <li>The remaining 20% balance is due upon completion and delivery of all final outputs (album, videos, etc.).</li>
              <li>Booking will only be confirmed once 50% advance payment is made. Calls or WhatsApp discussions do not confirm booking.</li>
              <li>Dates once booked, advances paid will not be refunded in full upon cancellation.</li>
              <li>Clients are allowed a maximum of two rounds of revisions to the wedding album and videos.</li>
              <li>Any additional changes beyond two rounds will be chargeable and communicated beforehand.</li>
              <li>Additional charges apply for extra sheets in the album.</li>
              <li>All wedding data (photos/videos) will be stored for a maximum of 6 months from the event date.</li>
              <li>Clients must complete album selection and related procedures within this period.</li>
              <li>After 6 months, all data will be permanently removed and cannot be retrieved.</li>
              <li>For outstation events, travel and accommodation are to be borne by the client.</li>
              <li>Vidaai on the next day will be chargeable after 8:00 AM.</li>
              <li>The above terms and conditions may be changed at the discretion of the service provider.</li>
            </ul>

            <p style="margin-top: 10px; font-size: 12px;">
              By engaging our services, you agree to these terms and conditions.  
              For doubts or clarifications, please contact us before proceeding.
            </p>
          </div>

          <!-- Signature Section -->
          <div class="signature-section">

          
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full min-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>Project Details</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-6">
          <div ref={printRef} className="space-y-6 py-4">
            {/* Print Content - Client Info */}
            <div
              className="client-info-section"
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "16px",
                background: "#f8fafc",
                borderRadius: "8px",
                borderLeft: "4px solid #2563eb",
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="info-row" style={{ marginBottom: "8px" }}>
                  <div
                    className="info-label"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      marginBottom: "2px",
                    }}
                  >
                    Client Name
                  </div>
                  <div
                    className="info-value"
                    style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}
                  >
                    {project.clientName}
                  </div>
                </div>
                <div className="info-row" style={{ marginBottom: "8px" }}>
                  <div
                    className="info-label"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      marginBottom: "2px",
                    }}
                  >
                    Project Name
                  </div>
                  <div
                    className="info-value"
                    style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}
                  >
                    {project.projectName}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="info-row" style={{ marginBottom: "8px" }}>
                  <div
                    className="info-label"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      marginBottom: "2px",
                    }}
                  >
                    Event Date
                  </div>
                  <div
                    className="info-value"
                    style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}
                  >
                    {formatDatePure(project.dates)}
                  </div>
                </div>
                <div className="info-row" style={{ marginBottom: "8px" }}>
                  <div
                    className="info-label"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      marginBottom: "2px",
                    }}
                  >
                    Venue
                  </div>
                  <div
                    className="info-value"
                    style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}
                  >
                    {project.venues}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div className="info-row" style={{ marginBottom: "8px" }}>
                  <div
                    className="info-label"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      marginBottom: "2px",
                    }}
                  >
                    Event Type
                  </div>
                  <div
                    className="info-value"
                    style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}
                  >
                    {project.eventName}
                  </div>
                </div>
                <div className="info-row" style={{ marginBottom: "8px" }}>
                  <div
                    className="info-label"
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      marginBottom: "2px",
                    }}
                  >
                    Package
                  </div>
                  <div
                    className="info-value"
                    style={{ fontSize: "14px", fontWeight: 500, color: "#1e293b" }}
                  >
                    {project.package === "" ? "Custom" : project.package}
                  </div>
                </div>
              </div>
            </div>

            {/* Shoots Table */}
            <div>
              <div
                className="section-header"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#1e40af",
                  padding: "10px 14px",
                  background: "#eff6ff",
                  borderRadius: "6px",
                  marginBottom: "12px",
                  borderLeft: "4px solid #2563eb",
                }}
              >
                Schedule & Crew Details
              </div>
              {project.shoots && project.shoots.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table className="styled-table">
                    <TableHeader>
                      <TableRow className="bg-blue-700 hover:bg-blue-500">
                        <TableHead className="text-white font-semibold">Venue</TableHead>
                        <TableHead className="text-white font-semibold">Event</TableHead>
                        <TableHead className="text-white font-semibold">Date</TableHead>
                        <TableHead className="text-white font-semibold">Time</TableHead>
                        <TableHead className="text-white font-semibold">Trad. Photo</TableHead>
                        <TableHead className="text-white font-semibold">Trad. Video</TableHead>
                        <TableHead className="text-white font-semibold">Candid</TableHead>
                        <TableHead className="text-white font-semibold">Cine</TableHead>
                        <TableHead className="text-white font-semibold">Assist.</TableHead>
                        <TableHead className="text-white font-semibold">Drone</TableHead>
                        <TableHead className="text-white font-semibold">Other</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {project.shoots.map((shoot, index) => (
                        <TableRow
                          key={`${shoot.id || "shoot"}-${index}`}
                          className="hover:bg-blue-50"
                        >
                          <TableCell>{checkEmpty(project.venues, shoot.venue)}</TableCell>
                          <TableCell className="font-medium">{shoot.ritual}</TableCell>
                          <TableCell>{new Date(shoot.date).toLocaleDateString("en-GB")}</TableCell>
                          <TableCell>{checkEmpty("-", convertTo12Hour(shoot.time))}</TableCell>
                          <TableCell className="text-center">
                            {shoot.traditionalPhotographer}
                          </TableCell>
                          <TableCell className="text-center">
                            {shoot.traditionalVideographer}
                          </TableCell>
                          <TableCell className="text-center">{shoot.candid}</TableCell>
                          <TableCell className="text-center">{shoot.cinemetographer}</TableCell>
                          <TableCell className="text-center">{shoot.assistant}</TableCell>
                          <TableCell className="text-center">{shoot.drone}</TableCell>
                          <TableCell>{shoot.other || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-gray-500 italic">No shoot data available</p>
              )}
            </div>

            {/* Deliverables Table */}
            <div>
              <div
                className="section-header"
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#1e40af",
                  padding: "10px 14px",
                  background: "#eff6ff",
                  borderRadius: "6px",
                  marginBottom: "12px",
                  borderLeft: "4px solid #2563eb",
                }}
              >
                Deliverables
              </div>
              {project.deliverables &&
              project.deliverables.length > 0 &&
              typeof project.deliverables[0] === "object" ? (
                <div className="overflow-x-auto">
                  <Table className="styled-table">
                    <TableHeader>
                      <TableRow className="bg-blue-700 hover:bg-blue-500">
                        <TableHead className="text-white font-semibold w-[50px]">#</TableHead>
                        <TableHead className="text-white font-semibold">Deliverable</TableHead>
                        <TableHead className="text-white font-semibold w-[100px]">
                          Quantity
                        </TableHead>
                        <TableHead className="text-white font-semibold">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(project.deliverables as Deliverable[]).map((deliverable, index) => (
                        <TableRow
                          key={`${deliverable.id || "deliverable"}-${index}`}
                          className="hover:bg-blue-50"
                        >
                          <TableCell className="font-medium text-gray-500">{index + 1}</TableCell>
                          <TableCell className="font-medium">{deliverable.name}</TableCell>
                          <TableCell className="text-center font-semibold">
                            {deliverable.qty}
                          </TableCell>
                          <TableCell className="text-gray-600">{deliverable.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  {Array.isArray(project.deliverables)
                    ? project.deliverables.join(", ")
                    : "No deliverables data"}
                </p>
              )}
            </div>

            {/* Pricing Summary */}
            {isAdmin && (
              <div
                className="summary-box"
                style={{
                  background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                  color: "white",
                  padding: "20px",
                  borderRadius: "12px",
                }}
              >
                <div
                  className="summary-title"
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    marginBottom: "16px",
                    textAlign: "center",
                    borderBottom: "1px solid rgba(255,255,255,0.3)",
                    paddingBottom: "10px",
                  }}
                >
                  Pricing Summary
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "16px",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "10px", opacity: 0.85, textTransform: "uppercase" }}>
                      Base Price
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "4px" }}>
                      ₹{project.price.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", opacity: 0.85, textTransform: "uppercase" }}>
                      Extra Expenses
                    </div>
                    <div style={{ fontSize: "18px", fontWeight: 700, marginTop: "4px" }}>
                      ₹{totalExtraExpenses.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", opacity: 0.85, textTransform: "uppercase" }}>
                      Discount
                    </div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        marginTop: "4px",
                        color: "#86efac",
                      }}
                    >
                      -₹{project.discount.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", opacity: 0.85, textTransform: "uppercase" }}>
                      Final Amount
                    </div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        marginTop: "4px",
                        color: "#fbbf24",
                      }}
                    >
                      ₹{project.finalAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "10px", opacity: 0.85, textTransform: "uppercase" }}>
                      Balance Due
                    </div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        marginTop: "4px",
                        color: dueAmount > 0 ? "#fca5a5" : "#86efac",
                      }}
                    >
                      ₹{dueAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Extra Expenses Breakup */}
            {isAdmin && project.extraExpenses.length > 0 && (
              <div>
                <div
                  className="section-header"
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1e40af",
                    padding: "10px 14px",
                    background: "#eff6ff",
                    borderRadius: "6px",
                    marginBottom: "12px",
                    borderLeft: "4px solid #2563eb",
                  }}
                >
                  Extra Expenses Breakup
                </div>
                <Table className="styled-table">
                  <TableHeader>
                    <TableRow className="bg-blue-700 hover:bg-blue-500">
                      <TableHead className="text-white font-semibold w-[50px]">#</TableHead>
                      <TableHead className="text-white font-semibold">Description</TableHead>
                      <TableHead className="text-white font-semibold w-[150px] text-right">
                        Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.extraExpenses.map((exp, i) => (
                      <TableRow key={i} className="hover:bg-blue-50">
                        <TableCell className="font-medium text-gray-500">{i + 1}</TableCell>
                        <TableCell>{exp.reason}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{Number(exp.amount).toLocaleString("en-IN")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Transaction History */}
            {project?.transactionHistory && project.transactionHistory.length > 0 && isAdmin && (
              <div>
                <div
                  className="section-header"
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "#1e40af",
                    padding: "10px 14px",
                    background: "#eff6ff",
                    borderRadius: "6px",
                    marginBottom: "12px",
                    borderLeft: "4px solid #2563eb",
                  }}
                >
                  Transaction History
                </div>
                <Table className="styled-table">
                  <TableHeader>
                    <TableRow className="bg-blue-700">
                      <TableHead className="text-white font-semibold">Date</TableHead>
                      <TableHead className="text-white font-semibold">Type</TableHead>
                      <TableHead className="text-white font-semibold">Amount</TableHead>
                      <TableHead className="text-white font-semibold">Purpose</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.transactionHistory.map((txn) => (
                      <TableRow key={txn.id} className="hover:bg-blue-50">
                        <TableCell>{txn.date}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              txn.type === "credit"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {txn.type.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`font-semibold ${
                            txn.type === "credit" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {txn.type === "credit" ? "+" : "-"}₹{txn.amount.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell>{txn.purpose || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Notes */}
            {project.note && project.note !== "" && (
              <div
                className="notes-section"
                style={{
                  background: "#fffbeb",
                  border: "1px solid #fcd34d",
                  borderRadius: "8px",
                  padding: "14px 18px",
                }}
              >
                <div
                  className="notes-title"
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#92400e",
                    marginBottom: "6px",
                  }}
                >
                  Additional Notes
                </div>
                <div
                  className="notes-content"
                  style={{ fontSize: "11px", color: "#78350f", whiteSpace: "pre-wrap" }}
                >
                  {project.note}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 px-6 py-4 border-t bg-white">
          {isAdmin && (
            <Button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" />
              Print Quotation
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ViewProjectModal;
