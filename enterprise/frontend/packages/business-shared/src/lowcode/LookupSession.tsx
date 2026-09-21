import { collectReferenceLookupQueries, referenceLookupQuery } from "./field-reference-context";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { api } from "@/shared/api/client";
import { resolveFieldRules, type TableSchema, type ValueContext } from "./field-model";
import { lookupKey, type LookupQuery, type LookupResolver } from "./relations";
import { collectDefaultLookupQueries } from "./field-defaults";

type LookupResult = { value?: unknown; error?: string };
export type LookupSession = { resolve: LookupResolver; pending: (query: LookupQuery) => boolean; retry: (query: LookupQuery) => void };
export const LookupContext = createContext<LookupSession | undefined>(undefined);

/** One request registry per form, shared by child renderers and keyed by target identity. */
export function useLookupSession(schema: TableSchema, values: Record<string, unknown>, context: ValueContext, enabled: boolean, onResolvingChange?: (busy: boolean) => void, initializeDefaults = false): LookupSession {
  const inherited = useContext(LookupContext), cache = useRef(new Map<string, LookupResult>()), flights = useRef(new Map<string, AbortController>());
  const [, redraw] = useState(0), [retry, setRetry] = useState(0), callback = useRef(onResolvingChange); callback.current = onResolvingChange;
  const resolve: LookupResolver = (field, data, fields) => {
    const query = referenceLookupQuery(field, data, fields), result = query ? cache.current.get(lookupKey(query)) : undefined;
    if (result?.error) throw new Error(result.error);
    return result?.value;
  };
  const prepared = !inherited && enabled ? resolveFieldRules(schema, values, { ...context, lookupResolver: resolve }).values : {};
  const queries = !inherited && enabled ? collectReferenceLookupQueries(schema, prepared, context) : new Map<string, LookupQuery>();
  if (!inherited && enabled && initializeDefaults) for (const [key, query] of collectDefaultLookupQueries(schema, prepared)) queries.set(key, query);
  const key = JSON.stringify([...queries.keys()].sort()), busy = [...queries.keys()].some((key) => !cache.current.has(key));
  useEffect(() => {
    if (inherited) return;
    const active = new Set(queries.keys());
    for (const [key, flight] of flights.current) if (!active.has(key)) { flight.abort(); flights.current.delete(key); }
    for (const key of cache.current.keys()) if (!active.has(key)) cache.current.delete(key);
    for (const [key, query] of queries) {
      if (cache.current.has(key) || flights.current.has(key)) continue;
      const abort = new AbortController(); flights.current.set(key, abort);
      api<{ value: unknown }>("/api/v1/lc/relation-records/lookup", "POST", query, abort.signal).then((result) => {
        if (!abort.signal.aborted && flights.current.get(key) === abort) { cache.current.set(key, { value: result.value }); flights.current.delete(key); redraw((value) => value + 1); }
      }).catch((error) => {
        if (!abort.signal.aborted && flights.current.get(key) === abort) { cache.current.set(key, { error: error instanceof Error ? error.message : "查询失败，请重试" }); flights.current.delete(key); redraw((value) => value + 1); }
      });
    }
  }, [key, enabled, inherited, retry]);
  useEffect(() => { if (!inherited) callback.current?.(busy); }, [busy, inherited]);
  useEffect(() => () => { for (const flight of flights.current.values()) flight.abort(); flights.current.clear(); if (!inherited) callback.current?.(false); }, [inherited]);
  return inherited ?? { resolve, pending: (query) => !cache.current.has(lookupKey(query)), retry: (query) => { cache.current.delete(lookupKey(query)); setRetry((value) => value + 1); } };
}
