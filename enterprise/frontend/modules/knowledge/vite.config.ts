import { createModuleConfig } from "../../packages/business-shared/build/module-config";
export default createModuleConfig({ id: "knowledge", port: 5174, moduleRoot: import.meta.dirname, knowledgeApi: true });
