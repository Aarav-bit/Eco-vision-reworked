"use client";

import { useState, useEffect } from "react";
import { Heart, MessageCircle, Recycle, Trash2, Clock, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { likePost, ApiError, type Post } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface PostCardProps {
  post: Post;
  showActions?: boolean;
}

export function PostCard({ post, showActions = true }: PostCardProps) {
  const { user } = useAuth();
  const [likes, setLikes] = useState(post.like_count ?? 0);
  const [isLiked, setIsLiked] = useState(user ? (post.likes ?? []).includes(user.id) : false);
  const [isLiking, setIsLiking] = useState(false);
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [comment, setComment] = useState("");

  useEffect(() => {
    setLikes(post.like_count ?? 0);
    setIsLiked(user ? (post.likes ?? []).includes(user.id) : false);
  }, [post.like_count, post.likes, user]);

  const initials = post.user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const formattedDate = new Date(post.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  async function handleLike() {
    if (!user) { toast.error("Please log in to like posts"); return; }
    setIsLiking(true);
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikes((p) => (wasLiked ? p - 1 : p + 1));
    try {
      const updated = await likePost(post.id);
      setLikes(updated.like_count);
      setIsLiked(updated.likes.includes(user.id));
    } catch (error) {
      setIsLiked(wasLiked);
      setLikes((p) => (wasLiked ? p + 1 : p - 1));
      if (error instanceof ApiError) toast.error("Failed to like post", { description: error.message });
    } finally {
      setIsLiking(false);
    }
  }

  function handleComment() {
    if (comment.trim()) { setComment(""); setShowCommentInput(false); }
  }

  return (
    <div className="glass-card group overflow-hidden">
      <div className="pb-3 px-6 pt-5">
        <div className="flex items-center justify-between">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-transparent transition-all duration-300 group-hover:ring-primary/20">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-sm">{post.user.name}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formattedDate}
              </div>
            </div>
          </div>

          {/* Recycled badge */}
          <Badge
            variant={post.recycled ? "default" : "secondary"}
            className={post.recycled
              ? "bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20 border border-green-500/20"
              : "bg-muted border border-border"}
          >
            {post.recycled
              ? <><Recycle className="h-3 w-3 mr-1" />Recycled</>
              : <><Trash2 className="h-3 w-3 mr-1" />Disposed</>}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 pb-3 px-6">
        {/* Before / After images */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { src: post.before_image, label: "Before", labelCls: "bg-background/90 text-foreground" },
            { src: post.after_image,  label: "After",  labelCls: "bg-primary/90 text-primary-foreground" },
          ].map(({ src, label, labelCls }) => (
            <div key={label}
              className="relative aspect-square rounded-xl overflow-hidden bg-muted
                         transition-transform duration-300 group-hover:scale-[1.01]">
              <img
                src={src} alt={label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }}
              />
              <div className={`absolute bottom-2 left-2 ${labelCls} backdrop-blur-sm
                               text-xs px-2 py-0.5 rounded-md font-medium shadow-sm`}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Waste type */}
        <div className="flex items-center gap-2 px-1">
          <ArrowRight className="h-4 w-4 text-primary shrink-0 transition-transform duration-300 group-hover:translate-x-0.5" />
          <span className="text-sm">
            <span className="text-muted-foreground">Waste type: </span>
            <span className="font-semibold capitalize">{post.waste_type}</span>
          </span>
        </div>
      </div>

      {showActions && (
        <div className="flex flex-col gap-3 pt-0 border-t border-white/10 dark:border-white/5 mt-1 px-6 pb-4">
          <div className="flex items-center gap-2 w-full pt-2">
            <Button
              variant="ghost" size="sm"
              className={`gap-2 rounded-lg transition-all duration-200
                ${isLiked ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" : "hover:bg-muted"}`}
              onClick={handleLike}
              disabled={isLiking}
            >
              <Heart className={`h-4 w-4 transition-transform duration-200 ${isLiked ? "fill-current scale-110" : ""}`} />
              <span className="font-medium">{likes}</span>
            </Button>
            <Button
              variant="ghost" size="sm"
              className="gap-2 rounded-lg hover:bg-muted transition-all duration-200"
              onClick={() => setShowCommentInput(!showCommentInput)}
            >
              <MessageCircle className="h-4 w-4" />
              <span>Comment</span>
            </Button>
          </div>

          {showCommentInput && (
            <div className="flex gap-2 w-full">
              <Input
                placeholder="Write a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 rounded-lg"
                onKeyDown={(e) => e.key === "Enter" && handleComment()}
              />
              <Button size="sm" onClick={handleComment} className="rounded-lg">Post</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
