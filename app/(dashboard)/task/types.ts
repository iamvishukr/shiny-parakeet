export interface Deliverable {
  deliverableId: string;
  name: string;
  createdAt: Date;
}

export const STATUS_OPTIONS = [
  "All",
  "Pending",
  "Ongoing",
  "Completed",
  "Cancelled",
  "Postponed",
] as const;
