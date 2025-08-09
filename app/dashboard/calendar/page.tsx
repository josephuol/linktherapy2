import CalendarPage from "@/components/dashboard/CalendarPage";
import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "LinkTherapy - Calendar",
    description: "Schedule and manage your therapy sessions.",
};

export default function Calendar() {
    return (
        <div>
            <h1 className="text-2xl font-semibold mb-4">My Calendar</h1>
            <CalendarPage />
        </div>
    );
}


