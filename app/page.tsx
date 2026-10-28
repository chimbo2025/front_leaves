"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LeaveProvider } from "@/components/leave/leave-context";
import { LeaveSidebar } from "@/components/leave/leave-sidebar";
import { LeaveHeader } from "@/components/leave/leave-header";

function ViewSkeleton() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
    </div>
  );
}

// Views load on demand (client-only) so the first paint ships only the shell —
// dashboard, sidebar, header — instead of all 14 view modules up front.
const lazy = <T extends object>(
  loader: () => Promise<{ default: React.ComponentType<T> }>,
) => dynamic(loader, { ssr: false, loading: () => <ViewSkeleton /> });

const DashboardView = lazy<{ onNavigate: (v: string) => void }>(() =>
  import("@/components/leave/views/dashboard").then((m) => ({
    default: m.DashboardView,
  })),
);
const MyLeaveView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/myleave").then((m) => ({
    default: m.MyLeaveView,
  })),
);
const RequestsView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/requests").then((m) => ({
    default: m.RequestsView,
  })),
);
const ApprovalsView = lazy<{ onNavigate: (v: string) => void }>(() =>
  import("@/components/leave/views/approvals").then((m) => ({
    default: m.ApprovalsView,
  })),
);
const WorkflowsView = lazy<{ onNavigate: (v: string) => void }>(() =>
  import("@/components/leave/views/workflows").then((m) => ({
    default: m.WorkflowsView,
  })),
);
const CalendarView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/calendar").then((m) => ({
    default: m.CalendarView,
  })),
);
const PoliciesView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/policies").then((m) => ({
    default: m.PoliciesView,
  })),
);
const DocumentsView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/documents").then((m) => ({
    default: m.DocumentsView,
  })),
);
const DelegationsView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/delegations").then((m) => ({
    default: m.DelegationsView,
  })),
);
const CasesView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/cases").then((m) => ({
    default: m.CasesView,
  })),
);
const NotificationsView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/notifications").then((m) => ({
    default: m.NotificationsView,
  })),
);
const ReportsView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/reports").then((m) => ({
    default: m.ReportsView,
  })),
);
const AuditView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/audit").then((m) => ({
    default: m.AuditView,
  })),
);
const SettingsView = lazy<Record<string, never>>(() =>
  import("@/components/leave/views/settings").then((m) => ({
    default: m.SettingsView,
  })),
);

type View =
  | "dashboard"
  | "myleave"
  | "requests"
  | "approvals"
  | "calendar"
  | "policies"
  | "workflows"
  | "documents"
  | "delegations"
  | "cases"
  | "notifications"
  | "reports"
  | "audit"
  | "settings";

function ViewRenderer({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (v: string) => void;
}) {
  switch (view) {
    case "dashboard":
      return <DashboardView onNavigate={onNavigate} />;
    case "myleave":
      return <MyLeaveView />;
    case "requests":
      return <RequestsView />;
    case "approvals":
      return <ApprovalsView onNavigate={onNavigate} />;
    case "workflows":
      return <WorkflowsView onNavigate={onNavigate} />;
    case "calendar":
      return <CalendarView />;
    case "policies":
      return <PoliciesView />;
    case "documents":
      return <DocumentsView />;
    case "delegations":
      return <DelegationsView />;
    case "cases":
      return <CasesView />;
    case "notifications":
      return <NotificationsView />;
    case "reports":
      return <ReportsView />;
    case "audit":
      return <AuditView />;
    case "settings":
      return <SettingsView />;
    default:
      return <DashboardView onNavigate={onNavigate} />;
  }
}

function LeaveApp() {
  const [activeView, setActiveView] = useState<View>("dashboard");
  const navigate = (v: string) => setActiveView(v as View);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <LeaveSidebar activeView={activeView} onNavigate={navigate} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <LeaveHeader onNavigate={navigate} />
        <main className="flex-1 overflow-y-auto">
          <ViewRenderer view={activeView} onNavigate={navigate} />
        </main>
      </div>
    </div>
  );
}

export default function LeaveManagementApp() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "guest") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    );
  }

  return (
    <LeaveProvider>
      <LeaveApp />
    </LeaveProvider>
  );
}
