import { createModuleConfig } from "../../packages/business-shared/build/module-config";
export default createModuleConfig({ id: "forms", port: 5175, moduleRoot: import.meta.dirname, knowledgeApi: true });
