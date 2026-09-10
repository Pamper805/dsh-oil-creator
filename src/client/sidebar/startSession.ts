import type { WorkspaceId } from "@deepseek-ai/dsh-client-runtime/client";

interface SessionNavigation {
  startSession: (workspaceId?: WorkspaceId) => void;
}

/** 0.1.2-rc.1 将导航迁入 uiWorkspace；0.1.1-rc.2 仍由 workspaces 提供。 */
export function startSidebarSession(
  ctx: { get: (name: string) => unknown },
  workspaceId?: WorkspaceId,
): void {
  // 点击时解析，避免保存尚未就绪或热更新前的服务实例。
  for (const name of ["uiWorkspace", "workspaces"]) {
    const navigation = ctx.get(name) as Partial<SessionNavigation> | undefined;
    if (typeof navigation?.startSession === "function") {
      navigation.startSession(workspaceId);
      return;
    }
  }
  throw new Error("新建会话服务尚未就绪，请刷新页面后重试。");
}
