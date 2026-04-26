"use client";

import { useEffect, useState } from "react";
import {
  Shield,
  Users,
  FileText,
  Leaf,
  Activity,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminUsersCount,
  getAdminCO2Saved,
  getAdminActivity,
  getPosts,
  ApiError,
} from "@/lib/api";
import { toast } from "sonner";

interface AdminStats {
  usersCount: number;
  co2Saved: number;
  totalPosts: number;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: string;
    user: string;
  }>;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const [usersRes, co2Res, activityRes, postsRes] = await Promise.all([
          getAdminUsersCount(),
          getAdminCO2Saved(),
          getAdminActivity(),
          getPosts(),
        ]);

        setStats({
          usersCount: usersRes.count,
          co2Saved: co2Res.co2_saved,
          totalPosts: postsRes.length,
          recentActivity: activityRes.recent_activity || [],
        });
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 0) {
            toast.error("Server not reachable", {
              description: "Please check your connection and try again.",
            });
          } else {
            toast.error("Failed to load admin data", {
              description: error.message,
            });
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchAdminData();
  }, []);

  const statsCards = stats
    ? [
        {
          title: "Total Users",
          value: stats.usersCount,
          description: "Registered users",
          icon: Users,
          color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
        },
        {
          title: "Total Posts",
          value: stats.totalPosts,
          description: "Community posts",
          icon: FileText,
          color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        },
        {
          title: "CO₂ Saved",
          value: `${stats.co2Saved.toFixed(1)} kg`,
          description: "Platform-wide impact",
          icon: Leaf,
          color: "bg-green-500/10 text-green-600 dark:text-green-400",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of platform statistics and activity
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {statsCards.map((stat) => (
            <div key={stat.title}
              className="glass-card group relative overflow-hidden cursor-default p-6">
              <div className="absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 rounded-full
                              bg-gradient-to-br from-primary/10 to-transparent blur-2xl
                              opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color} mb-4
                               transition-transform duration-300 group-hover:scale-110 relative`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-3xl font-bold relative">{stat.value}</p>
              <p className="text-sm font-medium text-foreground mt-1 relative">{stat.title}</p>
              <p className="text-xs text-muted-foreground relative">{stat.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </div>
          <CardDescription>
            Latest actions on the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
