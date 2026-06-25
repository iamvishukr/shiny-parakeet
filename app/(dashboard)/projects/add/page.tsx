"use client";

import React, { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useProjectForm } from "../../../../hooks/useProjectForm";
import { BasicInformationSection } from "../components/BasicInformationSection";
import { ProjectDetailsSection } from "../components/ProjectDetailsSection";
import { FinancialSection } from "../components/FinancialSection";
import { NotesSection } from "../components/NotesSection";
import { ShootTableSection } from "../components/ShootTableSection";
import { DeliverablesTableSection } from "../components/DeliverablesTableSection";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import { toast } from "sonner";
import { Project } from "../types";
import { parseDDMMYYYY } from "@/lib/utils";

function AddProject() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get("edit");
  const clientId = searchParams?.get("client");
  const [isEdit, setIsEdit] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const {
    formData,
    isLoading,
    clients,
    events,
    packages,
    handleInputChange,
    handleSubmit,
    shootTableData,
    handleShootTableChange,
    handleAddShootRow,
    handleRemoveShootRow,
    deliverablesTableData,
    handleDeliverablesTableChange,
    handleAddDeliverableRow,
    handleRemoveDeliverableRow,
    deliverables,
    setFormData,
    setShootTableData,
    setDeliverablesTableData,
    setIsEditMode,
  } = useProjectForm();

  useEffect(() => {
    if (clientId) {
      setFormData((prev) => ({
        ...prev,
        clientName: clientId,
      }));
    }
  }, [clientId, setFormData]);

  useEffect(() => {
    const fetchClientDetails = async () => {
      if (!formData.clientName) return;

      try {
        // clientName should be the document ID
        const clientRef = doc(firestore, "clients", formData.clientName);
        const clientSnap = await getDoc(clientRef);

        if (clientSnap.exists()) {
          const clientData = clientSnap.data();
          let eventId = "";
          if (clientData.projectType) {
            // Search for the event by name
            const eventsRef = collection(firestore, "events");
            const q = query(eventsRef, where("name", "==", clientData.projectType));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              // If event exists, take the first matching document ID
              eventId = querySnapshot.docs[0].id;
            }
          }
          setFormData((prev) => ({
            ...prev,
            venues: clientData.venue || "",
            dates: parseDDMMYYYY(clientData.dateOfEvent) || "",
            event: eventId || clientData.projectType,
            eventName: clientData.projectType,
          }));
        }
      } catch (error) {
        console.error("Error fetching client details:", error);
      }
    };

    fetchClientDetails();
  }, [formData.clientName]);

  useEffect(() => {
    if (formData.venues) {
      setShootTableData((prevShoots) =>
        prevShoots.map((shoot) => ({
          ...shoot,
          venue: shoot.venue || formData.venues, // only prefill if empty
        }))
      );
    }
  }, [formData.venues, setShootTableData]);

  useEffect(() => {
    if (editId) {
      setIsEdit(true);
      setIsEditMode(true);
      setLoadingEdit(true);
      // Fetch project data and prefill
      getDoc(doc(firestore, "projects", editId)).then((docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as Project;
          setFormData({
            clientName: data.clientName || "",
            projectName: data.projectName || "",
            dates: data.dates ? new Date(data.dates) : undefined,
            venues: data.venues || "",
            event: data.event || "",
            eventName: data.event || "",
            package: data.package || "",
            shoot: data.shoot || "",
            status: data.status || "pending",
            deliverables:
              Array.isArray(data.deliverables) && typeof data.deliverables[0] === "string"
                ? (data.deliverables as string[])
                : [],
            price: data.price || 0,
            extraExpenses: data.extraExpenses ?? [],
            discount: data.discount || 0,
            finalAmount: data.finalAmount || 0,
            // advance: data.advance || 0,
            // due: data.due || 0,

            note: data.note || "",
          });
          setShootTableData(
            (data.shoots || []).map((shoot) => ({
              id: shoot.id || "",
              day: shoot.day || "",
              venue: shoot.venue || "",
              ritual: shoot.ritual || "",
              date: shoot.date || "",
              time: shoot.time || "",
              traditionalPhotographer: shoot.traditionalPhotographer || "",
              traditionalVideographer: shoot.traditionalVideographer || "",
              candid: shoot.candid || "",
              cinemetographer: shoot.cinemetographer || "",
              assistant: shoot.assistant || "",
              drone: shoot.drone || "",
              other: shoot.other || "",
            }))
          );

          setDeliverablesTableData(
            Array.isArray(data.deliverables) && typeof data.deliverables[0] === "object"
              ? (data.deliverables as {
                  id: string;
                  name: string;
                  qty: string;
                  description: string;
                }[])
              : []
          );
        }
        setLoadingEdit(false);
      });
    } else {
      setIsEditMode(false);
    }
  }, [editId, setFormData, setShootTableData, setDeliverablesTableData, setIsEditMode]);

  // Custom submit handler for edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;

    try {
      setLoadingEdit(true);
      const projectRef = doc(firestore, "projects", editId);
      const existingSnap = await getDoc(projectRef);

      let existingData: Project | null = null;
      if (existingSnap.exists()) {
        existingData = existingSnap.data() as Project;
      }

      // Merge shoots: preserve fields like assignedEmployee
      const mergedShoots = shootTableData.map((newShoot) => {
        const oldShoot =
          existingData?.shoots?.find((s: { id: string }) => s.id === newShoot.id) || {};
        return { ...oldShoot, ...newShoot };
      });

      // Merge deliverables (same logic)
      const mergedDeliverables = deliverablesTableData.map((newDeliverable) => {
        const oldDeliverable =
          (existingData?.deliverables || []).find(
            (d) => typeof d !== "string" && (d as { id?: string }).id === newDeliverable.id
          ) || {};
        return { ...oldDeliverable, ...newDeliverable };
      });

      await updateDoc(projectRef, {
        ...formData,
        dates: formData.dates ? formData.dates.toISOString() : "",
        shoots: mergedShoots,
        deliverables: mergedDeliverables,
      });

      toast.success("Project updated successfully!");
      window.history.back();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update project");
    } finally {
      setLoadingEdit(false);
    }
  };

  useEffect(() => {
    const fetchNames = async () => {
      if (formData.clientName && formData.event && !formData.projectName) {
        try {
          const clientRef = doc(firestore, "clients", formData.clientName);
          const clientSnap = await getDoc(clientRef);

          const eventRef = doc(firestore, "events", formData.event);
          const eventSnap = await getDoc(eventRef);

          if (clientSnap.exists() && eventSnap.exists()) {
            const clientData = clientSnap.data();
            const eventData = eventSnap.data();

            const generatedName = `${clientData.name}_${eventData.name}`;
            setFormData((prev) => ({
              ...prev,
              projectName: prev.projectName || generatedName, // keep if already set
            }));
          }
        } catch (error) {
          console.error("Error fetching client/event names:", error);
        }
      }
    };

    fetchNames();
  }, [formData.clientName, formData.event]);

  return (
    <div className="container mx-auto py-6 px-2">
      <div className="max-w-7xl mx-auto">
        <form onSubmit={isEdit ? handleEditSubmit : handleSubmit} className="space-y-6">
          <BasicInformationSection
            formData={{
              clientName: formData.clientName,
              projectName: formData.projectName, // auto-filled
              dates: formData.dates,
              venues: formData.venues,
            }}
            clients={clients}
            onInputChange={handleInputChange}
          />

          <ProjectDetailsSection
            formData={{
              event: formData.event,
              package: formData.package,
              status: formData.status,
            }}
            events={events}
            packages={packages}
            onInputChange={handleInputChange}
          />

          {/* Shoots Table Section */}
          <ShootTableSection
            shootsData={shootTableData}
            onChange={handleShootTableChange}
            onAddRow={handleAddShootRow}
            onRemoveRow={handleRemoveShootRow}
            venue={formData.venues}
          />

          {/* Deliverables Table Section */}
          <DeliverablesTableSection
            deliverablesData={deliverablesTableData}
            deliverableOptions={deliverables.map((d) => ({
              deliverableId: d.deliverableId,
              name: d.name,
            }))}
            onChange={handleDeliverablesTableChange}
            onAddRow={handleAddDeliverableRow}
            onRemoveRow={handleRemoveDeliverableRow}
          />

          <FinancialSection
            formData={{
              price: formData.price,
              extraExpenses: formData.extraExpenses ?? [],
              discount: formData.discount,
              finalAmount: formData.finalAmount,
            }}
            onInputChange={handleInputChange}
          />

          <NotesSection note={formData.note} onInputChange={handleInputChange} />

          {/* Submit Buttons */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || loadingEdit} className="min-w-[120px]">
              {loadingEdit
                ? "Saving..."
                : isEdit
                ? "Update Project"
                : isLoading
                ? "Creating..."
                : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AddProjectWithSuspense() {
  return (
    <Suspense>
      <AddProject />
    </Suspense>
  );
}
