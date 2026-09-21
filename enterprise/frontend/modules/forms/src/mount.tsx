import type { ModuleContext, MountedModule } from "@enterprise/module-sdk";
import { mountEnterpriseModule } from "@/module-runtime";
import { FormsApp } from "./App";
import "@/styles.css";

export function mount(element: HTMLElement, context: ModuleContext): MountedModule {
  return mountEnterpriseModule(element, context, <FormsApp />);
}
