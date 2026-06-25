import { Suspense } from "react";
import InvoiceClient from "./invoice";

export default function InvoicePage() {
  return (
    <Suspense fallback={<div>Loading invoice...</div>}>
      <InvoiceClient />
    </Suspense>
  );
}
