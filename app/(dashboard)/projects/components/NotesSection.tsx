import React from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface NotesSectionProps {
  note: string;
  onInputChange: (field: string, value: string | number) => void;
}

export function NotesSection({ note, onInputChange }: NotesSectionProps) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-800">Additional Notes</h2>
      <div className="space-y-2">
        <Label>Note </Label>
        <Textarea
          className="w-full"
          value={note}
          onChange={(e) => onInputChange("note", e.target.value)}
          placeholder="Enter project notes"
          rows={4}
        />
      </div>
    </div>
  );
}
