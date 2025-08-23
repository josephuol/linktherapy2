import type React from "react"
import AppSidebar from "@/components/admin/AppSidebar"
import { SidebarProvider } from "@/hooks/use-sidebar"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex bg-gray-50">
        <AppSidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out lg:ml-[90px] xl:ml-[290px]">
          <div className="p-4 mx-auto max-w-7xl md:p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  )
}


