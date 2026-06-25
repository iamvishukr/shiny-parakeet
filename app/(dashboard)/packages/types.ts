export interface DeliverableWithQuantity {
  deliverableId: string;
  quantity: string;
  description: string;
}

export interface Package {
  id?: string;
  name: string;
  price: number;
  eventId: string;
  shoots: string[];
  deliverables: DeliverableWithQuantity[];
  createdAt?: Date | { seconds: number } | string;
}
