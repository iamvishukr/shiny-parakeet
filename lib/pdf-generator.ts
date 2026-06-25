// PDF generation utility using html2pdf
export async function generatePDFFromHTML(elementId: string, fileName: string) {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  // Dynamically import html2pdf
  const html2pdf = (await import("html2pdf.js")).default;

  type Options = {
    margin: number;
    filename: string;
    image: { type?: "jpeg" | "png" | "webp"; quality: number };
    html2canvas: { scale: number };
    jsPDF: { orientation: "portrait" | "landscape"; unit: string; format: string };
  };

  const options: Options = {
    margin: 0.5,
    filename: fileName,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: "portrait", unit: "in", format: "a4" },
  };

  return html2pdf().set(options).from(element).save();
}
