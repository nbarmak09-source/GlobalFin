import type { Metadata } from "next";
import DashboardView from "@/components/dashboard/DashboardView";

export const metadata: Metadata = {
  title: { absolute: "Dashboard — GlobalFin" },
  description:
    "Major indices, macro data, market performance, and sector-level markets view.",
};

export default function DashboardAliasPage() {
  return <DashboardView />;
}
