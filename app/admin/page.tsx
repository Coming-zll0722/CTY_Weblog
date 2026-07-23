import type { Metadata } from "next";

export const metadata: Metadata = { title: "管理后台", robots: { index: false, follow: false } };

export default function AdminPage() {
  return (
    <div className="section-shell page-shell admin-page">
      <header className="page-heading">
        <p className="eyebrow">ADMIN / 管理后台</p>
        <h1>内容工作台</h1>
        <p>该入口在生产环境应由 FastAPI 会话和管理员角色保护。当前页面展示已规划的管理模块，不接受真实凭据。</p>
      </header>
      <div className="admin-demo">
        <aside>
          <b>管理菜单</b>
          {["概览", "文章", "项目", "分类与标签", "媒体", "网站设置", "备份与日志"].map((item, index) => <span className={index === 0 ? "active" : ""} key={item}>{item}</span>)}
        </aside>
        <section>
          <div className="admin-head"><div><span>内容概览</span><h2>下午好，林序</h2></div><button>新建文章</button></div>
          <div className="admin-stats"><div><span>已发布文章</span><strong>06</strong></div><div><span>草稿</span><strong>03</strong></div><div><span>项目</span><strong>06</strong></div></div>
          <div className="admin-table">
            <div className="admin-table-head"><span>最近内容</span><span>状态</span><span>更新时间</span></div>
            {[
              ["从协议分析到自动化执行", "已发布", "07-21"],
              ["FPGA 学习笔记：时序意识", "草稿", "07-19"],
              ["通信数据帧构造工具复盘", "草稿", "07-16"],
            ].map((row) => <div key={row[0]}><b>{row[0]}</b><span>{row[1]}</span><time>{row[2]}</time></div>)}
          </div>
        </section>
      </div>
    </div>
  );
}
