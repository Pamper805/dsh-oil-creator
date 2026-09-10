import type { WorkspaceId } from "@deepseek-ai/dsh-client-runtime/client";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { startSidebarSession } from "../src/client/sidebar/startSession.ts";

describe("侧栏新建会话版本兼容", () => {
  it("侧栏入口统一经过兼容适配器", () => {
    const source = readFileSync(new URL("../src/client/index.tsx", import.meta.url), "utf8");
    expect(source).toContain("startSidebarSession(ctx, workspaceId)");
    expect(source).not.toContain("ctx.workspaces.startSession(");
  });

  it("新版 workspaces 不再提供导航时，使用 uiWorkspace 并保留方法接收者", () => {
    const navigation = {
      current: "old-session",
      startSession() { this.current = "blank-session"; },
    };
    const services = new Map<string, unknown>([
      ["uiWorkspace", navigation],
      ["workspaces", { list: {} }],
    ]);

    startSidebarSession({ get: (name) => services.get(name) });

    expect(navigation.current).toBe("blank-session");
  });

  it("旧版仍可新建会话，并透传指定工作区", () => {
    const startSession = vi.fn();
    const ctx = { get: (name: string) => name === "workspaces" ? { startSession } : undefined };
    const workspaceId = "workspace-a" as WorkspaceId;

    startSidebarSession(ctx, workspaceId);
    startSidebarSession(ctx);

    expect(startSession.mock.calls).toEqual([[workspaceId], [undefined]]);
  });

  it("优先新版服务，且不在调用失败后重复创建", () => {
    const legacy = vi.fn();
    const failure = new Error("navigation failed");
    const modern = vi.fn(() => { throw failure; });
    const ctx = { get: (name: string) => ({ startSession: name === "uiWorkspace" ? modern : legacy }) };

    expect(() => startSidebarSession(ctx)).toThrow(failure);
    expect(modern).toHaveBeenCalledOnce();
    expect(legacy).not.toHaveBeenCalled();
  });

  it("服务未就绪时明确失败，后续点击重新解析服务", () => {
    const services = new Map<string, unknown>([["workspaces", {}]]);
    const ctx = { get: (name: string) => services.get(name) };
    expect(() => startSidebarSession(ctx)).toThrow("新建会话服务尚未就绪");

    const startSession = vi.fn();
    services.set("uiWorkspace", { startSession });
    startSidebarSession(ctx);
    expect(startSession).toHaveBeenCalledOnce();
  });
});
