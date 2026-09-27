import type { Metadata } from "next";
import { DashboardOverview } from "@/components/dashboard-overview";

export const metadata: Metadata = {
  title: "Visão geral",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
