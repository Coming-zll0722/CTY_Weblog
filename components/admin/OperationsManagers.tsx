"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { adminRequest } from "@/components/admin/shared";

type ManagerProps = {
  csrf: string;
  onError: (message: string) => void;
};

export function SecurityManager({
  csrf,
  onError,
  onChanged,
}: ManagerProps & {
  onChanged: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmation) {
      onError("两次输入的新密码不一致。");
      return;
    }
    setBusy(true);
    try {
      await adminRequest<void>(
        "/auth/change-password",
        {
          method: "POST",
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        },
        csrf,
      );
      onError("");
      onChanged();
    } catch (caught) {
      onError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="admin-editor compact-editor" onSubmit={changePassword}>
      <h3>修改管理员密码</h3>
      <p>修改后所有已有会话立即失效，需要使用新密码重新登录。</p>
      <label>当前密码<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} minLength={8} required /></label>
      <label>新密码<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} required /></label>
      <label>确认新密码<input type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} required /></label>
      <button className="button primary" disabled={busy}>{busy ? "正在修改…" : "修改密码"}</button>
    </form>
  );
}

type AuditLog = {
  id: string;
  action: string;
  created_at: string;
};

type BackupRecord = {
  id: string;
  status: string;
  storage_key: string | null;
  created_at: string;
};

function fetchOperations() {
  return Promise.all([
    adminRequest<{ views: number; visitors: number }>("/admin/analytics/overview"),
    adminRequest<AuditLog[]>("/admin/operation-logs"),
    adminRequest<BackupRecord[]>("/admin/backups"),
    adminRequest<Record<string, unknown>>("/admin/settings"),
  ]);
}

