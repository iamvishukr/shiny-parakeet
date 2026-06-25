import { ColumnDef } from "@tanstack/react-table";
import SortButton from "@/components/shared/sortButton";
import { Enquiry } from "./types";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { firestore } from "@/lib/firebase";
import { collection, deleteDoc, doc, setDoc } from "firebase/firestore";
import { toast } from "sonner";

// Helper function to parse DD/MM/YYYY format
const parseDDMMYYYY = (dateString: string): Date | null => {
  if (!dateString) return null;
  
  try {
    const parts = dateString.split('/');
    if (parts.length !== 3) return null;
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Months are 0-indexed in JavaScript
    const year = parseInt(parts[2], 10);
    
    // Validate date components
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
    if (day < 1 || day > 31) return null;
    if (month < 0 || month > 11) return null;
    if (year < 1000) return null;
    
    const date = new Date(year, month, day);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return null;
    
    // Additional validation to catch invalid dates like 31/02/2023
    if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) {
      return null;
    }
    
    return date;
  } catch (error) {
    console.error('Error parsing date:', error);
    return null;
  }
};

export function getEnquiryColumns(
  onEdit: (enquiry: Enquiry) => void,
  onRowSelectionChange?: (value: Record<string, boolean>) => void
): ColumnDef<Enquiry>[] {
  const handleConvertToClient = async (enquiry: Enquiry) => {
    try {
      const clientsRef = collection(firestore, "clients");
      const modifiedId = enquiry.enquiryId.replace(/^enquiry/, "client");

      await setDoc(doc(clientsRef, modifiedId), {
        name: enquiry.name,
        phoneNo: enquiry.phoneNo,
        address: enquiry.address,
        source: "enquiry",
        originalEnquiryId: modifiedId,
        dateOfEvent: enquiry.dateOfEvent,
        projectType: enquiry.projectType,
        venue: enquiry.venue,
        createdAt: new Date().toISOString(),
      });

      await deleteDoc(doc(firestore, "enquiry", enquiry.enquiryId));

      // Reset row selection
      if (onRowSelectionChange) {
        onRowSelectionChange({});
      }

      toast.success(`Converted to client with ID: ${modifiedId}`);
    } catch (error) {
      console.error("Conversion error:", error);
      toast.error("Failed to convert enquiry to client");
    }
  };

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "enquiryId",
      header: () => <Button variant="ghost">Enquiry ID</Button>,
      cell: ({ row }) => <div>{row.getValue("enquiryId")}</div>,
      enableHiding: true,
    },
    {
      accessorKey: "slNO",
      header: "Sl No",
      cell: ({ row }) => <div>{row.index + 1}</div>,
      enableHiding: true,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <SortButton
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          isAsc={column.getIsSorted() === "asc"}
        />
      ),
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "phoneNo",
      header: "Phone No",
      cell: ({ row }) => <div>{row.getValue("phoneNo")}</div>,
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => <div>{row.getValue("address")}</div>,
    },
    {
      accessorKey: "projectType",
      header: "Project Type",
      cell: ({ row }) => <div>{row.getValue("projectType")}</div>,
    },
    {
      accessorKey: "venue",
      header: "Venue",
      cell: ({ row }) => <div>{row.getValue("venue")}</div>,
    },
    {
      accessorKey: "dateOfEvent",
      header: "Date Of Event",
      cell: ({ row }) => <div>{row.getValue("dateOfEvent")}</div>,
      // Add filter function for date range filtering with DD/MM/YYYY support
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        
        const { startDate, endDate } = filterValue;
        const cellValue = row.getValue(columnId) as string;
        
        if (!cellValue) return false;
        
        // Parse the DD/MM/YYYY format
        const eventDate = parseDDMMYYYY(cellValue);
        if (!eventDate) return false;
        
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        // Set time to beginning of day for start date and end of day for end date
        if (start) start.setHours(0, 0, 0, 0);
        if (end) end.setHours(23, 59, 59, 999);

        if (start && eventDate < start) return false;
        if (end && eventDate > end) return false;
        
        return true;
      },
      // Add sorting support for DD/MM/YYYY format
      sortingFn: (rowA, rowB, columnId) => {
        const dateA = parseDDMMYYYY(rowA.getValue(columnId) as string);
        const dateB = parseDDMMYYYY(rowB.getValue(columnId) as string);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return -1;
        if (!dateB) return 1;
        
        return dateA.getTime() - dateB.getTime();
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const enquiry = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(enquiry)}>Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleConvertToClient(enquiry)}>
                Convert to Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableSorting: false,
      enableHiding: false,
    },
  ];
}