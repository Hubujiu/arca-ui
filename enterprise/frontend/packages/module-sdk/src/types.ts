export type SettingValue = string | boolean;
export interface SettingField {
  key: string;
  label: string;
  type: 'boolean' | 'select';
  defaultValue: SettingValue;
  options?: { label: string; value: string }[];
}
export interface SettingsContribution {
  id: string;
  title: string;
  description?: string;
  fields: SettingField[];
}
export interface ModuleManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  icon: string;
  basePath: string;
  entry: string;
  styles?: string[];
  permissions?: string[];
  settings?: SettingsContribution[];
}
export interface ModuleContext {
  basePath: string;
  getAccessToken(): string | null;
  ensureSession?(signal?: AbortSignal): Promise<void>;
  refreshSession?(signal?: AbortSignal): Promise<void>;
  onUnauthorized(): void;
  navigate(path: string): void;
  settings: Record<string, unknown>;
}
export interface MountedModule { unmount(): void }
export interface MicrofrontendModule {
  mount(element: HTMLElement, context: ModuleContext): MountedModule | Promise<MountedModule>;
}
export interface Capabilities { root: boolean; effectivePermissionKeys: string[]; directDenyKeys: string[] }
