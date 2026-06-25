import React from "react";
import { Button } from "../ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";

interface sortbaleButtonProps {
  onClick: () => void;
  isAsc: boolean;
  label?: string;
}

function SortButton({ onClick, isAsc, label="Name" }: sortbaleButtonProps) {
  return (
    <Button variant="ghost" onClick={onClick}>
      {label}
      {isAsc ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />}
    </Button>
  );
}

export default SortButton;
