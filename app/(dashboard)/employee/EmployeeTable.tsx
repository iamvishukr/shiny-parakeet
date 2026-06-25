import { useState } from "react";
import { getEmployeeColumns } from "./columns";
import { Employee } from "./types";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function EmployeeTable({ data }: { data: Employee[] }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupTitle, setPopupTitle] = useState("");
  const [popupContent, setPopupContent] = useState<React.ReactNode>(null);

  const openPopup = (title: string, content: React.ReactNode) => {
    setPopupTitle(title);
    setPopupContent(content);
    setPopupOpen(true);
  };

  const onEdit = (emp: Employee) => {
    console.log("Edit employee", emp);
  };

  const columns = getEmployeeColumns(onEdit, openPopup);

  return (
    <>
      <DataTable columns={columns} data={data} />

      {/* Global popup */}
      <Dialog open={popupOpen} onOpenChange={setPopupOpen}>
        <DialogContent className="max-h-[80vh] max-w-4xl w-full overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{popupTitle}</DialogTitle>
          </DialogHeader>
          <div className="py-2">{popupContent}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPopupOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
