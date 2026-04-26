"use client";

import { useEffect, useState } from "react";
import { BarChart3, FileText, Award, Leaf, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { getUserStats, ApiError, type UserStats } from "@/lib/api";
import { toast } from "sonner";

export default function StatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try { setStats(await getUserStats()); }
      catch (error) {
        if (error instanceof ApiError)
          toast.error(error.status === 0 ? "Server not reachable" : "Failed to load stats", { description: error.message });
      } finally { setIsLoading(false); }
    }
    fetchStats();
  }, []);

  const currentLevel = stats ? Math.floor(stats.points / 100) + 1 : 1;
  const pointsInLevel = stats ? stats.points % 100 : 0;

  const statCards = stats ? [
    { title: "Total Posts",   value: stats.total_posts,              description: "Recycling posts shared",    icon: FileText, color: "bg-blue-500/10  text-blue-600  dark:text-blue-400",  glow: "hover:shadow-blue-500/15"  },
    { title: "Points Earned", value: stats.points,                   description: "Keep recycling to earn more!", icon: Award, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400", glow: "hover:shadow-amber-500/15" },
    { title: "CO₂ Saved",     value: `${stats.co2_saved.toFixed(1)} kg`, description: "Carbon footprint reduced", icon: Leaf, color: "bg-green-500/10 text-green-600 dark:text-green-400",  glow: "hover:shadow-green-500/15" },
  ] : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
          <BarChart3 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Your Impact</h1>
          <p className="text-muted-foreground">Track your environmental contribution</p>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="pt-6 space-y-3">
              <Skeleton className="h-12 w-12 rounded-xl" />
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {statCards.map((stat) => (
            <div key={stat.title}
              className={`glass-card group relative overflow-hidden cursor-default p-6`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color} mb-4
                               transition-transform duration-300 group-hover:scale-110`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
              <p className="text-sm font-medium text-foreground mt-1">{stat.title}</p>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Level Progress */}
      {!isLoading && stats && (
        <Card className="border transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Level Progress</CardTitle>
                <CardDescription>Earn points by recycling to level up</CardDescription>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full
                              bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30
                              transition-transform duration-300 hover:scale-110">
                {currentLevel}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Level {currentLevel}</span>
                <span>Level {currentLevel + 1}</span>
              </div>
              <Progress value={pointsInLevel} className="h-3" />
              <p className="text-xs text-center text-muted-foreground">{pointsInLevel}/100 points to next level</p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              {[
                { value: stats.total_posts * 2,          label: "Items Recycled"   },
                { value: (stats.co2_saved * 2.5).toFixed(0), label: "Trees Equivalent" },
                { value: currentLevel,                   label: "Current Level"    },
              ].map((s) => (
                <div key={s.label}
                  className="text-center p-3 rounded-xl transition-all duration-200
                             hover:bg-muted/60 hover:scale-105 cursor-default">
                  <p className="text-2xl font-bold text-primary">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Environmental Impact */}
      {!isLoading && stats && (
        <Card className="bg-gradient-to-br from-primary/5 via-transparent to-transparent border
                         transition-all duration-300 hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Your Environmental Impact</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-background border
                                transition-all duration-200 hover:shadow-md hover:border-green-500/30 hover:-translate-y-0.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10
                                  transition-transform duration-300 hover:scale-110">
                    <Leaf className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{stats.co2_saved.toFixed(1)} kg CO₂</p>
                    <p className="text-sm text-muted-foreground">Carbon emissions prevented</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  That&apos;s equivalent to driving{" "}
                  <span className="font-semibold text-foreground">{(stats.co2_saved * 4).toFixed(0)} km</span>{" "}
                  less in a car!
                </p>
              </div>
              <div className="flex items-center justify-center">
                <div className="text-center p-6 rounded-2xl bg-primary/5 border border-primary/10
                                transition-all duration-300 hover:bg-primary/10 hover:scale-105 cursor-default">
                  <div className="text-5xl font-bold text-primary mb-2">{stats.points}</div>
                  <p className="text-sm text-muted-foreground">Total Eco Points</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
