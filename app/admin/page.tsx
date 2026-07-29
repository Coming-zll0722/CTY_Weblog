import type { Metadata } from "next";
import { AdminApp } from "@/components/AdminApp";

export const metadata: Metadata = {
  title: "管理后台",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="section-shell page-shell admin-page">
      <header className="page-heading">
        <p className="eyebrow">ADMIN / 管理后台</p>
        <h1>内容工作台</h1>
        <p>管理文章、项目与媒体；会话、角色和写操作均由服务端验证。</p>
      </header>
      <AdminApp />
    </div>
  );
}
