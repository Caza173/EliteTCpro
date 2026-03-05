import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon, Bell, Palette, Shield } from "lucide-react";

export default function Settings() {
  const sections = [
    {
      icon: Bell,
      title: "Notifications",
      description: "Email and deadline notification preferences will be available in a future update.",
    },
    {
      icon: Palette,
      title: "Appearance",
      description: "Theme customization and branding options coming soon.",
    },
    {
      icon: Shield,
      title: "Permissions",
      description: "Team member roles and access control will be added in a future version.",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Application preferences and configuration.</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="shadow-sm border-gray-100">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
                  <p className="text-sm text-gray-500">{section.description}</p>
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}