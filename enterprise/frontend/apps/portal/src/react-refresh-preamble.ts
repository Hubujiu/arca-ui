declare global {
  interface Window {
    $RefreshReg$?: (type: unknown, id: string) => void;
    $RefreshSig$?: () => (type: unknown) => unknown;
    __vite_plugin_react_preamble_installed__?: boolean;
  }
}

/** Cross-origin Vite remotes share this host-installed React Refresh hook in development. */
export async function installReactRefreshPreamble() {
  if (!import.meta.env.DEV || window.__vite_plugin_react_preamble_installed__) return;
  const refreshRuntimeUrl = "/@react-refresh";
  const runtime = await import(/* @vite-ignore */ refreshRuntimeUrl) as {
    default: { injectIntoGlobalHook(target: Window): void };
  };
  runtime.default.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => undefined;
  window.$RefreshSig$ = () => type => type;
  window.__vite_plugin_react_preamble_installed__ = true;
}

export {};
