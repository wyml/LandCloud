"use client";

import { useEffect } from "react";

export function ViewTracker({ type, id }: { type: "image" | "album"; id: string }) {
  useEffect(() => {
    const key = `landcloud_view_${type}_${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    void fetch("/api/stats", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
  }, [type, id]);
  return null;
}
