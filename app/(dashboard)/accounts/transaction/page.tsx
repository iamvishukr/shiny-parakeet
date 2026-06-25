"use client";

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";
import type { TransactionsDoc, TransactionItem, UserDoc } from "./types";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { getTransactionColumns } from "./columns";
import { GenericTable } from "@/components/shared/GenericTable";
import Pagination from "@/components/shared/Pagination";
import TableSkeleton from "@/components/shared/skeletons/TableSkeleton";
import TableActions from "@/components/shared/TableActions";
import { Button } from "@/components/ui/button";
import { CSVLink } from "react-csv";
import { toast } from "sonner";
import TransactionModal from "./TransactionForm";

interface FirestoreTimestampLike {
  seconds: number;
  nanoseconds?: number;
}

interface Project {
  id: string;
  name: string;
}

const isFirestoreTimestampLike = (value: unknown): value is FirestoreTimestampLike => {
  return (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as FirestoreTimestampLike).seconds === "number"
  );
};

export default function TransactionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<TransactionItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTransaction, setActiveTransaction] = useState<TransactionItem | null>(null);
  const [employees, setEmployees] = useState<UserDoc[]>([]);

  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(firestore, "users"),
      (snapshot) => {
        const arr = snapshot.docs
          .map((d) => {
            const data = d.data();
            const name = data?.name || data?.displayName || data?.fullName || data?.email || d.id;
            return { uId: d.id, name } as UserDoc;
          })
          .sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(arr);
      },
      (error) => {
        console.error("Failed to subscribe users:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const snapshot = await getDocs(collection(firestore, "projects"));
        const projectsList = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().projectName || "Unnamed Project",
        }));
        setProjects(projectsList);
      } catch (error) {
        console.error("Error fetching projects:", error);
        toast.error("Failed to load projects");
      }
    };

    fetchProjects();
  }, []);

  const handleSaveTransaction = async (txn: TransactionItem) => {
    try {
      const now = new Date();
      const dateKey = txn.date;

      const txnDocRef = doc(firestore, "transactions", dateKey);
      const snap = await getDoc(txnDocRef);

      let existingItems: TransactionItem[] = snap.exists()
        ? (snap.data() as TransactionsDoc).items || []
        : [];

      const isUpdate = !!activeTransaction;

      if (isUpdate) {
        existingItems = existingItems.map((item) =>
          item.id === txn.id ? { ...txn, updatedAt: now } : item
        );

        await setDoc(
          txnDocRef,
          {
            items: existingItems,
            updatedAt: now,
          },
          { merge: true }
        );

        if (txn.type === "credit" && txn.sourceType === "project") {
          const projectRef = doc(firestore, "projects", txn.sourceValue);
          const projSnap = await getDoc(projectRef);

          if (projSnap.exists()) {
            const history = (projSnap.data().transactionHistory || []).map((h: { id: string }) =>
              h.id === txn.id
                ? {
                    ...h,
                    amount: txn.amount,
                    purpose: txn.purpose,
                    date: txn.date,
                    updatedAt: now,
                  }
                : h
            );

            await updateDoc(projectRef, { transactionHistory: history });
          }
        }

        if (txn.type === "debit" && txn.debitType === "project") {
          const projectRef = doc(firestore, "projects", txn.sourceValue ?? "");
          const projSnap = await getDoc(projectRef);

          if (projSnap.exists()) {
            const history = (projSnap.data().transactionHistory || []).map((h: { id: string }) =>
              h.id === txn.id
                ? {
                    ...h,
                    amount: txn.amount,
                    purpose: txn.purpose,
                    date: txn.date,
                    updatedAt: now,
                  }
                : h
            );

            await updateDoc(projectRef, { transactionHistory: history });
          }
        }

        if (
          txn.type === "debit" &&
          txn.debitType === "employee_salary" &&
          txn.selectedEmployeeIds
        ) {
          const salaryRef = doc(
            firestore,
            "users",
            txn.selectedEmployeeIds,
            "salaryHistory",
            txn.id
          );

          await setDoc(
            salaryRef,
            {
              month: `${txn.salaryYear}-${txn.salaryMonth}`,
              paidSalary: txn.amount,
              status: "paid",
              transactionId: txn.id,
              updatedAt: now,
            },
            { merge: true }
          );
        }

        toast.success("Transaction updated successfully");
      } else {
        const newTxn: TransactionItem = {
          ...txn,
          id: crypto.randomUUID(),
          createdAt: now,
        };

        const updatedItems = [...existingItems, newTxn];

        await setDoc(
          txnDocRef,
          {
            items: updatedItems,
            createdAt: now,
            updatedAt: now,
          },
          { merge: true }
        );

        if (newTxn.type === "credit" && newTxn.sourceType === "project") {
          const projectRef = doc(firestore, "projects", newTxn.sourceValue);

          await updateDoc(projectRef, {
            transactionHistory: arrayUnion({
              id: newTxn.id,
              type: "credit",
              amount: newTxn.amount,
              purpose: newTxn.purpose,
              date: newTxn.date,
              createdAt: now,
            }),
          });
        }

        if (newTxn.type === "debit" && newTxn.debitType === "project") {
          const projectRef = doc(firestore, "projects", newTxn.sourceValue ?? "");

          await updateDoc(projectRef, {
            transactionHistory: arrayUnion({
              id: newTxn.id,
              type: "debit",
              amount: newTxn.amount,
              purpose: newTxn.purpose,
              date: newTxn.date,
              createdAt: now,
            }),
          });
        }

        if (
          newTxn.type === "debit" &&
          newTxn.debitType === "employee_salary" &&
          newTxn.selectedEmployeeIds
        ) {
          const salaryMonthKey = `${newTxn.salaryYear}-${newTxn.salaryMonth}`;

          const salaryRef = doc(
            firestore,
            "users",
            newTxn.selectedEmployeeIds,
            "salaryHistory",
            newTxn.id
          );

          await setDoc(
            salaryRef,
            {
              month: salaryMonthKey,
              paidSalary: newTxn.amount,
              status: "paid",
              transactionId: newTxn.id,
              createdAt: now,
              updatedAt: now,
            },
            { merge: true }
          );
        }

        toast.success("Transaction added successfully");
      }

      setModalOpen(false);
      setActiveTransaction(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save transaction");
    }
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(firestore, "transactions"), (snapshot) => {
      const items: TransactionItem[] = [];
      snapshot.docs.forEach((d) => {
        const docData = d.data() as TransactionsDoc;
        const dateKey = d.id;

        const arr: TransactionItem[] = (docData?.items || []).map((it) => {
          let createdAt: Date;
          if (it.createdAt instanceof Timestamp) {
            createdAt = it.createdAt.toDate();
          } else if (isFirestoreTimestampLike(it.createdAt)) {
            createdAt = new Date(it.createdAt.seconds * 1000);
          } else if (typeof it.createdAt === "string") {
            createdAt = new Date(it.createdAt);
          } else if (it.createdAt instanceof Date) {
            createdAt = it.createdAt;
          } else {
            createdAt = new Date(dateKey) || new Date();
          }

          return {
            ...it,
            date: it.date || dateKey,
            createdAt: createdAt,
          };
        });
        items.push(...arr);
      });

      const getTimestamp = (val: string | Date | FirestoreTimestampLike | undefined): number => {
        if (!val) return 0;
        if (val instanceof Date) return val.getTime();
        if (isFirestoreTimestampLike(val)) return val.seconds * 1000;
        if (typeof val === "string") return new Date(val).getTime();
        return 0;
      };

      const sortedItems = items.sort((a, b) => {
        const ta = getTimestamp(a.createdAt as Date);
        const tb = getTimestamp(b.createdAt as Date);
        return tb - ta;
      });

      setData(sortedItems);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  const handleEdit = (transaction: TransactionItem) => {
    setActiveTransaction(transaction);
    setModalOpen(true);
  };

  const summary = useMemo(() => {
    const credits = data.filter((t) => t.type === "credit").reduce((sum, t) => sum + t.amount, 0);
    const debits = data.filter((t) => t.type === "debit").reduce((sum, t) => sum + t.amount, 0);
    const net = credits - debits;
    return { credits, debits, net };
  }, [data]);

  const columns = useMemo(
    () =>
      getTransactionColumns({
        onEdit: handleEdit,
        projects: projects,
      }),
    [projects]
  );

  const table = useReactTable({
    data: data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
    },
  });

  const csvFilename = useMemo(() => {
    if (!isClient) return "transactions.csv";
    return `transactions-${startDate || "all"}-${endDate || "all"}.csv`;
  }, [isClient, startDate, endDate]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">View all credits and debits</p>
        </div>
        <div className="flex items-center gap-2">
          {isClient && (
            <CSVLink
              data={data}
              filename={csvFilename}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Export CSV
            </CSVLink>
          )}
          <Button
            onClick={() => {
              setActiveTransaction(null);
              setModalOpen(true);
            }}
          >
            Add
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Credits</h3>
          <p className="text-2xl font-bold text-green-600">₹{summary.credits.toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Debits</h3>
          <p className="text-2xl font-bold text-red-600">₹{summary.debits.toLocaleString()}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Net Balance</h3>
          <p
            className={`text-2xl font-bold ${summary.net >= 0 ? "text-green-600" : "text-red-600"}`}
          >
            ₹{summary.net.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total Records</h3>
          <p className="text-2xl font-bold">{data.length}</p>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton columnCount={7} rowCount={5} />
      ) : (
        <>
          <TableActions
            table={table}
            data={data}
            startDate={startDate}
            endDate={endDate}
            setStartDate={setStartDate}
            setEndDate={setEndDate}
            resetDateFilter={() => {
              setStartDate("");
              setEndDate("");
            }}
            searchPlaceholder="Filter by Notes..."
            searchParam="purpose"
            dateColumn="date"
          />
          <GenericTable table={table} />
          <Pagination table={table} />
        </>
      )}

      <TransactionModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        transaction={activeTransaction}
        projects={projects}
        onSubmit={handleSaveTransaction}
        employees={employees}
      />
    </div>
  );
}
