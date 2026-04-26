"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, PlusCircle, RefreshCw, Trash2, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import { getMyPosts, deleteOwnPost, ApiError, type Post } from "@/lib/api";
import { toast } from "sonner";
import { Clock, Recycle, Trash2 as TrashIcon } from "lucide-react";

export default function MyPostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function fetchPosts(showToast = false) {
    try {
      const data = await getMyPosts();
      setPosts(data);
      if (showToast) toast.success("Posts refreshed!");
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error("Failed to load your posts", { description: error.message });
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

  async function handleDelete(postId: string) {
    setDeletingId(postId);
    try {
      await deleteOwnPost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error("Failed to delete post", { description: error.message });
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
            <BookOpen className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Posts</h1>
            <p className="text-muted-foreground">Your recycling journey so far</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" asChild>
            <Link href="/dashboard/create-post">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Post
            </Link>
          </Button>
        </div>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Skeleton className="aspect-square rounded-lg" />
                  <Skeleton className="aspect-square rounded-lg" />
                </div>
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Share your first recycling effort with the community!
            </p>
            <Button asChild>
              <Link href="/dashboard/create-post">
                <PlusCircle className="h-4 w-4 mr-2" />
                Create your first post
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </p>
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  {/* Images */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={post.before_image}
                        alt="Before"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                      />
                      <div className="absolute bottom-1 left-1 bg-background/90 text-[10px] px-1.5 py-0.5 rounded">
                        Before
                      </div>
                    </div>
                    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img
                        src={post.after_image}
                        alt="After"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
                      />
                      <div className="absolute bottom-1 left-1 bg-primary/90 text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
                        After
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{post.waste_type}</span>
                      <Badge
                        className={
                          post.recycled
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {post.recycled ? (
                          <><Recycle className="h-3 w-3 mr-1" />Recycled</>
                        ) : (
                          <><TrashIcon className="h-3 w-3 mr-1" />Disposed</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-destructive hover:text-destructive"
                        disabled={deletingId === post.id}
                      >
                        {deletingId === post.id ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
                        ) : (
                          <><Trash2 className="h-4 w-4 mr-2" />Delete Post</>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Delete Post
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this post. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(post.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
