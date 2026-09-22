import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import EfferdSidebar from "../components/dashboard/EfferdSidebar";
import EfferdCharts from "../components/dashboard/EfferdCharts";
import RequireAuth from "../components/RequireAuth";
import { apiGet, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTaskFlowSocket } from "../hooks/useSocket";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.projects)) return data.projects;
  return [];
}

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { user } = useAuth();
  const { lastEvent } = useTaskFlowSocket();
  const [projects, setProjects] = useState([]);
  const [assigned, setAssigned] = useState([]);

  const load = useCallback(async () => {
    try {
      const [projData, assignedData] = await Promise.all([
        apiGet("/api/v1/projects"),
        apiGet("/api/v1/assigned").catch(() => []),
      ]);
      setProjects(normalizeList(projData));
      setAssigned(normalizeList(assignedData));
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live hint: any socket event triggers a lightweight refetch.
  useEffect(() => {
    if (!lastEvent) return;
    load();
  }, [lastEvent?._receivedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="efferd-layout">
      <Head><title>Dashboard — TaskFlow</title></Head>
      <EfferdSidebar />
      <main className="efferd-main efferd-dark-main">
        <EfferdCharts
          userName={user?.name}
          projectCount={projects.length}
          assignedCount={assigned.length}
        />
      </main>
    </div>
  );
}
