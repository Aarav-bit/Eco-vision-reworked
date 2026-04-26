"use client";

import { useEffect, useState } from "react";
import { UserCircle, Pencil, Check, X, Leaf, FileText, Award, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getUserProfile, updateUserProfile, ApiError, type UserProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, login, token } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await getUserProfile();
        setProfile(data);
        setEditName(data.name);
      } catch (error) {
        if (error instanceof ApiError) toast.error("Failed to load profile", { description: error.message });
      } finally { setIsLoading(false); }
    }
    load();
  }, []);

  async function handleSave() {
    if (!editName.trim() || editName.trim().length < 2) { toast.error("Name must be at least 2 characters"); return; }
    setIsSaving(true);
    try {
      const res = await updateUserProfile(editName.trim());
      setProfile((prev) => prev ? { ...prev, name: res.name } : prev);
      if (user && token) login(token, { ...user, name: res.name });
      setIsEditing(false);
      toast.success("Profile updated!");
    } catch (error) {
      if (error instanceof ApiError) toast.error("Failed to update profile", { description: error.message });
    } finally { setIsSaving(false); }
  }

  function handleCancel() { setEditName(profile?.name ?? ""); setIsEditing(false); }

  const initials = profile?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";

  const statCards = profile ? [
    { label: "Eco Points", value: profile.points,                    icon: Award,    color: "text-amber-600", bg: "bg-amber-500/10",  glow: "hover:shadow-amber-500/15 hover:border-amber-500/20" },
    { label: "CO₂ Saved",  value: `${profile.co2_saved.toFixed(1)} kg`, icon: Leaf, color: "text-green-600", bg: "bg-green-500/10",  glow: "hover:shadow-green-500/15 hover:border-green-500/20" },
    { label: "Total Posts", value: profile.total_posts,              icon: FileText, color: "text-blue-600",  bg: "bg-blue-500/10",   glow: "hover:shadow-blue-500/15  hover:border-blue-500/20"  },
  ] : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <UserCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your account details</p>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="border transition-all duration-300 hover:shadow-lg hover:border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Account Info</CardTitle>
          <CardDescription>Your public display name and email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-56" />
              </div>
            </div>
          ) : (
            <>
              {/* Avatar + name row */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 ring-4 ring-primary/10 transition-all duration-300 hover:ring-primary/30">
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="max-w-xs" autoFocus
                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }} />
                      <Button size="icon" variant="ghost" onClick={handleSave} disabled={isSaving}
                        className="hover:bg-green-500/10 hover:text-green-600">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isSaving}
                        className="hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold truncate">{profile?.name}</p>
                      {profile?.is_admin && <Badge className="bg-primary/10 text-primary border border-primary/20">Admin</Badge>}
                      <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
                        onClick={() => setIsEditing(true)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground mt-0.5">{profile?.email}</p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
                {[
                  { label: "Display Name", value: profile?.name },
                  { label: "Email",        value: profile?.email },
                ].map((f) => (
                  <div key={f.label}
                    className="space-y-1 p-3 rounded-xl bg-muted/40 transition-all duration-200 hover:bg-muted/70">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <p className="text-sm font-medium">{f.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stats summary */}
      <Card className="border transition-all duration-300 hover:shadow-lg hover:border-primary/20">
        <CardHeader>
          <CardTitle className="text-lg">Your Impact</CardTitle>
          <CardDescription>A snapshot of your eco contributions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {statCards.map((s) => (
                <div key={s.label}
                  className={`glass-card group text-center p-4 cursor-default`}>
                  <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-2
                                   transition-transform duration-300 group-hover:scale-110`}>
                    <s.icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
