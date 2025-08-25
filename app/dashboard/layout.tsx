import type React from "react"
import AppSidebar from "@/components/dashboard/AppSidebar"
import { SidebarProvider } from "@/hooks/use-sidebar"
import Image from "next/image"
import logo from "@/app/images/logo-og.png"
import MobileSidebarControls from "@/components/MobileSidebarControls"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex bg-gray-50">
        <AppSidebar />
        <main className="flex-1 transition-all duration-300 ease-in-out lg:ml-[90px] xl:ml-[290px]">
          <MobileSidebarControls />
          
          <div className="p-4 mx-auto max-w-7xl md:p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
