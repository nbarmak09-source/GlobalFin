"use client";

import EquitiesDashboard from "@/components/equities/EquitiesDashboard";

/** Legacy `/ecm` route — same equities hub as `/equities`. */
export default function EcmPage() {
  return <EquitiesDashboard view="overview" />;
}
