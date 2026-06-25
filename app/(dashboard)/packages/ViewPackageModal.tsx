"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Package } from "./types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { collection, onSnapshot } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { Shoot } from "../shoots/types";
import { Deliverable } from "../deliverables/types";
import { Event } from "../events/types";

interface Props {
  data: Package | null;
  open: boolean;
  onClose: () => void;
}

function ViewPackageModal({ data, open, onClose }: Props) {
  const [shootDetails, setShootDetails] = React.useState<Record<string, Shoot>>({});
  const [deliverableDetails, setDeliverableDetails] = React.useState<Record<string, Deliverable>>(
    {}
  );
  const [eventDetails, setEventDetails] = React.useState<Record<string, Event>>({});

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "events"), (snapshot) => {
      const events = snapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { ...doc.data(), eventId: doc.id } as Event;
        return acc;
      }, {} as Record<string, Event>);
      setEventDetails(events);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "shoots"), (snapshot) => {
      const shoots = snapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { ...doc.data(), shootId: doc.id } as Shoot;
        return acc;
      }, {} as Record<string, Shoot>);
      setShootDetails(shoots);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const unsubscribe = onSnapshot(collection(firestore, "deliverables"), (snapshot) => {
      const deliverables = snapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = { ...doc.data(), deliverableId: doc.id } as Deliverable;
        return acc;
      }, {} as Record<string, Deliverable>);
      setDeliverableDetails(deliverables);
    });
    return () => unsubscribe();
  }, []);

  if (!data) return null;

  const event = eventDetails[data.eventId];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Package Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Event</h3>
            <p className="text-xl">{event?.name || "Loading..."}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Package Name</h3>
            <p className="text-xl">{data.name}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Price</h3>
            <p className="text-xl">₹{data.price.toLocaleString("en-IN")}</p>
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Included Shoots</h3>
            {data.shoots && data.shoots.length > 0 ? (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Shoot Name</TableHead>
                      <TableHead className="w-[120px]">Photographer</TableHead>
                      <TableHead className="w-[120px]">Videographer</TableHead>
                      <TableHead className="w-[120px]">Candid</TableHead>
                      <TableHead className="w-[120px]">Cinematographer</TableHead>
                      <TableHead className="w-[100px]">Assistant</TableHead>
                      <TableHead className="w-[100px]">Drone</TableHead>
                      <TableHead className="w-[100px]">Other</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.shoots.map((shootId) => {
                      const shoot = shootDetails[shootId];
                      if (!shoot) return null;
                      return (
                        <TableRow key={shootId}>
                          <TableCell className="font-medium">{shoot.name}</TableCell>
                          <TableCell>{shoot.traditionalPhotographer}</TableCell>
                          <TableCell>{shoot.traditionalVideographer}</TableCell>
                          <TableCell>{shoot.candid}</TableCell>
                          <TableCell>{shoot.cinemetographer}</TableCell>
                          <TableCell>{shoot.assistant}</TableCell>
                          <TableCell>{shoot.drone}</TableCell>
                          <TableCell>{shoot.other ?? 0}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No shoots included</p>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Deliverables</h3>
            {data.deliverables && data.deliverables.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">Deliverable</TableHead>
                      <TableHead className="w-[100px] text-right">Description</TableHead>
                      <TableHead className="w-[100px] text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.deliverables.map((deliverable) => {
                      const details = deliverableDetails[deliverable.deliverableId];
                      return (
                        <TableRow key={deliverable.deliverableId}>
                          <TableCell>{details?.name || "Loading..."}</TableCell>
                          <TableCell className="text-right">{deliverable.description}</TableCell>
                          <TableCell className="text-right">{deliverable.quantity}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-muted-foreground">No deliverables included</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ViewPackageModal;
