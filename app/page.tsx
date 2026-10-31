import {
  HeroCard,
  RecentArticles,
} from "@/components/home/CoreCards";
import { FeaturedProject } from "@/components/home/FeaturedProject";
import {
  ActivityFeed,
  AboutCard,
  Goals,
  TechStack,
} from "@/components/home/ProfileCards";
import { getPosts, getProject, getProjects, getTimeline } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [posts, projects, timeline] = await Promise.all([
    getPosts(3),
    getProjects(3),
    getTimeline(),
  ]);
  const selected =
    projects.data.find((project) => project.featured) ?? projects.data[0];
  const featured = selected ? await getProject(selected.slug) : null;
  return (
    <div className="home-bento">
      <HeroCard articles={posts.meta.total} projects={projects.meta.total} />
      <RecentArticles articles={posts.data} />
      <FeaturedProject project={featured} />
      <TechStack />
      <Goals />
      <ActivityFeed
        articles={posts.data}
        projects={projects.data}
        timeline={timeline}
      />
      <AboutCard />
    </div>
  );
}
