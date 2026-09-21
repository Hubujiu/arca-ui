import { createModuleConfig } from "../../packages/business-shared/build/module-config";
export default createModuleConfig({ id: "workflow", port: 5176, moduleRoot: import.meta.dirname, knowledgeApi: true });
