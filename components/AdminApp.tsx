"use client";

import { FormEvent, useEffect, useState } from "react";
import { PostManager, ProjectManager } from "@/components/admin/ContentManagers";
import {
  MediaManager,
  SiteManager,
  TaxonomyManager,
} from "@/components/admin/ManagementManagers";
import {
  OperationsManager,
  SecurityManager,
} from "@/components/admin/OperationsManagers";
import {
  adminRequest,
  csrfFromCookie,
  type User,
} from "@/components/admin/shared";

type Tab =
  | "overview"
  | "posts"
  | "projects"
  | "taxonomy"
  | "site"
  | "media"
  | "security"
  | "operations";

export function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [csrf, setCsrf] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    adminRequest<User>("/auth/me")
      .then((current) => {
        setUser(current);
        setCsrf(csrfFromCookie());
      })
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div className="admin-loading">正在检查登录状态…</div>;
  }
  if (!user) {
    return (
      <AdminLogin
        onLogin={(loggedInUser, csrfToken) => {
          setUser(loggedInUser);
          setCsrf(csrfToken);
          setError("");
        }}
      />
    );
  }

  const logout = async () => {
    try {
      await adminRequest<void>(
        "/auth/logout",
        { method: "POST" },
        csrf || csrfFromCookie(),
      );
      setUser(null);
      setCsrf("");
    } catch (caught) {
      setError((caught as Error).message);
    }
  };

  const labels: [Tab, string][] = [
    ["overview", "概览"],
    ["posts", "文章"],
    ["projects", "项目"],
    ["taxonomy", "分类与标签"],
    ["site", "时间线与链接"],
    ["media", "媒体"],
    ["security", "账号安全"],
    ["operations", "设置与运维"],
  ];

  return (
    <div className="admin-workspace">
      <aside>
        <b>内容工作台</b>
        {labels.map(([value, label]) => (
          <button
            className={tab === value ? "active" : ""}
            onClick={() => setTab(value)}
            aria-current={tab === value ? "page" : undefined}
            key={value}
          >
            {label}
          </button>
        ))}
        <button className="admin-logout" onClick={logout}>退出登录</button>
      </aside>
      <section>
        <div className="admin-head">
          <div><span>已登录为 {user.email}</span><h2>{user.display_name}</h2></div>
        </div>
        {error ? <p className="admin-error" role="alert">{error}</p> : null}
        {tab === "overview" ? <AdminOverview /> : null}
        {tab === "posts" ? <PostManager csrf={csrf} onError={setError} /> : null}
        {tab === "projects" ? <ProjectManager csrf={csrf} onError={setError} /> : null}
        {tab === "taxonomy" ? <TaxonomyManager csrf={csrf} onError={setError} /> : null}
        {tab === "site" ? <SiteManager csrf={csrf} onError={setError} /> : null}
        {tab === "media" ? <MediaManager csrf={csrf} onError={setError} /> : null}
        {tab === "security" ? (
          <SecurityManager
            csrf={csrf}
            onError={setError}
            onChanged={() => setUser(null)}
          />
        ) : null}
        {tab === "operations" ? (
          <OperationsManager csrf={csrf} onError={setError} />
        ) : null}
      </section>
    </div>
  );
}

function AdminLogin({
  onLogin,
}: {
  onLogin: (user: User, csrf: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const data = await adminRequest<{ user: User; csrf_token: string }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
      onLogin(data.user, data.csrf_token);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admin-login" onSubmit={submit} aria-busy={submitting}>
      <p className="eyebrow">SECURE SIGN IN</p>
      <h2>登录内容工作台</h2>
      <label>
        管理员邮箱
        <input
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>
      <label>
        密码
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>
      {error ? <p className="admin-error" role="alert">{error}</p> : null}
      <button className="button primary" disabled={submitting}>
        {submitting ? "登录中…" : "登录"}
      </button>
    </form>
  );
}

function AdminOverview() {
  return (
    <div className="admin-stats">
      <div><span>内容来源</span><strong>PostgreSQL</strong></div>
      <div><span>发布保护</span><strong>保密检查</strong></div>
      <div><span>编辑保护</span><strong>版本锁</strong></div>
    </div>
  );
}
