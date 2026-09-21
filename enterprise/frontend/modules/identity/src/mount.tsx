import type { ModuleContext, MountedModule } from "@enterprise/module-sdk";
import { mountEnterpriseModule } from "@/module-runtime";
import { IdentityApp } from "./App";
import "@/styles.css";
import "@/access/module-styles.css";

export function mount(element: HTMLElement, context: ModuleContext): MountedModule {
  return mountEnterpriseModule(element, context, <IdentityApp />);
}
