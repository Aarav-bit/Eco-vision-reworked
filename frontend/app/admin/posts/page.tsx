"use client";

import { useEffect, useState } from "react";
import {
  Compass,
  Trash2,
  Loader2,
  RefreshCw,
  Clock,
  Recycle,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getPosts, deletePost, ApiError, type Post } from "@/lib/api";
import { toast } from "sonner";

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchPosts() {
    try {
      const data = await getPosts();
      setPosts(data);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 0) {
          toast.error("Server not reachable", {
            description: "Please check your connection and try again.",
          });
        } else {
          toast.error("Failed to load posts", {
            description: error.message,
          });
        }
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  async function handleDelete(postId: string) {
    setDeletingId(postId);
    try {
      await deletePost(postId);
      setPosts(posts.filter((p) => p.id !== postId));
      toast.success("Post deleted successfully");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 0) {
          toast.error("Server not reachable", {
            description: "Please check your connection and try again.",
          });
        } else {
          toast.error("Failed to delete post", {
            description: error.message,
          });
        }
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefresh() {
    setIsLoading(true);
    await fetchPosts();
    toast.success("Posts refreshed!");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
            <Compass className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Manage Posts</h1>
            <p className="text-muted-foreground">
              Review and moderate community posts
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Posts Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <Compass className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No posts to moderate</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              All posts have been reviewed or there are no posts yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id}
              className="group overflow-hidden border transition-all duration-300
                         hover:-translate-y-1 hover:shadow-xl hover:border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{post.user.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={post.recycled ? "default" : "secondary"}
                    className={post.recycled
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                      : "border border-border"}>
                    {post.recycled ? <><Recycle className="h-3 w-3 mr-1" />Recycled</> : "Disposed"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { src: post.before_image, label: "Before", cls: "bg-background/90 text-foreground" },
                    { src: post.after_image,  label: "After",  cls: "bg-primary/90 text-primary-foreground" },
                  ].map(({ src, label, cls }) => (
                    <div key={label} className="relative aspect-square rounded-xl overflow-hidden bg-muted
                                                transition-transform duration-300 group-hover:scale-[1.01]">
                      <img src={src} alt={label}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
                      <div className={`absolute bottom-1 left-1 ${cls} backdrop-blur-sm text-[10px] px-1.5 py-0.5 rounded font-medium`}>
                        {label}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm">
                  <span className="text-muted-foreground">Type: </span>
                  <span className="font-medium capitalize">{post.waste_type}</span>
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full transition-all duration-200 hover:shadow-md hover:shadow-destructive/20"
                      disabled={deletingId === post.id}>
                      {deletingId === post.id
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
                        : <><Trash2 className="h-4 w-4 mr-2" />Delete Post</>}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />Delete Post
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this post by{" "}
                        <span className="font-medium">{post.user.name}</span>? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(post.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
