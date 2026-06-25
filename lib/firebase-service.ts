import { initializeApp, getApps } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  type DocumentData,
  Timestamp,
} from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export interface FilterPeriod {
  value: string;
  label: string;
}

export const filterPeriods: FilterPeriod[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This Week" },
  { value: "this-month", label: "This Month" },
  { value: "current-year", label: "Current Year" },
  { value: "previous-year", label: "Previous Year" },
  { value: "all-time", label: "All Time" },
];

export const getDateRange = (filter: string) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    case "yesterday":
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterday,
        end: today,
      };
    case "this-week":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return {
        start: weekStart,
        end: now,
      };
    case "this-month":
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      };
    case "current-year":
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: now,
      };
    case "previous-year":
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear(), 0, 1),
      };
    default:
      const date = filter.split("|");
      return {
        start: new Date(date[0]),
        end: new Date(date[1]),
      };
  }
};

// Type guard for toDate method
type WithToDate = { toDate: () => Date };

const parseFirebaseDate = (dateValue: unknown): Date | null => {
  if (!dateValue) return null;

  if (dateValue instanceof Timestamp) {
    return dateValue.toDate();
  }

  if (
    typeof dateValue === "object" &&
    dateValue !== null &&
    "toDate" in dateValue &&
    (dateValue as WithToDate).toDate instanceof Function
  ) {
    return (dateValue as WithToDate).toDate();
  }

  if (typeof dateValue === "string") {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  return null;
};

const filterDocumentsByDate = (
  docs: DocumentData[],
  filter: string,
  dateField = "createdAt"
): DocumentData[] => {
  if (filter === "all-time") return docs;

  const { start, end } = getDateRange(filter);

  return docs.filter((doc) => {
    const date = parseFirebaseDate(doc[dateField]);
    if (!date) return filter === "all-time";
    return date >= start && date <= end;
  });
};

const filterDocumentsByDateId = (
  docs: DocumentData[],
  filter: string,
  dateField = "date"
): DocumentData[] => {
  if (filter === "all-time") return docs;

  const { start, end } = getDateRange(filter);

  return docs.filter((doc) => {
    const dateStr = doc[dateField];
    if (!dateStr || typeof dateStr !== "string") return false;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;

    return date >= start && date <= end;
  });
};

// Interfaces
export interface AttendanceEmployee {
  employeeId: string;
  employeeName: string;
  status: "present" | "absent" | "half-day";
  timestamp: Date;
}

export interface AttendanceData {
  date: string;
  day: string;
  present: number;
  absent: number;
  halfDay: number;
  total: number;
  employees: Record<string, AttendanceEmployee>;
}

export interface ClientData {
  id?: string;
  name: string;
  address: string;
  phoneNo: string;
  createdAt?: string;
  originalEnquiryId?: string;
  source?: string;
}

export interface DeliverableData {
  id?: string;
  name: string;
  createdAt?: Date;
}

export interface EnquiryData {
  id?: string;
  name: string;
  address: string;
  phoneNo: string;
  createdAt?: string;
}

export interface EventData {
  id?: string;
  name: string;
  createdAt?: Date;
}

export interface PackageDeliverable {
  deliverableId: string;
  quantity: string;
}

export interface PackageData {
  id?: string;
  name: string;
  price: number;
  eventId: string;
  eventName: string;
  deliverables: PackageDeliverable[];
  shoots: string[];
  createdAt?: Date;
}

export interface ProjectData {
  id?: string;
  name?: string;
  status?: string;
  clientId?: string;
  createdAt?: Date;
}

export interface SalaryEmployee {
  employeeId: string;
  employeeName: string;
  amount: number;
  timestamp: Date;
}

export interface SalaryData {
  id?: string;
  date: string;
  employees?: Record<string, SalaryEmployee>;
  createdAt?: Date;
}

export interface ShootData {
  id?: string;
  name: string;
  assistant: string;
  camId: string;
  candid: string;
  cinemetographer: string;
  drone: string;
  traditionalPhotographer: string;
  traditionalVideographer: string;
  other: string;
  createdAt?: Date;
}

export interface TaskItem {
  taskId: string;
  type: "shoot" | "deliverable";
  name: string;
  employeeId: string;
  projectId: string;
  deliveryDate: string;
  assignedDate: string;
  createdAt: string;
  status?: string; // Only for deliverable type
  role?: string; // Only for shoot type
  shootId?: string;
  deliverableId?: string;
}

export interface TaskData {
  id: string; // employeeId
  tasks: TaskItem[];
}

export interface ProcessedTask {
  taskId: string;
  type: "shoot" | "deliverable";
  name: string;
  status: string;
  employeeId: string;
  projectId: string;
  deliveryDate: string;
  createdAt: string;
}

export interface TransactionEmployee {
  amount: number;
  employeeId: string;
  employeeName: string;
  timestamp: Date;
}

export interface TransactionItem {
  amount: number;
  date: string;
  type: "credit" | "debit";
  status: string;
  purpose: string;
  timestamp: Date;
  debitType?: string;
  mode?: string;
  utr?: string;
  employees?: TransactionEmployee[];
}

export interface TransactionData {
  id?: string;
  date: string;
  items: TransactionItem[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserData {
  id?: string;
  name: string;
  email: string;
  empId: string;
  phone: string;
  address: string;
  salary: string;
  userType: string;
  profileStatus: string;
  createdAt?: string;
}

// Type guard for attendance employee
function isAttendanceEmployee(obj: unknown): obj is AttendanceEmployee {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "employeeId" in obj &&
    "status" in obj &&
    ((obj as AttendanceEmployee).status === "present" ||
      (obj as AttendanceEmployee).status === "absent" ||
      (obj as AttendanceEmployee).status === "half-day")
  );
}

export async function fetchAttendanceData(filter: string): Promise<AttendanceData[]> {
  try {
    const attendanceRef = collection(db, "attendance");
    const snapshot = await getDocs(attendanceRef);

    const attendanceData: AttendanceData[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const date = doc.id;
      const employees = data.employees || {};

      let present = 0;
      let absent = 0;
      let halfDay = 0;

      Object.values(employees).forEach((employee: unknown) => {
        if (isAttendanceEmployee(employee)) {
          if (employee.status === "present") present++;
          else if (employee.status === "absent") absent++;
          else if (employee.status === "half-day") halfDay++;
        }
      });

      attendanceData.push({
        date,
        day: data.day || "",
        present,
        absent,
        halfDay,
        total: present + absent + halfDay,
        employees,
      });
    });

    attendanceData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (filter !== "all-time") {
      return filterDocumentsByDateId(attendanceData, filter, "date") as AttendanceData[];
    }

    return attendanceData;
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    return [];
  }
}

export const fetchClientsData = async (filter: string): Promise<ClientData[]> => {
  try {
    const clientsRef = collection(db, "clients");
    const snapshot = await getDocs(clientsRef);

    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return filterDocumentsByDate(docs, filter) as ClientData[];
  } catch (error) {
    console.error("Error fetching clients data:", error);
    return [];
  }
};

export const fetchDeliverablesData = async (): Promise<DeliverableData[]> => {
  try {
    const deliverablesRef = collection(db, "deliverables");
    const snapshot = await getDocs(deliverablesRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as DeliverableData[];
  } catch (error) {
    console.error("Error fetching deliverables data:", error);
    return [];
  }
};

export const fetchEnquiryData = async (filter: string): Promise<EnquiryData[]> => {
  try {
    const enquiryRef = collection(db, "enquiry");
    const snapshot = await getDocs(enquiryRef);

    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return filterDocumentsByDate(docs, filter) as EnquiryData[];
  } catch (error) {
    console.error("Error fetching enquiry data:", error);
    return [];
  }
};

export const fetchEventsData = async (): Promise<EventData[]> => {
  try {
    const eventsRef = collection(db, "events");
    const snapshot = await getDocs(eventsRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as EventData[];
  } catch (error) {
    console.error("Error fetching events data:", error);
    return [];
  }
};

export const fetchPackagesData = async (): Promise<PackageData[]> => {
  try {
    const packagesRef = collection(db, "packages");
    const snapshot = await getDocs(packagesRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PackageData[];
  } catch (error) {
    console.error("Error fetching packages data:", error);
    return [];
  }
};

export const fetchProjectsData = async (filter: string): Promise<ProjectData[]> => {
  try {
    const projectsRef = collection(db, "projects");
    const snapshot = await getDocs(projectsRef);

    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return filterDocumentsByDate(docs, filter) as ProjectData[];
  } catch (error) {
    console.error("Error fetching projects data:", error);
    return [];
  }
};

export const fetchSalaryData = async (filter: string): Promise<SalaryData[]> => {
  try {
    const salaryRef = collection(db, "salary");
    const snapshot = await getDocs(salaryRef);

    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      date: doc.id,
      ...doc.data(),
    }));

    return filterDocumentsByDateId(docs, filter, "date") as SalaryData[];
  } catch (error) {
    console.error("Error fetching salary data:", error);
    return [];
  }
};

export const fetchShootsData = async (): Promise<ShootData[]> => {
  try {
    const shootsRef = collection(db, "shoots");
    const snapshot = await getDocs(shootsRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ShootData[];
  } catch (error) {
    console.error("Error fetching shoots data:", error);
    return [];
  }
};

export const fetchTasksData = async (filter: string): Promise<ProcessedTask[]> => {
  try {
    const tasksRef = collection(db, "task");
    const snapshot = await getDocs(tasksRef);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allTasks: ProcessedTask[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as TaskData;
      const tasksArray = data.tasks || [];

      tasksArray.forEach((task: TaskItem) => {
        let status: string;

        if (task.type === "shoot") {
          // For shoot tasks: calculate status from deliveryDate
          const deliveryDate = new Date(task.deliveryDate);
          deliveryDate.setHours(0, 0, 0, 0);

          if (deliveryDate < today) {
            status = "Completed";
          } else if (deliveryDate.getTime() === today.getTime()) {
            status = "Today";
          } else {
            status = "Upcoming";
          }
        } else {
          // For deliverable tasks: use status field directly
          status = task.status || "Pending";
        }

        allTasks.push({
          taskId: task.taskId,
          type: task.type,
          name: task.name,
          status,
          employeeId: task.employeeId,
          projectId: task.projectId,
          deliveryDate: task.deliveryDate,
          createdAt: task.createdAt,
        });
      });
    });

    // Filter by createdAt date
    if (filter === "all-time") {
      return allTasks;
    }

    const { start, end } = getDateRange(filter);

    return allTasks.filter((task) => {
      const createdAt = new Date(task.createdAt);
      if (isNaN(createdAt.getTime())) return false;
      return createdAt >= start && createdAt <= end;
    });
  } catch (error) {
    console.error("Error fetching tasks data:", error);
    return [];
  }
};

export const fetchTransactionsData = async (filter: string): Promise<TransactionData[]> => {
  try {
    const transactionsRef = collection(db, "transactions");
    const snapshot = await getDocs(transactionsRef);

    const docs = snapshot.docs.map((doc) => ({
      id: doc.id,
      date: doc.id,
      ...doc.data(),
    }));

    return filterDocumentsByDateId(docs, filter, "date") as TransactionData[];
  } catch (error) {
    console.error("Error fetching transactions data:", error);
    return [];
  }
};

export const fetchDues = async () => {
  try {
    const projectRef = collection(db, "projects");
    const snapshot = await getDocs(projectRef);
    const projects = snapshot.docs.filter((data) => !['Cancelled', 'Not Confirmed'].includes(data.data().status)).map((doc) => doc.data());
    const totalDue = projects.reduce((sum, project) => {
      const credit =
        project.transactionHistory?.reduce(
          (s: number, trx: { type: string; amount: number }) =>
            trx.type === "credit" ? s + trx.amount : s,
          0
        ) ?? 0;

      return sum + ((project.finalAmount ?? 0) - credit);
    }, 0);
    return totalDue;
  } catch (error) {
    console.error("Error fetching project data:", error);
    return 0;
  }
};

export const fetchUsersData = async (): Promise<UserData[]> => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserData[];
  } catch (error) {
    console.error("Error fetching users data:", error);
    return [];
  }
};
