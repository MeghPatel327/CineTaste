import {
  Film,
  ListTodo,
  LayoutDashboard,
  Compass,
  Star,
  Activity,
  BarChart3,
  Database,
  Users,
  Shield,
  Search,
  MonitorSmartphone,
  Lock,
  Sparkles,
  LucideIcon,
  Code,
  Box,
  Cloud,
  Globe,
  Cpu,
  Layers,
  FileType2,
} from "lucide-react";

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export interface TechStack {
  name: string;
  role: string;
  url?: string;
  icon?: LucideIcon;
}

export interface ProjectStat {
  label: string;
  value: string;
}

export interface Developer {
  name: string;
  role: string;
  bio: string;
  github: string;
  linkedin: string;
  portfolio?: string;
  avatarUrl?: string;
}

export interface Acknowledgement {
  name: string;
  description: string;
  url: string;
}

export const aboutConfig = {
  app: {
    name: "CineTaste",
    tagline: "Your Personal Movie & Series Companion",
    version: "v1.2.0",
    description: "CineTaste is a premium movie and TV series tracking application designed to learn your unique taste. Instead of relying on generic social feeds, it uses a deterministic recommendation engine tailored specifically to your viewing history, ratings, and preferences. It offers a smart watch queue, advanced analytics, and seamless discovery powered by TMDB.",
    whyBuilt: "Traditional watchlist apps are often cluttered with social features or rely on generic popularity metrics. CineTaste was built to provide a focused, personalized experience that respects your time and genuinely understands what you like to watch.",
  },
  developer: {
    name: "Megh Patel",
    role: "Creator & Lead Developer",
    bio: "Passionate about building beautiful, functional, and user-centric web applications. Movie enthusiast and continuous learner.",
    github: "https://github.com/MeghPatel327",
    linkedin: "https://www.linkedin.com/in/megh-patel-405500326/",
    avatarUrl: "/branding/circle_logo.png",
  } as Developer,
  features: [
    {
      title: "Personalized Engine",
      description: "A smart recommendation system that adapts to your ratings, genres, and directors.",
      icon: Sparkles,
    },
    {
      title: "Smart Watch Queue",
      description: "Keep track of what to watch next with an intuitive priority queue.",
      icon: ListTodo,
    },
    {
      title: "Advanced Dashboard",
      description: "Get insights into your viewing habits with beautiful, detailed analytics.",
      icon: LayoutDashboard,
    },
    {
      title: "Discover Content",
      description: "Explore the vast TMDB library with advanced filtering and search.",
      icon: Compass,
    },
    {
      title: "Taste Profile",
      description: "An evolving profile that captures your unique cinematic preferences.",
      icon: Star,
    },
    {
      title: "Fast Search",
      description: "Lightning-fast, accurate search functionality across movies and series.",
      icon: Search,
    },
    {
      title: "Multi-user Support",
      description: "Create profiles for family members and keep watchlists separate.",
      icon: Users,
    },
    {
      title: "Admin Panel",
      description: "Manage users, view system metrics, and control the application.",
      icon: Shield,
    },
    {
      title: "Responsive Design",
      description: "A seamless experience across desktop, tablet, and mobile devices.",
      icon: MonitorSmartphone,
    },
    {
      title: "Secure Auth",
      description: "Industry-standard security for your personal data and account.",
      icon: Lock,
    },
  ] as Feature[],
  techStack: [
    { name: "Next.js 15", role: "React Framework", icon: Globe },
    { name: "React 19", role: "UI Library", icon: Code },
    { name: "TypeScript", role: "Type Safety", icon: FileType2 },
    { name: "Tailwind CSS v4", role: "Styling", icon: Layers },
    { name: "Baserow", role: "Database / Backend", icon: Database },
    { name: "TMDB API", role: "Content Data", icon: Box },
    { name: "Vercel", role: "Hosting & Deployment", icon: Cloud },
    { name: "OpenRouter", role: "Future AI Integration", icon: Cpu },
  ] as TechStack[],
  stats: [
    { label: "App Version", value: "1.2.0" },
    { label: "Engine Version", value: "3.1" },
    { label: "Database", value: "Baserow" },
    { label: "Framework", value: "Next.js" },
    { label: "Last Updated", value: "Aug 2026" },
  ] as ProjectStat[],
  acknowledgements: [
    { name: "TMDB", description: "The Movie Database for comprehensive movie and TV show data.", url: "https://www.themoviedb.org/" },
    { name: "Baserow", description: "Open source no-code database providing the backend infrastructure.", url: "https://baserow.io/" },
    { name: "Vercel", description: "Platform for frontend frameworks and static sites.", url: "https://vercel.com/" },
  ] as Acknowledgement[],
  footer: {
    copyright: `© ${new Date().getFullYear()} CineTaste`,
    message: "Made with ❤️ for movie lovers.",
  }
};
