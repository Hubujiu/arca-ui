import type { Capabilities, ModuleManifest, SettingsContribution } from './types';

const idPattern = /^[a-z][a-z0-9-]*$/;
export class ModuleRegistry {
  private readonly entries: ModuleManifest[];
  constructor(manifests: readonly ModuleManifest[]) {
    const ids = new Set<string>();
    const paths = new Set<string>();
    const settings = new Set<string>();
    this.entries = manifests.map(manifest => {
      if (!idPattern.test(manifest.id) || ids.has(manifest.id)) throw new Error(`Invalid or duplicate module id: ${manifest.id}`);
      if (manifest.basePath !== `/m/${manifest.id}` || paths.has(manifest.basePath)) throw new Error(`Invalid module path: ${manifest.basePath}`);
      if (!manifest.title || !manifest.version || !manifest.entry) throw new Error(`Incomplete module: ${manifest.id}`);
      ids.add(manifest.id); paths.add(manifest.basePath);
      for (const contribution of manifest.settings ?? []) {
        const key = `${manifest.id}.${contribution.id}`;
        if (!idPattern.test(contribution.id) || settings.has(key)) throw new Error(`Duplicate/invalid settings: ${key}`);
        settings.add(key);
        const fields = new Set<string>();
        for (const field of contribution.fields) {
          if (!idPattern.test(field.key) || fields.has(field.key)) throw new Error(`Duplicate/invalid setting: ${field.key}`);
          fields.add(field.key);
          if (field.type === 'boolean') {
            if (typeof field.defaultValue !== 'boolean') throw new Error('Boolean setting needs a boolean default');
          } else if (field.type === 'select') {
            if (!field.options?.length || !field.options.some(option => option.value === field.defaultValue)) throw new Error('Select setting needs a valid default');
          } else throw new Error('Unsupported setting type');
          if (/color|colour|accent|theme/i.test(field.key)) throw new Error('Custom color settings are not supported');
        }
      }
      return structuredClone(manifest);
    });
  }
  list(): ModuleManifest[] { return structuredClone(this.entries); }
  get(id: string): ModuleManifest | undefined { const value = this.entries.find(entry => entry.id === id); return value && structuredClone(value); }
  resolve(path: string): ModuleManifest | undefined {
    const pathname = path.split(/[?#]/)[0];
    const entry = this.entries.find(item => pathname === item.basePath || pathname.startsWith(`${item.basePath}/`));
    return entry && structuredClone(entry);
  }
  accessible(capabilities: Capabilities): ModuleManifest[] {
    return this.list().filter(entry => (entry.permissions ?? []).every(permission =>
      !capabilities.directDenyKeys.includes(permission) && (capabilities.root || capabilities.effectivePermissionKeys.includes(permission))));
  }
  settings(): (SettingsContribution & { moduleId: string })[] {
    return this.list().flatMap(entry => (entry.settings ?? []).map(settings => ({ ...settings, moduleId: entry.id })));
  }
}

/** Preferences are scoped to a subject and constrained by declared fields. */
export function normalizeSettings(registry: ModuleRegistry, input: Record<string, unknown>): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {};
  for (const group of registry.settings()) for (const field of group.fields) {
    const key = `${group.moduleId}.${group.id}.${field.key}`;
    const value = input[key];
    result[key] = field.type === 'boolean' && typeof value === 'boolean' ? value :
      field.type === 'select' && typeof value === 'string' && field.options?.some(option => option.value === value) ? value : field.defaultValue;
  }
  return result;
}
