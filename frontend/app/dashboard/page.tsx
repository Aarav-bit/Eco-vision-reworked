"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain, PlusCircle, Compass, BarChart3,
  Leaf, Recycle, ArrowRight, Award, FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { getUserStats, type UserStats } from "@/lib/api";

const quickActions = [
  { title: "AI Prediction",  description: "Upload an image to identify waste type", icon: Brain,      href: "/dashboard/predict",     color: "bg-blue-500/10  text-blue-600  dark:text-blue-400",  glow: "group-hover:shadow-blue-500/20"  },
  { title: "Create Post",    description: "Share your recycling journey",            icon: PlusCircle, href: "/dashboard/create-post", color: "bg-green-500/10 text-green-600 dark:text-green-400", glow: "group-hover:shadow-green-500/20" },
  { title: "Explore Feed",   description: "Discover community posts",                icon: Compass,    href: "/dashboard/explore",     color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", glow: "group-hover:shadow-amber-500/20" },
  { title: "View Stats",     description: "Track your environmental impact",         icon: BarChart3,  href: "/dashboard/stats",       color: "bg-cyan-500/10  text-cyan-600  dark:text-cyan-400",  glow: "group-hover:shadow-cyan-500/20"  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    getUserStats().then(setStats).catch(() => {}).finally(() => setStatsLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* ── Welcome banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-8">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <Leaf className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Welcome back, {user?.name?.split(" ")[0] || "User"}!
              </h1>
              <p className="text-muted-foreground">Ready to make a positive impact today?</p>
            </div>
          </div>

          {/* Live stats strip */}
          <div className="grid grid-cols-3 gap-3">
            {statsLoading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)
            ) : (
              <>
                {[
                  { label: "Posts",     value: stats?.total_posts ?? 0,                    icon: FileText, cls: "text-primary"    },
                  { label: "Points",    value: stats?.points ?? 0,                          icon: Award,    cls: "text-amber-500"  },
                  { label: "CO₂ Saved", value: `${stats?.co2_saved?.toFixed(1) ?? "0.0"} kg`, icon: Leaf,  cls: "text-green-500"  },
                ].map((s) => (
                  <div key={s.label}
                    className="rounded-xl bg-background/60 backdrop-blur-sm p-3 text-center
                               transition-all duration-200 hover:bg-background/80 hover:scale-[1.03] hover:shadow-md cursor-default">
                    <p className={`text-xl font-bold ${s.cls}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 mt-0.5">
                      <s.icon className="h-3 w-3" />{s.label}
                    </p>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href} className="group block">
              <div className={`glass-card h-full cursor-pointer transition-all duration-300 active:scale-[0.98] ${action.glow}`}>
                <div className="p-6 pb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.color} mb-3
                                  transition-transform duration-300 group-hover:scale-110`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <p className="font-semibold text-lg">{action.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                </div>
                <div className="px-6 pb-5">
                  <span className="flex items-center gap-2 text-sm text-primary font-medium">
                    Get Started
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Info Cards ── */}
      <div className="grid gap-6 md:grid-cols-2">
        {[
          { icon: Brain,   title: "AI-Powered Detection", desc: "Our AI can identify waste types instantly",
            body: "Upload any image of waste and our machine learning model will classify it, tell you if it's recyclable, and provide disposal instructions." },
          { icon: Recycle, title: "Track Your Impact",    desc: "See how you're helping the environment",
            body: "Every post you create earns points and tracks the CO₂ you've helped save. View your stats to see your contribution to a greener planet." },
        ].map((card) => (
          <div key={card.title} className="glass-card cursor-default p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10
                              transition-transform duration-300 hover:scale-110">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-base">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.desc}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
