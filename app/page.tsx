import { MinimalHome } from "@/components/home/MinimalHome";
import { getPosts, getProjects, getPublicSettingsOrDefaults } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [posts, projects, settings] = await Promise.all([
    getPosts(4),
    getProjects(20),
    getPublicSettingsOrDefaults(),
  ]);
  const selected = [...projects.data].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 2);
  return <MinimalHome articles={posts.data} projects={selected} settings={settings} />;
}
