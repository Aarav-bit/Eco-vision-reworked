"use client";

import { useEffect, useState } from "react";
import { Trophy, Leaf, FileText, Award, Medal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getLeaderboard, ApiError, type LeaderboardEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

const RANK_STYLES: Record<number, { icon: typeof Trophy; color: string; ring: string; badge: string }> = {
  1: { icon: Trophy, color: "text-yellow-500", ring: "ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-500/20", badge: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20" },
  2: { icon: Medal,  color: "text-slate-400",  ring: "ring-1 ring-slate-300/40",                                 badge: "bg-slate-500/10  text-slate-600  dark:text-slate-400  border border-slate-400/20"  },
  3: { icon: Medal,  color: "text-amber-600",  ring: "ring-1 ring-amber-400/40",                                 badge: "bg-amber-500/10  text-amber-700  dark:text-amber-400  border border-amber-500/20"  },
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try { setEntries(await getLeaderboard(10)); }
      catch (error) { if (error instanceof ApiError) toast.error("Failed to load leaderboard", { description: error.message }); }
      finally { setIsLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
          <Trophy className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">Top eco warriors ranked by points</p>
        </div>
      </div>

      {/* Top-3 podium */}
      {!isLoading && entries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3 items-end">
          {([1, 0, 2] as const).map((idx) => {
            const entry = entries[idx];
            const actualRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const style = RANK_STYLES[actualRank];
            const RankIcon = style.icon;
            const initials = entry.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
            return (
              <div key={entry.user_id}
                className={`glass-card text-center cursor-default p-4 space-y-2 ${actualRank === 1 ? "py-6" : ""}`}>
                <RankIcon className={`h-6 w-6 mx-auto ${style.color} transition-transform duration-300 hover:scale-125`} />
                <Avatar className="h-12 w-12 mx-auto ring-2 ring-primary/10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">{initials}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-sm truncate px-1">{entry.name || "Anonymous"}</p>
                <Badge className={style.badge}>#{actualRank}</Badge>
                <p className="text-lg font-bold text-primary">{entry.points}</p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full rankings list */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 pb-2">
          <p className="font-semibold text-lg">Rankings</p>
          <p className="text-sm text-muted-foreground">Top 10 recyclers on the platform</p>
        </div>
        <div className="p-4 space-y-1">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-1"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-24" /></div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))
          ) : entries.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No data yet — start recycling!</p>
          ) : (
            entries.map((entry) => {
              const style = RANK_STYLES[entry.rank];
              const RankIcon = style?.icon;
              const initials = entry.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
              const isCurrentUser = user?.id === entry.user_id;
              return (
                <div key={entry.user_id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 cursor-default
                    ${isCurrentUser
                      ? "bg-primary/5 ring-1 ring-primary/20"
                      : "hover:bg-muted/60 hover:translate-x-1"}`}>
                  {/* Rank icon */}
                  <div className="w-8 text-center shrink-0">
                    {RankIcon
                      ? <RankIcon className={`h-5 w-5 mx-auto ${style.color}`} />
                      : <span className="text-sm font-bold text-muted-foreground">#{entry.rank}</span>}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-10 w-10 ring-2 ring-transparent transition-all duration-200 hover:ring-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                  </Avatar>

                  {/* Name + sub-stats */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {entry.name || "Anonymous"}
                      {isCurrentUser && <span className="ml-2 text-xs text-primary font-normal">(you)</span>}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{entry.total_posts} posts</span>
                      <span className="flex items-center gap-1"><Leaf className="h-3 w-3" />{entry.co2_saved.toFixed(1)} kg CO₂</span>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">{entry.points}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Award className="h-3 w-3" />pts
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
