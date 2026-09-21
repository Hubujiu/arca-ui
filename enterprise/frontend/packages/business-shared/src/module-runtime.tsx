import type { ModuleContext, MountedModule } from "@enterprise/module-sdk";
import { StrictMode, createContext, useContext, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { configureSession } from "./shared/api/client";
import { ThemeProvider } from "./shared/design-system/ThemeProvider";
import { WorkspaceUIProvider } from "./shared/design-system/workspace/WorkspaceUI";
import { ToastProvider } from "./shared/toast";

const ModuleContextBridge = createContext<ModuleContext | null>(null);

export function useModuleContext() {
  const value = useContext(ModuleContextBridge);
  if (!value) throw new Error("ModuleContext is only available inside a mounted enterprise module");
  return value;
}

export function ModuleProviders({ context, children }: { context: ModuleContext; children: ReactNode }) {
  const moduleId = context.basePath.split("/").at(-1) || "module";
  const compact = context.settings[`${moduleId}.display.compact`] === true || context.settings["portal.density"] === "compact";
  const reduceMotion = context.settings["portal.reduceMotion"] === true;
  return (
    <StrictMode>
      <ThemeProvider forceReducedMotion={reduceMotion}>
        <ToastProvider>
          <BrowserRouter basename={context.basePath}>
            <ModuleContextBridge.Provider value={context}>
              <WorkspaceUIProvider>
                <div className="enterprise-module" data-enterprise-module={moduleId} data-density={compact ? "compact" : "comfortable"} data-motion={reduceMotion ? "reduced" : "system"}>{children}</div>
              </WorkspaceUIProvider>
            </ModuleContextBridge.Provider>
          </BrowserRouter>
        </ToastProvider>
      </ThemeProvider>
    </StrictMode>
  );
}

export function mountEnterpriseModule(element: HTMLElement, context: ModuleContext, app: ReactNode): MountedModule {
  configureSession(context);
  const root = createRoot(element);
  root.render(<ModuleProviders context={context}>{app}</ModuleProviders>);
  return {
    unmount() {
      root.unmount();
      configureSession(undefined);
    },
  };
}