export function OperationsManager({ csrf, onError }: ManagerProps) {
  const [analytics, setAnalytics] = useState({ views: 0, visitors: 0 });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [settings, setSettings] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const settingValue = (key: string, fallback = "") => {
    try {
      const value = JSON.parse(settings)[key];
      return Array.isArray(value)
        ? value.join(", ")
        : typeof value === "string"
          ? value
          : fallback;
    } catch {
      return fallback;
    }
  };

  const setSettingValue = (key: string, value: string | string[]) => {
    try {
      setSettings(JSON.stringify({ ...JSON.parse(settings), [key]: value }, null, 2));
    } catch {
      onError("请先修复高级设置中的 JSON 格式。");
    }
  };

  const applyOperations = useCallback((
    [analyticsData, logItems, backupItems, settingValues]:
    Awaited<ReturnType<typeof fetchOperations>>,
  ) => {
    setAnalytics(analyticsData);
    setLogs(logItems);
    setBackups(backupItems);
    setSettings(JSON.stringify(settingValues, null, 2));
  }, []);

  const load = useCallback(async () => {
    try {
      applyOperations(await fetchOperations());
    } catch (caught) {
      onError((caught as Error).message);
    }
  }, [applyOperations, onError]);

  useEffect(() => {
    let active = true;
    fetchOperations()
      .then((values) => {
        if (active) applyOperations(values);
      })
      .catch((caught) => {
        if (active) onError((caught as Error).message);
      });
    return () => {
      active = false;
    };
  }, [applyOperations, onError]);

  const saveSettings = async () => {
    try {
      const values = JSON.parse(settings);
      await adminRequest(
        "/admin/settings",
        { method: "PATCH", body: JSON.stringify({ values }) },
        csrf,
      );
      await load();
    } catch (caught) {
      onError(
        caught instanceof SyntaxError
          ? "设置 JSON 格式无效。"
          : (caught as Error).message,
      );
    }
  };

  const backup = async () => {
    setBusy(true);
    try {
      await adminRequest(
        "/admin/backups",
        { method: "POST", body: JSON.stringify({ mode: "full" }) },
        csrf,
      );
      await load();
    } catch (caught) {
      onError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const restore = async (backupId: string) => {
    const expected = `RESTORE ${backupId}`;
    const confirmation = window.prompt(
      `恢复只允许写入服务器配置的隔离数据库，不会覆盖当前生产库。仅超级管理员可执行。\n请输入：${expected}`,
    );
    if (confirmation === null) return;
    setRestoring(backupId);
    try {
      await adminRequest(
        `/admin/backups/${backupId}/restore`,
        {
          method: "POST",
          body: JSON.stringify({ confirmation }),
        },
        csrf,
      );
      await load();
      onError("");
    } catch (caught) {
      onError((caught as Error).message);
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="operations-stack">
      <div className="admin-stats">
        <div><span>访问量</span><strong>{analytics.views}</strong></div>
        <div><span>匿名访客</span><strong>{analytics.visitors}</strong></div>
        <div><span>操作记录</span><strong>{logs.length}</strong></div>
      </div>
      <section className="admin-editor">
        <h3>网站与 SEO 设置</h3>
        <p>这里的公开信息会直接用于网站页眉、页脚、联系入口和搜索引擎元数据。</p>
        <label>站点名称<input value={settingValue("public.site_name", "从头越.log")} onChange={(change) => setSettingValue("public.site_name", change.target.value)} /></label>
        <label>作者名称<input value={settingValue("public.author_name", "林序")} onChange={(change) => setSettingValue("public.author_name", change.target.value)} /></label>
        <label>品牌缩写<input maxLength={6} value={settingValue("public.brand_mark", "LOG")} onChange={(change) => setSettingValue("public.brand_mark", change.target.value)} /></label>
        <label>站点简介<textarea rows={3} value={settingValue("public.site_description", "记录技术实践、项目开发与持续学习。")} onChange={(change) => setSettingValue("public.site_description", change.target.value)} /></label>
        <label>SEO 描述<textarea rows={3} value={settingValue("public.seo_description", "嵌入式软件测试工程师的技术博客。")} onChange={(change) => setSettingValue("public.seo_description", change.target.value)} /></label>
        <label>SEO 关键词（逗号分隔）<input value={settingValue("public.seo_keywords", "嵌入式软件测试, 自动化测试")} onChange={(change) => setSettingValue("public.seo_keywords", change.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
        <label>联系邮箱<input type="email" placeholder="从服务器环境或公开设置填写" value={settingValue("public.contact_email")} onChange={(change) => setSettingValue("public.contact_email", change.target.value)} /></label>
        <label>GitHub 网址<input type="url" placeholder="https://github.com/你的用户名" value={settingValue("public.github_url")} onChange={(change) => setSettingValue("public.github_url", change.target.value)} /></label>
        <label>页脚说明<input value={settingValue("public.footer_note", "内容经过脱敏处理")} onChange={(change) => setSettingValue("public.footer_note", change.target.value)} /></label>
        <details>
          <summary>高级 JSON 设置</summary>
          <textarea rows={12} aria-label="高级 JSON 设置" value={settings} onChange={(change) => setSettings(change.target.value)} spellCheck={false} />
        </details>
        <button className="button primary" onClick={saveSettings}>保存设置</button>
      </section>
      <section>
        <div className="admin-list-head">
          <h3>数据库备份</h3>
          <button onClick={backup} disabled={busy}>{busy ? "备份中…" : "创建备份"}</button>
        </div>
        <div className="management-list">
          {backups.map((item) => (
            <div key={item.id}>
              <span><b>{item.status}</b><small>{item.storage_key ?? item.created_at}</small></span>
              {item.status === "completed" ? (
                <button disabled={restoring === item.id} onClick={() => restore(item.id)}>
                  {restoring === item.id ? "恢复中…" : "恢复"}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h3>最近操作</h3>
        <div className="management-list">
          {logs.slice(0, 20).map((item) => (
            <div key={item.id}>
              <span><b>{item.action}</b><small>{item.created_at}</small></span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
