"use client";

import { useEffect, useState, useMemo } from "react";
import { Compass, Loader2, RefreshCw, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PostCard } from "@/components/post-card";
import { getPosts, ApiError, type Post } from "@/lib/api";
import { toast } from "sonner";

export default function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRecycled, setFilterRecycled] = useState<"all" | "recycled" | "disposed">("all");

  async function fetchPosts(showRefreshToast = false) {
    try {
      const data = await getPosts();
      setPosts(data);
      if (showRefreshToast) toast.success("Feed refreshed!");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 0) {
          toast.error("Server not reachable", { description: "Please check your connection." });
        } else {
          toast.error("Failed to load posts", { description: error.message });
        }
      }
    }
  }

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await fetchPosts();
      setIsLoading(false);
    }
    load();
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    await fetchPosts(true);
    setIsRefreshing(false);
  }

  // Client-side search + filter
  const filtered = useMemo(() => {
    return posts.filter((p) => {
      const matchesSearch =
        search.trim() === "" ||
        p.waste_type.toLowerCase().includes(search.toLowerCase()) ||
        p.user.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        filterRecycled === "all" ||
        (filterRecycled === "recycled" && p.recycled) ||
        (filterRecycled === "disposed" && !p.recycled);
      return matchesSearch && matchesFilter;
    });
  }, [posts, search, filterRecycled]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
            <Compass className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Explore Feed</h1>
            <p className="text-muted-foreground">Discover recycling posts from the community</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by waste type or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterRecycled} onValueChange={(v) => setFilterRecycled(v as typeof filterRecycled)}>
          <SelectTrigger className="w-36">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Posts</SelectItem>
            <SelectItem value="recycled">Recycled</SelectItem>
            <SelectItem value="disposed">Disposed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="aspect-square rounded-lg" />
                </div>
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Compass className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {posts.length === 0 ? "No posts yet" : "No results found"}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {posts.length === 0
                ? "Be the first to share your recycling journey!"
                : "Try adjusting your search or filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filtered.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {posts.length} posts
          </p>
        </div>
      )}
    </div>
  );
}
