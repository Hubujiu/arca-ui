import { useEffect, useState } from "react";
import { api, ApiError } from "@/shared/api/client";
import type { PortalCapabilities } from "./portal";

// Administration has its own identity check and never loads the knowledge catalog.
export function useAdminAccess() {
  const [me, setMe] = useState<{ id: string; systemRole: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const refresh=() => setAttempt(n => n+1);
    window.addEventListener("focus",refresh);
    window.addEventListener("portal-permissions-changed",refresh);
    return () => { window.removeEventListener("focus",refresh); window.removeEventListener("portal-permissions-changed",refresh); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    api<PortalCapabilities>("/api/v1/me/capabilities", "GET", undefined, controller.signal)
      .then(c => setMe({ id: "portal", systemRole: c.root ? "ADMIN" : "USER" }))
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setMe(undefined);
          setError(caught instanceof ApiError ? caught : new ApiError(503, "无法确认管理权限"));
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return { me, loading, error, retry: () => setAttempt(n => n + 1) };
}
