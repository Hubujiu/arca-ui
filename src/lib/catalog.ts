export const CATEGORIES = [
  { id: "actions", title: "按钮与操作", description: "按压、提交、删除、分裂与溢出操作" },
  { id: "forms", title: "表单输入", description: "输入、验证码、计数、开关与签名" },
  { id: "selection", title: "选择与筛选", description: "下拉、搜索与多选" },
  { id: "navigation", title: "导航与菜单", description: "标签、树、侧栏与面包屑" },
  { id: "feedback", title: "反馈与状态", description: "通知、加载、骨架、404 与动效文字" },
  { id: "avatars", title: "头像与身份", description: "在线状态、消息角标与头像组" },
  { id: "data", title: "数据展示", description: "表格、图表、看板、卡片与流程图" },
  { id: "overlays", title: "布局与覆盖层", description: "弹层、上传与滚动" },
] as const

export type CategoryId = (typeof CATEGORIES)[number]["id"]

export type CatalogItem = {
  slug: string
  title: string
  description: string
  category: CategoryId
  collectedAs: string
}

export const CATALOG: CatalogItem[] = [
  { slug: "press-button", title: "按压按钮", description: "按下缩放、悬停抬起的基础操作按钮。", category: "actions", collectedAs: "@beui/button-base" },
  { slug: "stateful-button", title: "提交按钮", description: "空闲 / 加载 / 成功 / 失败状态切换的提交按钮。", category: "actions", collectedAs: "@beui/button-stateful" },
  { slug: "shimmer-button", title: "光泽按钮", description: "悬停时扫过一层高光的点击按钮。", category: "actions", collectedAs: "watermelon/shimmer-button" },
  { slug: "delete-button", title: "删除按钮", description: "二次确认后执行删除的危险操作按钮。", category: "actions", collectedAs: "rare-ui/delete-button" },
  { slug: "split-button", title: "分裂按钮", description: "主操作与二级选项菜单组合的分裂按钮。", category: "actions", collectedAs: "watermelon/split-button" },
  { slug: "overflow-actions", title: "隐藏按钮", description: "空间不足时把次要操作收到溢出菜单。", category: "actions", collectedAs: "@beui/overflow-actions" },
  { slug: "time-undo", title: "倒计时删除", description: "删除后给出倒计时撤销窗口。", category: "actions", collectedAs: "watermelon/time-undo-action" },
  { slug: "bloom-menu", title: "自由创建", description: "从中心绽开的多方向创建菜单。", category: "actions", collectedAs: "@beui/bloom-menu" },
  { slug: "plus-menu", title: "展开菜单", description: "加号按钮形态展开成菜单面板。", category: "actions", collectedAs: "transitions.dev plus-menu" },
  { slug: "otp-input", title: "数字验证码", description: "分段数字验证码输入。", category: "forms", collectedAs: "rare-ui/otp-input" },
  { slug: "floating-input", title: "浮动输入框", description: "标签上浮的文本输入。", category: "forms", collectedAs: "watermelon/floating-input" },
  { slug: "adaptive-stepper", title: "数值加减", description: "自适应宽度的数值步进器。", category: "forms", collectedAs: "@beui/adaptive-stepper" },
  { slug: "counter-stepper", title: "计数器", description: "带弹簧动效的加减计数器。", category: "forms", collectedAs: "watermelon/stepper" },
  { slug: "switch-control", title: "功能开关", description: "弹簧滑块与按压缩放的功能开关。", category: "forms", collectedAs: "@beui/switch" },
  { slug: "spring-toggle", title: "弹性开关", description: "带回弹轨迹的开关动效。", category: "forms", collectedAs: "transitions.dev toggle" },
  { slug: "signature-pad", title: "电子签名", description: "画布手写签名并支持清除。", category: "forms", collectedAs: "watermelon/draw-signature" },
  { slug: "range-slider", title: "数值滑杆", description: "行内进度与数值调节滑杆。", category: "forms", collectedAs: "@beui/range-slider-inline" },
  { slug: "datetime-picker", title: "日期选择器", description: "日期时间组合选择。", category: "forms", collectedAs: "@spectrumui/datetime-picker-demo" },
  { slug: "swap-form", title: "切换表单", description: "登录/注册一类表单的形态切换动画。", category: "forms", collectedAs: "watermelon/swap-form" },
  { slug: "select-menu", title: "下拉选择", description: "面板从触发器弹开并分离的下拉选择。", category: "selection", collectedAs: "@beui/select" },
  { slug: "search-combobox", title: "下拉搜索", description: "可搜索、分组过滤的组合框。", category: "selection", collectedAs: "@beui/combobox" },
  { slug: "multi-select", title: "多条件筛选", description: "多选标签式筛选器。", category: "selection", collectedAs: "@beui/multi-select" },
  { slug: "tabs-bar", title: "标签切换", description: "指示条在标签间滑动的 Tab 栏。", category: "navigation", collectedAs: "@beui/tabs" },
  { slug: "morphing-tabs", title: "变形标签页", description: "指示条在标签间滑动变形。", category: "navigation", collectedAs: "@beui/morphing-tabs" },
  { slug: "context-menu", title: "右键菜单", description: "指针原点展开的上下文菜单。", category: "navigation", collectedAs: "@beui/context-menu" },
  { slug: "icon-popover", title: "图标菜单", description: "图标触发的 gooey 弹出菜单。", category: "navigation", collectedAs: "@beui/popover" },
  { slug: "icon-tooltip", title: "图标提示", description: "悬停或聚焦时出现的图标提示。", category: "navigation", collectedAs: "@beui/tooltip" },
  { slug: "breadcrumb-nav", title: "菜单层级", description: "路径层级面包屑，含折叠与下拉。", category: "navigation", collectedAs: "watermelon/breadcrumb-3, breadcrumb-8" },
  { slug: "macos-sidebar", title: "侧边栏", description: "可展开/收起的 macOS 风格侧栏。", category: "navigation", collectedAs: "watermelon/macos-sidebar" },
  { slug: "tree-menu", title: "树形菜单", description: "可展开的层级导航树。", category: "navigation", collectedAs: "watermelon/tree-menu" },
  { slug: "file-tree", title: "文件树", description: "文件夹/文件层级树。", category: "navigation", collectedAs: "@beui/file-tree" },
  { slug: "command-search", title: "命令搜索", description: "分组结果的命令面板搜索。", category: "navigation", collectedAs: "@spectrumui/command-search" },
  { slug: "notification-bell", title: "通知铃铛", description: "带未读数与摆动动效的通知铃。", category: "feedback", collectedAs: "rare-ui/notification-bell" },
  { slug: "toast-stack", title: "通知弹窗", description: "堆叠进入的动态 Toast。", category: "feedback", collectedAs: "@beui/animated-toast-stack" },
  { slug: "animated-badge", title: "图标状态", description: "图标徽标的状态切换动效。", category: "feedback", collectedAs: "@beui/animated-badge" },
  { slug: "loader", title: "加载图标", description: "多形态加载指示器。", category: "feedback", collectedAs: "@beui/loader" },
  { slug: "skeleton-reveal", title: "内容渐显", description: "骨架屏脉冲后揭示真实内容。", category: "feedback", collectedAs: "transitions.dev skeleton-reveal" },
  { slug: "not-found", title: "404", description: "故障风 404 空状态。", category: "feedback", collectedAs: "@beui/not-found-glitch" },
  { slug: "text-scramble", title: "文字切换", description: "乱码解码式文字下一项切换。", category: "feedback", collectedAs: "@beui/text-scramble" },
  { slug: "digit-swap", title: "数字隐藏", description: "数字翻牌隐藏与显示。", category: "feedback", collectedAs: "@beui/digit-swap" },
  { slug: "avatar-status", title: "在线头像", description: "单人头像展示他人在线状态。", category: "avatars", collectedAs: "watermelon/avatar-7" },
  { slug: "avatar-inbox", title: "消息头像", description: "自己看自己的头像未读消息。", category: "avatars", collectedAs: "watermelon/avatar-9" },
  { slug: "avatar-group", title: "并排头像", description: "多人头像并列与溢出计数。", category: "avatars", collectedAs: "watermelon/avatar-14,18,19" },
  { slug: "avatar-hover-group", title: "悬浮头像组", description: "悬停时相邻头像抬起缩放。", category: "avatars", collectedAs: "transitions.dev avatar group" },
  { slug: "avatar-stack", title: "头像堆叠", description: "交错堆叠的头像条。", category: "avatars", collectedAs: "@spectrumui/avatar-stack" },
  { slug: "data-table", title: "数据表格", description: "分页、排序、拖动换列与拉宽的数据表。", category: "data", collectedAs: "@beui/table · reui.io/data-grid" },
  { slug: "metric-charts", title: "仪表图表", description: "柱状、面积、环形与雷达仪表图。", category: "data", collectedAs: "reui.io/components/chart" },
  { slug: "animated-chart", title: "动效图表", description: "SVG 路径描边动画图表。", category: "data", collectedAs: "@spectrumui/animated-SVG-chart" },
  { slug: "kanban-board", title: "看板卡片", description: "分列拖放的视图看板。", category: "data", collectedAs: "@spectrumui/kanbanboard" },
  { slug: "feature-cards", title: "功能卡片", description: "统计、视图与内容卡片组合。", category: "data", collectedAs: "shadcn card" },
  { slug: "flowchart", title: "流程图", description: "可拖拽节点的流程画布。", category: "data", collectedAs: "beautifului/flowchart" },
  { slug: "expand-details", title: "详情展开", description: "行内展开查看更多详情。", category: "data", collectedAs: "watermelon/expand-details" },
  { slug: "morph-modal", title: "窗口展开", description: "从触发器中心变形展开的模态框。", category: "overlays", collectedAs: "@beui/center-morph-modal" },
  { slug: "attachment-upload", title: "文件上传", description: "拖放附件上传与预览。", category: "overlays", collectedAs: "@beui/attachment-upload" },
  { slug: "smooth-scroll", title: "滚动动画", description: "区块进入视口时的平滑滚动揭示。", category: "overlays", collectedAs: "@beui/smooth-scroll" },
  { slug: "inline-disclosure", title: "隐藏操作", description: "行内展开的次级操作菜单。", category: "overlays", collectedAs: "watermelon/inline-disclosure-menu" },
]

export function getCatalogItem(slug: string) {
  return CATALOG.find((item) => item.slug === slug)
}

export function getCatalogByCategory(category: CategoryId) {
  return CATALOG.filter((item) => item.category === category)
}
