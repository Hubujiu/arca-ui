import { useState } from "react";
import { Link } from "react-router-dom";
import * as Dropdown from "@/components/overlays/dropdown";
import { ArrowLeft, ArrowRight, Bell, ChevronDown, Layers, PanelRight, Play, X } from "@/shared/icons/catalog";
import { AppModal, Button, Input, FieldSelect } from "@/shared/ui";
import { Drawer } from "@/components/motion/drawer";
import { Tooltip } from "@/components/motion/tooltip";
import { BouncyAccordion } from "@/components/motion/bouncy-accordion";
import { toast } from "@/shared/toast";
import { useMotionPreference } from "@/lib/motion-preference";
import { MotionRegion } from "./PageMotion";

/** A working catalogue, using the same components as product screens. No API writes. */
export function MotionShowcase() {
  const [replay, setReplay] = useState(0);
  const [tab, setTab] = useState("fields");
  const [note, setNote] = useState("");
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const [choice, setChoice] = useState("one");
  const reduced = useMotionPreference();
  const panel = "rounded-control border border-border bg-card p-5 sm:p-6";
  return <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-7">
    <header data-dw-enter="header" className="flex flex-wrap items-end justify-between gap-4">
      <div><Link to="/forms/manage" className="mb-3 inline-flex items-center gap-2 text-body text-muted-foreground"><ArrowLeft size={16} />返回表单管理</Link><h1 className="text-heading font-semibold">动效组件示例</h1><p className="mt-2 max-w-2xl text-body leading-6 text-muted-foreground">页面建立层次，浮层解释来源，状态变化保留上下文。这里与业务页面使用同一套组件。</p></div>
      <span role="status" className="rounded-full bg-accent px-4 py-2 text-body text-accent-foreground">{reduced ? "减少动效已开启" : "标准动效"}</span>
    </header>
    <section className={panel} aria-labelledby="motion-cards-title">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 id="motion-cards-title" className="font-medium">内容入场</h2><p className="mt-1 text-caption text-muted-foreground">首屏最多六项错峰 24ms；后续内容立即可用。</p></div><Button size="sm" variant="outline" onClick={() => setReplay(value => value + 1)}><Play size={15} />重播卡片入场</Button></div>
      <MotionRegion kind="stagger" motionKey={replay} data-testid="motion-cards" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {["知识空间", "表单设计", "审批流程", "组织成员", "数据视图", "应用设置"].map((label, index) => <div key={label} className="rounded-card border border-border bg-background p-4"><span className="mb-3 inline-flex rounded-control bg-accent p-2 text-accent-foreground"><Layers size={18} aria-hidden="true" /></span><h3 className="text-body font-medium">{label}</h3><p className="mt-1 text-caption text-muted-foreground">{index === 0 ? "即时建立阅读起点" : "内容稳定，不逐字播放"}</p></div>)}
      </MotionRegion>
    </section>
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <section className={panel} aria-labelledby="motion-overlays-title">
        <h2 id="motion-overlays-title" className="font-medium">浮层与方向</h2><p className="mb-4 mt-1 text-caption leading-5 text-muted-foreground">弹窗浅缩放、抽屉从边缘进入、菜单从按钮展开。</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModal(true)}>打开示例弹窗</Button>
          <Button variant="accent" onClick={() => { setSide("right"); setDrawer(true); }}><PanelRight size={16} />右侧抽屉</Button>
          <Button variant="outline" onClick={() => { setSide("left"); setDrawer(true); }}>左侧抽屉</Button>
          <Dropdown.Root><Dropdown.Trigger asChild><Button variant="outline">示例操作菜单<ChevronDown size={16} /></Button></Dropdown.Trigger><Dropdown.Portal><Dropdown.Content data-dw-surface="menu" align="start" sideOffset={8} className="p-1.5">
            {["复制示例", "查看说明"].map(label => <Dropdown.Item key={label} onSelect={() => toast.success(label)} >{label}</Dropdown.Item>)}</Dropdown.Content></Dropdown.Portal></Dropdown.Root>
          <Tooltip content="悬停稍作停留后出现；键盘焦点也可查看。"><Button variant="ghost" aria-label="示例提示说明">提示说明</Button></Tooltip>
          <Button variant="ghost" onClick={() => toast.success("示例操作已完成", "反馈即时出现，不等待页面入场结束。") }><Bell size={16} />显示成功提示</Button>
        </div>
        <div className="mt-5"><FieldSelect label="下拉选择示例" value={choice} onChange={setChoice} options={[{ value: "one", label: "第一项" }, { value: "two", label: "第二项" }]} /></div>
      </section>
      <section className={panel} aria-labelledby="motion-state-title">
        <h2 id="motion-state-title" className="mb-4 font-medium">状态切换，不重建表单</h2>
        <div role="group" aria-label="示例面板切换" className="mb-4 flex gap-2">
          <Button size="sm" variant={tab === "fields" ? "primary" : "ghost"} aria-pressed={tab === "fields"} onClick={() => setTab("fields")}>字段示例</Button>
          <Button size="sm" variant={tab === "rules" ? "primary" : "ghost"} aria-pressed={tab === "rules"} onClick={() => setTab("rules")}>规则示例</Button>
        </div>
        <MotionRegion motionKey={tab} kind="inspector" data-testid="motion-inspector" className="space-y-4">
          <p className="text-body text-muted-foreground">{tab === "fields" ? "配置字段，输入内容会保留。" : "配置规则，输入内容仍然保留。"}</p>
          <Input id="motion-note" label="保留输入示例" value={note} onChange={setNote} />
        </MotionRegion>
        <div className="mt-5"><BouncyAccordion items={[{ id: "rule", title: "展开示例说明", description: "高度展开与箭头旋转同步。收起更快，不增加回弹或模糊。" }]} /></div>
      </section>
    </div>
    <Link to="/forms/manage" className="inline-flex items-center gap-2 self-start text-body text-primary">查看业务页面转场<ArrowRight size={16} /></Link>
    <AppModal open={modal} onOpenChange={setModal} title="动效示例弹窗" description="背景先建立遮罩，内容以短位移和浅缩放进入。" footer={<Button onClick={() => setModal(false)}>完成示例</Button>}><Input id="motion-modal-note" label="弹窗输入示例" value={note} onChange={setNote} /></AppModal>
    <Drawer open={drawer} onOpenChange={setDrawer} side={side} ariaLabel="动效示例抽屉">
      <div className="flex items-center justify-between border-b border-border p-5"><h2 className="font-medium">侧边配置</h2><Button variant="ghost" size="icon" aria-label="关闭示例抽屉" onClick={() => setDrawer(false)}><X size={18} /></Button></div>
      <div className="space-y-5 p-5"><p className="text-body leading-6 text-muted-foreground">始终从对应边缘进入。保留键盘焦点约束，退出后回到启动按钮。</p><Input id="motion-drawer-note" label="抽屉输入示例" value={note} onChange={setNote} /><Button variant="accent" onClick={() => setDrawer(false)}>完成侧边配置</Button></div>
    </Drawer>
  </main>;
}
