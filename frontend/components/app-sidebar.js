import * as React from "react"
import { useRouter } from "next/router"
import Link from "next/link"
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  Map,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
  LayoutDashboard,
  UserCheck,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/lib/auth"
import { apiGet } from "@/lib/api"

export function AppSidebar(props) {
  const { user } = useAuth()
  const router = useRouter()
  const [projectsList, setProjectsList] = React.useState([])

  React.useEffect(() => {
    let cancelled = false
    apiGet("/api/v1/projects?per_page=10")
      .catch(() => [])
      .then((data) => {
        if (cancelled) return
        const pList = Array.isArray(data) ? data : []
        setProjectsList(pList)
      })
    return () => { cancelled = true }
  }, [])

  const navMain = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: SquareTerminal,
      isActive: router.pathname === "/dashboard" || router.pathname === "/assigned",
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Assigned to me", url: "/assigned" },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        { title: "Genesis", url: "#" },
        { title: "Explorer", url: "#" },
        { title: "Quantum", url: "#" },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        { title: "Introduction", url: "#" },
        { title: "Get Started", url: "#" },
        { title: "Tutorials", url: "#" },
        { title: "Changelog", url: "#" },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        { title: "General", url: "#" },
        { title: "Team", url: "#" },
        { title: "Billing", url: "#" },
        { title: "Limits", url: "#" },
      ],
    },
  ]

  const navSecondary = [
    { title: "Support", url: "/#faq", icon: LifeBuoy },
    { title: "Feedback", url: "#", icon: Send },
  ]

  const icons = [Frame, PieChart, Map]
  const projects = projectsList.slice(0, 5).map((p, idx) => ({
    name: p.name,
    url: `/projects/${p.id}`,
    icon: icons[idx % icons.length],
  }))

  const userData = {
    name: user?.name || "User",
    email: user?.email || "",
    avatar: "/avatars/default.jpg",
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">TaskFlow</span>
                  <span className="truncate text-xs">Enterprise</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
