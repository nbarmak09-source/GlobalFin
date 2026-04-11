"use client";

import { useEffect } from "react";

function applyTickerClass() {
  if (typeof window === "undefined") return;
  const v = localStorage.getItem("gcm_ticker_tape");
  const hidden = v === "false";
  document.documentElement.classList.toggle("gcm-hide-ticker", hidden);
}

export default function TickerTapePreference() {
  useEffect(() => {
    applyTickerClass();
    function onStorage() {
      applyTickerClass();
    }
    function onCustom() {
      applyTickerClass();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("gcm-prefs-change", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("gcm-prefs-change", onCustom);
    };
  }, []);

  return null;
}
