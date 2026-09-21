# 企业管理系统组件源码

此目录保存企业管理系统 frontend 的完整可编辑源码，包括门户页面、共享 UI、SVG 图标和业务组件。`frontend/packages/ui` 为通用白灰组件；五个 `frontend/modules` 为业务组件。所有相对目录保持原样，支持追踪引用和复用。

源码来源：企业管理系统项目。更新方式：在该项目运行 `pnpm sync:components`。`manifest.json` 保存每个文件 SHA-256，自动测试检查镜像完整性。库内 `/enterprise` 页面展示通用门户组件。
