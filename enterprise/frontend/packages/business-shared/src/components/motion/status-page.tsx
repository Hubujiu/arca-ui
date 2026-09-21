"use client";

import type { ReactNode } from "react";
import { NotFoundGlitch } from "@/components/motion/not-found/glitch";

const COPY: Record<number, { title: string; description: string }> = {
  403: { title: "权限不足", description: "当前账号不能查看这项内容。" },
  404: { title: "找不到这份内容", description: "它可能不存在、已下架，或不在你的访问范围内。" },
  409: { title: "内容已变化", description: "请刷新后再试。" },
  500: { title: "服务出了点问题", description: "门户或知识库暂时无法完成这次请求。" },
  502: { title: "无法连接", description: "连不上门户或知识库服务。" },
  503: { title: "服务暂时不可用", description: "依赖服务暂时不可用，请稍后重试。" },
};

export function ErrorState({
  status = 404,
  title,
  children,
  portal = false,
}: {
  status?: number;
  title?: string;
  children?: ReactNode;
  portal?: boolean;
}) {
  const preset = COPY[status] || COPY[500];
  return (
    <NotFoundGlitch
      code={String(status || 500)}
      title={title || preset.title}
      description={typeof children === "string" ? children : preset.description}
      homeHref={portal ? "/" : "/knowledge"}
      homeLabel={portal ? "返回门户" : "返回知识库"}
      browseHref={portal ? "" : "/search"}
      browseLabel="去搜索"
    />
  );
}
