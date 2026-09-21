import { ModuleRegistry } from './registry';
import type { MicrofrontendModule, ModuleContext, MountedModule } from './types';

export type ModuleImporter = (url: string) => Promise<MicrofrontendModule>;
/** ESM remotes are executable code. Only explicitly trusted origins are accepted. */
export class MicrofrontendLoader {
  private generation = 0;
  private active?: MountedModule;
  private styles: HTMLLinkElement[] = [];
  private readonly cache = new Map<string, Promise<MicrofrontendModule>>();
  constructor(private readonly registry: ModuleRegistry, private readonly options: {
    origin?: string; allowedOrigins?: string[]; importer?: ModuleImporter;
  } = {}) {}
  private trustedUrl(value: string): string {
    const origin = this.options.origin ?? window.location.origin;
    const url = new URL(value, origin);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
        ![origin, ...(this.options.allowedOrigins ?? [])].includes(url.origin)) throw new Error('Untrusted module asset URL');
    return url.href;
  }
  async mount(id: string, element: HTMLElement, context: ModuleContext): Promise<MountedModule> {
    this.unmount();
    const generation = this.generation;
    const manifest = this.registry.get(id);
    if (!manifest) throw new Error(`Unknown module: ${id}`);
    const url = this.trustedUrl(manifest.entry);
    const styleUrls = (manifest.styles ?? []).map(style => this.trustedUrl(style));
    let remote = this.cache.get(url);
    if (!remote) {
      const importer = this.options.importer ?? (url => import(/* @vite-ignore */ url));
      remote = importer(url).catch(error => { this.cache.delete(url); throw error; });
      this.cache.set(url, remote);
    }
    const module = await remote;
    if (generation !== this.generation) return { unmount() {} };
    if (typeof module.mount !== 'function') throw new Error(`Module ${id} has no mount function`);
    this.styles = styleUrls.map(href => {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
      link.dataset.enterpriseModule = id; document.head.append(link); return link;
    });
    let mounted: MountedModule;
    try {
      mounted = await module.mount(element, { ...context, basePath: manifest.basePath });
      if (!mounted || typeof mounted.unmount !== 'function') throw new Error(`Module ${id} did not return an unmount handler`);
    } catch (error) { if (generation === this.generation) this.unmount(); throw error; }
    if (generation !== this.generation) { mounted.unmount(); return { unmount() {} }; }
    this.active = mounted;
    return { unmount: () => { if (generation === this.generation) this.unmount(); } };
  }
  unmount(): void {
    this.generation++;
    const active = this.active; this.active = undefined;
    try { active?.unmount(); } finally { this.styles.forEach(style => style.remove()); this.styles = []; }
  }
}
