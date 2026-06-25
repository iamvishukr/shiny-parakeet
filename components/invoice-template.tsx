"use client";

import type { InvoiceData } from "@/lib/invoice-types";
import {
  calculateLineItemTotal,
  calculateSubtotal,
  calculateTotalCGST,
  calculateTotalSGST,
  calculateTotalIGST,
  calculateTotalTax,
  groupItemsByHSNAndGST,
  numberToWords,
  formatCurrency,
  formatDate,
} from "@/lib/invoice-utils";

interface InvoiceTemplateProps {
  data: InvoiceData;
}

export function InvoiceTemplate({ data }: InvoiceTemplateProps) {
  const subtotal = calculateSubtotal(data.lineItems);
  const cgst = calculateTotalCGST(data.lineItems);
  const sgst = calculateTotalSGST(data.lineItems);
  const igst = calculateTotalIGST(data.lineItems);
  const taxTotal = calculateTotalTax(data.lineItems);
  const total = subtotal + taxTotal;

  const taxBreakdown = groupItemsByHSNAndGST(data.lineItems);

  const hasGST = data.lineItems.some((item) => item.taxType === "GST");
  const hasIGST = data.lineItems.some((item) => item.taxType === "IGST");

  const totalQuantity = data.lineItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalUnit = data.lineItems[0]?.unit || "PCS";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "800px",
        margin: "0 auto",
        backgroundColor: "#ffffff",
        color: "#000000",
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        border: "2px solid #000000",
      }}
    >
      {/* Main Header Row */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            {/* Left: Company Details */}
            <td
              style={{
                width: "60%",
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
                padding: "8px",
                verticalAlign: "top",
              }}
              rowSpan={2}
            >
              <div style={{ fontWeight: "bold", fontSize: "16px", marginBottom: "4px" }}>
                Tax Invoice
              </div>
              <div style={{ fontWeight: "bold", marginTop: "8px" }}>{data.company.name}</div>
              <div>{data.company.address}</div>
              <div>{data.company.city}</div>
              <div>GSTIN/UIN: {data.company.gstin}</div>
              <div>
                State Name : {data.company.stateName}, Code : {data.company.stateCode}
              </div>
              <div>E-Mail : {data.company.email}</div>
              {data.company.phone && <div>Phone : {data.company.phone}</div>}
            </td>
            {/* Right Top: Invoice No & Date */}
            <td style={{ borderBottom: "1px solid #000", padding: "0", height: "80px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody style={{ height: "80px" }}>
                  <tr>
                    <td style={{ width: "50%", borderRight: "1px solid #000", padding: "4px 8px" }}>
                      <div>Invoice No.</div>
                      <div style={{ fontWeight: "bold" }}>{data.invoiceNo}</div>
                    </td>
                    <td style={{ padding: "4px 8px" }}>
                      <div>Dated</div>
                      <div style={{ fontWeight: "bold" }}>{formatDate(data.invoiceDate)}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            {/* Right Bottom: Delivery Note & Mode of Payment */}
            <td style={{ borderBottom: "1px solid #000", padding: "0", height: "80px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody style={{ height: "80px" }}>
                  <tr>
                    <td style={{ width: "50%", borderRight: "1px solid #000", padding: "4px 8px" }}>
                      <div>Delivery Note</div>
                      <div>{data.deliveryNoteNo || ""}</div>
                    </td>
                    <td style={{ padding: "4px 8px" }}>
                      <div>Mode/Terms of Payment</div>
                      <div>{data.paymentMode || ""}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Second Row: Reference & Other References */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td
              style={{
                width: "60%",
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
                padding: "0",
                verticalAlign: "top",
              }}
            >
              {/* Consignee */}
              <div style={{ borderBottom: "1px solid #000", padding: "4px 8px" }}>
                <div style={{ fontWeight: "bold" }}>Consignee (Ship to)</div>
                <div style={{ fontWeight: "bold", marginTop: "4px" }}>{data.consignee.name}</div>
                {data.consignee.address && <div>{data.consignee.address}</div>}
                <div>{data.consignee.city}</div>
                <div>GSTIN/UIN&nbsp;&nbsp;&nbsp;&nbsp;: {data.consignee.gstin}</div>
                <div>
                  State Name&nbsp;&nbsp;&nbsp;&nbsp;: {data.consignee.stateName}, Code :{" "}
                  {data.consignee.stateCode}
                </div>
              </div>
            </td>
            <td style={{ borderBottom: "1px solid #000", padding: "0", verticalAlign: "top" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        width: "50%",
                        borderRight: "1px solid #000",
                        borderBottom: "1px solid #000",
                        padding: "4px 8px",
                      }}
                    >
                      <div>Reference No. & Date.</div>
                      <div>{data.referenceNo || ""}</div>
                    </td>
                    <td style={{ borderBottom: "1px solid #000", padding: "4px 8px" }}>
                      <div>Other References</div>
                      <div>{data.other_references || ""}</div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: "50%",
                        borderRight: "1px solid #000",
                        borderBottom: "1px solid #000",
                        padding: "4px 8px",
                      }}
                    >
                      <div>Buyer&apos;s Order No.</div>
                      <div>{data.buyerOrderNo || ""}</div>
                    </td>
                    <td style={{ borderBottom: "1px solid #000", padding: "4px 8px" }}>
                      <div>Dated</div>
                      <div></div>
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        width: "50%",
                        borderRight: "1px solid #000",
                        borderBottom: "1px solid #000",
                        padding: "4px 8px",
                      }}
                    >
                      <div>Dispatch Doc No.</div>
                      <div>{data.dispatchDocNo || ""}</div>
                    </td>
                    <td style={{ borderBottom: "1px solid #000", padding: "4px 8px" }}>
                      <div>Delivery Note Date</div>
                      <div>{data.deliveryNoteDate ? formatDate(data.deliveryNoteDate) : ""}</div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: "50%", borderRight: "1px solid #000", padding: "4px 8px" }}>
                      <div>Dispatched through</div>
                      <div>{data.dispatchedThrough || ""}</div>
                    </td>
                    <td style={{ padding: "4px 8px" }}>
                      <div>Destination</div>
                      <div>{data.destination || ""}</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Buyer Row */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td
              style={{
                width: "60%",
                borderRight: "1px solid #000",
                borderBottom: "1px solid #000",
                padding: "4px 8px",
                verticalAlign: "top",
              }}
            >
              <div style={{ fontWeight: "bold" }}>Buyer (Bill to)</div>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>{data.buyer.name}</div>
              {data.buyer.address && <div>{data.buyer.address}</div>}
              <div>{data.buyer.city}</div>
              <div>GSTIN/UIN&nbsp;&nbsp;&nbsp;&nbsp;: {data.buyer.gstin}</div>
              <div>
                State Name&nbsp;&nbsp;&nbsp;&nbsp;: {data.buyer.stateName}, Code :{" "}
                {data.buyer.stateCode}
              </div>
            </td>
            <td
              style={{ borderBottom: "1px solid #000", padding: "4px 8px", verticalAlign: "top" }}
            >
              <div>Terms of Delivery</div>
              <div>{data.termsOfDelivery || ""}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Line Items Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000" }}>
            <th
              style={{
                borderRight: "1px solid #000",
                padding: "6px 4px",
                textAlign: "center",
                width: "5%",
              }}
            >
              Sl
              <br />
              No.
            </th>
            <th
              style={{
                borderRight: "1px solid #000",
                padding: "6px 4px",
                textAlign: "center",
                width: "35%",
              }}
            >
              Description of
              <br />
              Services
            </th>
            <th
              style={{
                borderRight: "1px solid #000",
                padding: "6px 4px",
                textAlign: "center",
                width: "10%",
              }}
            >
              HSN/SAC
            </th>
            <th
              style={{
                borderRight: "1px solid #000",
                padding: "6px 4px",
                textAlign: "center",
                width: "10%",
              }}
            >
              Quantity
            </th>
            <th
              style={{
                borderRight: "1px solid #000",
                padding: "6px 4px",
                textAlign: "center",
                width: "8%",
              }}
            >
              Rate
            </th>
            <th
              style={{
                borderRight: "1px solid #000",
                padding: "6px 4px",
                textAlign: "center",
                width: "6%",
              }}
            >
              per
            </th>
            <th style={{ padding: "6px 4px", textAlign: "center", width: "16%" }}>
              Amount
              <br />
              (Incl. of Tax)
            </th>
          </tr>
        </thead>
        <tbody>
          {data.lineItems.map((item, index) => (
            <tr key={item.id}>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                {index + 1}
              </td>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "left" }}>
                {item.description}
              </td>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                {item.hsn}
              </td>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                {item.quantity} {item.unit}
              </td>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                {formatCurrency(item.rate)}
              </td>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                {item.unit}
              </td>
              <td style={{ padding: "4px", textAlign: "right" }}>
                {formatCurrency(calculateLineItemTotal(item))}
              </td>
            </tr>
          ))}
          {/* Tax rows */}
          {hasGST && (
            <>
              <tr>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                  CGST
                </td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ padding: "4px", textAlign: "right" }}>{formatCurrency(cgst)}</td>
              </tr>
              <tr>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                  SGST
                </td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ padding: "4px", textAlign: "right" }}>{formatCurrency(sgst)}</td>
              </tr>
            </>
          )}
          {hasIGST && (
            <tr>
              <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                IGST
              </td>
              <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
              <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
              <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
              <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
              <td style={{ padding: "4px", textAlign: "right" }}>{formatCurrency(igst)}</td>
            </tr>
          )}
          {/* Total Row */}
          <tr style={{ borderTop: "1px solid #000" }}>
            <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
            <td
              style={{
                borderRight: "1px solid #000",
                padding: "4px",
                textAlign: "right",
                fontWeight: "bold",
              }}
            >
              Total
            </td>
            <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
            <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
              {totalQuantity} {totalUnit}
            </td>
            <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
            <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
            <td style={{ padding: "4px", textAlign: "right", fontWeight: "bold" }}>
              {formatCurrency(total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Amount in Words */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td
              style={{
                borderTop: "1px solid #000",
                borderBottom: "1px solid #000",
                padding: "6px 8px",
              }}
            >
              <span>Amount Chargeable (in words)</span>
              <span style={{ float: "right" }}>E. &amp; O.E</span>
              <div style={{ fontWeight: "bold", marginTop: "4px" }}>INR {numberToWords(total)}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* HSN/SAC Tax Breakdown Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #000" }}>
            <th
              style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}
              rowSpan={2}
            >
              HSN/SAC
            </th>
            <th
              style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}
              rowSpan={2}
            >
              Taxable
              <br />
              Value
            </th>
            {hasGST && (
              <>
                <th
                  style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}
                  colSpan={2}
                >
                  CGST
                </th>
                <th
                  style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}
                  colSpan={2}
                >
                  SGST/UTGST
                </th>
              </>
            )}
            {hasIGST && (
              <th
                style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}
                colSpan={2}
              >
                IGST
              </th>
            )}
            <th style={{ padding: "4px", textAlign: "center" }} rowSpan={2}>
              Total
              <br />
              Tax Amount
            </th>
          </tr>
          <tr style={{ borderBottom: "1px solid #000" }}>
            {hasGST && (
              <>
                <th style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                  Rate
                </th>
                <th style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                  Amount
                </th>
                <th style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                  Rate
                </th>
                <th style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                  Amount
                </th>
              </>
            )}
            {hasIGST && (
              <>
                <th style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                  Rate
                </th>
                <th style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                  Amount
                </th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {taxBreakdown.map((group, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #000" }}>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                {group.hsn}
              </td>
              <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                {formatCurrency(group.taxableValue)}
              </td>
              {hasGST && (
                <>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                    {group.taxType === "GST" ? `${group.gstRate / 2}%` : "-"}
                  </td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                    {group.taxType === "GST" ? formatCurrency(group.cgst) : "-"}
                  </td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                    {group.taxType === "GST" ? `${group.gstRate / 2}%` : "-"}
                  </td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                    {group.taxType === "GST" ? formatCurrency(group.sgst) : "-"}
                  </td>
                </>
              )}
              {hasIGST && (
                <>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "center" }}>
                    {group.taxType === "IGST" ? `${group.gstRate}%` : "-"}
                  </td>
                  <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                    {group.taxType === "IGST" ? formatCurrency(group.igst) : "-"}
                  </td>
                </>
              )}
              <td style={{ padding: "4px", textAlign: "right" }}>
                {formatCurrency(group.cgst + group.sgst + group.igst)}
              </td>
            </tr>
          ))}
          <tr style={{ borderBottom: "1px solid #000", fontWeight: "bold" }}>
            <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
              Total
            </td>
            <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
              {formatCurrency(subtotal)}
            </td>
            {hasGST && (
              <>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                  {formatCurrency(cgst)}
                </td>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                  {formatCurrency(sgst)}
                </td>
              </>
            )}
            {hasIGST && (
              <>
                <td style={{ borderRight: "1px solid #000", padding: "4px" }}></td>
                <td style={{ borderRight: "1px solid #000", padding: "4px", textAlign: "right" }}>
                  {formatCurrency(igst)}
                </td>
              </>
            )}
            <td style={{ padding: "4px", textAlign: "right" }}>{formatCurrency(taxTotal)}</td>
          </tr>
        </tbody>
      </table>

      {/* Tax Amount in Words */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ borderBottom: "1px solid #000", padding: "6px 8px" }}>
              <span>Tax Amount (in words) :</span>
              <span style={{ fontWeight: "bold", marginLeft: "8px" }}>
                INR {numberToWords(taxTotal)}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer: Declaration & Bank Details */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td
              style={{
                width: "60%",
                borderRight: "1px solid #000",
                padding: "8px",
                verticalAlign: "top",
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                Company&apos;s Bank Details
              </div>
              {data.accountHolder && (
                <div>
                  A/c Holder&apos;s Name :{" "}
                  <span style={{ fontWeight: "bold" }}>{data.accountHolder}</span>
                </div>
              )}
              <div>
                Bank Name: <span style={{ fontWeight: "bold" }}>{data.bankName}</span>
              </div>
              {data.accountNo && (
                <div>
                  A/c No.: <span style={{ fontWeight: "bold" }}>{data.accountNo}</span>
                </div>
              )}
              {data.branchIFSCode && (
                <div>
                  Branch & IFS Code:{" "}
                  <span style={{ fontWeight: "bold" }}>{data.branchIFSCode}</span>
                </div>
              )}
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontWeight: "bold" }}>Declaration</div>
                <div style={{ fontSize: "10px", lineHeight: "1.4" }}>
                  We declare that this invoice shows the actual price of the
                  <br />
                  goods described and that all particulars are true and
                  <br />
                  correct.
                </div>
              </div>
            </td>
            <td style={{ padding: "8px", verticalAlign: "top", textAlign: "right" }}>
              <div style={{ marginBottom: "8px" }}>for {data.company.name}</div>
              <div style={{ height: "50px" }}></div>
              <div>Authorised Signatory</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Computer Generated Notice */}
      <div
        style={{
          borderTop: "1px solid #000",
          padding: "6px",
          textAlign: "center",
          fontSize: "10px",
        }}
      >
        This is a Computer Generated Invoice
      </div>
    </div>
  );
}
