import { useState, type ReactNode } from "react";
import { AlertIcon, ArrowRightIcon, DensityIcon, HomeIcon, ModuleIcon, MotionIcon, PortalIcon, SettingsIcon, UserIcon } from "./icons";
import { Alert, Badge, Button, Card, EmptyState, Field, SelectInput, Spinner, Switch, TextInput } from "./primitives";
import { PageHeader, ProductMark } from "./portal";
import "./styles.css";

const inventory = [
  ["基础操作", "Button · IconButton · Badge"],
  ["表单输入", "Field · TextInput · SelectInput · Switch"],
  ["反馈状态", "Alert · Spinner · EmptyState · Skeleton"],
  ["门户布局", "ProductMark · AppShell · PageHeader"],
  ["门户页面", "LoginPage · HomePage · SettingsPage"],
  ["模块宿主", "ModuleCanvas · FullPageState"],
] as const;

export function EnterpriseGalleryPage() {
  const [enabled, setEnabled] = useState(true);
  const [density, setDensity] = useState("comfortable");
  return <div className="ent-gallery">
    <header className="ent-gallery__topbar"><ProductMark/><a href="/">返回 Arca 组件库 <ArrowRightIcon size={16}/></a></header>
    <main className="ent-gallery__main">
      <PageHeader eyebrow="Enterprise UI" title="企业门户组件" description="固定白灰中性色、统一 SVG 图标，为登录、门户导航、设置和微前端宿主提供完整界面。" action={<Badge>React 19</Badge>}/>
      <section className="ent-gallery__inventory" aria-label="组件清单">{inventory.map(([title, items]) => <Card key={title}><span className="ent-gallery__inventory-icon"><ModuleIcon/></span><h2>{title}</h2><p>{items}</p></Card>)}</section>
      <section className="ent-gallery__section"><div className="ent-gallery__section-heading"><div><p className="ent-kicker">Controls</p><h2>操作与输入</h2></div><Badge>7 个组件</Badge></div><Card className="ent-gallery__controls"><div className="ent-gallery__row"><Button variant="primary" icon={<ArrowRightIcon/>}>主要操作</Button><Button>次要操作</Button><Button variant="ghost">文字操作</Button><Button disabled>不可用</Button></div><div className="ent-gallery__form"><Field label="成员账号" hint="用于登录企业工作台"><TextInput placeholder="name@example.com"/></Field><Field label="显示密度"><SelectInput value={density} onChange={event => setDensity(event.target.value)}><option value="comfortable">舒适</option><option value="compact">紧凑</option></SelectInput></Field></div><Switch checked={enabled} onChange={setEnabled} label="启用模块提醒" description="在有待处理工作时显示提醒。"/></Card></section>
      <section className="ent-gallery__section"><div className="ent-gallery__section-heading"><div><p className="ent-kicker">States</p><h2>状态与反馈</h2></div></div><div className="ent-gallery__states"><Alert title="信息提示">模块会共享当前登录会话和个人设置。</Alert><Alert intent="error" title="载入失败">模块入口暂时无法访问，请稍后重试。</Alert><Card><Spinner label="正在载入业务模块"/></Card><Card><EmptyState icon={<AlertIcon/>} title="暂无数据" description="获得访问权限后，内容会显示在这里。" action={<Button>重新加载</Button>}/></Card></div></section>
      <section className="ent-gallery__section"><div className="ent-gallery__section-heading"><div><p className="ent-kicker">Portal patterns</p><h2>门户模式</h2></div><Badge>响应式</Badge></div><div className="ent-gallery__patterns"><PatternCard icon={<PortalIcon/>} title="登录入口" description="品牌说明、账号表单、注册开关和错误反馈。"/><PatternCard icon={<HomeIcon/>} title="工作首页" description="只展示当前成员有权访问的业务模块。"/><PatternCard icon={<SettingsIcon/>} title="个人设置" description="密度、动效与模块声明的设置贡献。"/><PatternCard icon={<UserIcon/>} title="会话边界" description="账号摘要、退出操作与未授权恢复。"/><PatternCard icon={<DensityIcon/>} title="密度偏好" description="舒适与紧凑两档，不开放颜色编辑。"/><PatternCard icon={<MotionIcon/>} title="动效偏好" description="支持系统减少动态效果设置。"/></div></section>
      <section className="ent-gallery__section"><div className="ent-gallery__section-heading"><div><p className="ent-kicker">Usage</p><h2>使用入口</h2></div></div><Card className="ent-gallery__code"><code>{`import { AppShell, HomePage, SettingsPage } from "@enterprise/ui";\nimport "@enterprise/ui/styles.css";`}</code></Card></section>
    </main>
  </div>;
}

function PatternCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return <Card><span className="ent-gallery__pattern-icon">{icon}</span><h3>{title}</h3><p>{description}</p></Card>;
}
