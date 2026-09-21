import type { ModuleManifest } from './types';
const definitions = [
  ['knowledge', '知识库', '文档、空间、搜索与知识管理', 'book', ['knowledge.access']],
  ['forms', '表单与应用', '表单设计、数据记录与业务应用', 'form', []],
  ['workflow', '流程与审批', '流程设计、待办审批与运行记录', 'workflow', []],
  ['identity', '组织与身份', '成员、组织与身份管理', 'users', []],
  ['authorization', '授权管理', '权限模板、授权策略与审计', 'shield', []],
] as const;
export const defaultManifests: ModuleManifest[] = definitions.map(([id, title, description, icon, permissions]) => ({
  id, title, description, icon, permissions: [...permissions], version: '1.0.0', basePath: `/m/${id}`,
  entry: `/modules/${id}/entry.js`, styles: [`/modules/${id}/style.css`],
  settings: [{ id: 'display', title: `${title}显示`, fields: [{ key: 'compact', label: '紧凑显示', type: 'boolean', defaultValue: false }] }],
}));

/** Development ports are explicitly trusted by the local portal configuration. */
export function developmentManifests(hostname = '127.0.0.1'): ModuleManifest[] {
  return defaultManifests.map((manifest, index) => ({ ...manifest, entry: `http://${hostname}:${5174 + index}/src/mount.tsx`, styles: [] }));
}
