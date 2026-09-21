import type { ModuleContext, MountedModule } from "@enterprise/module-sdk";
import { mountEnterpriseModule } from "@/module-runtime";
import { WorkflowApp } from "./App";
import "@/styles.css";

export function mount(element: HTMLElement, context: ModuleContext): MountedModule {
  return mountEnterpriseModule(element, context, <WorkflowApp />);
}
