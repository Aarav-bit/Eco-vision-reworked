"use client";

import { useEffect, useState } from "react";
import { History, Trash2, Recycle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getPredictionHistory, clearPredictionHistory, type PredictionHistoryEntry } from "@/lib/api";
import { toast } from "sonner";

export default function HistoryPage() {
  const [history, setHistory] = useState<PredictionHistoryEntry[]>([]);

  useEffect(() => { setHistory(getPredictionHistory()); }, []);

  function handleClear() {
    clearPredictionHistory();
    setHistory([]);
    toast.success("History cleared");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10">
            <History className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Prediction History</h1>
            <p className="text-muted-foreground">Your last {history.length} AI scans</p>
          </div>
        </div>
        {history.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:border-destructive/50">
                <Trash2 className="h-4 w-4 mr-2" />Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />Clear History
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all {history.length} prediction records from your device.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Clear All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {history.length === 0 ? (
        <Card className="border-dashed transition-all duration-300 hover:border-primary/30 hover:shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No predictions yet</h3>
            <p className="text-muted-foreground text-center max-w-sm">
              Use the AI Predict tool to scan waste — results will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const confColor = entry.confidence >= 0.8 ? "text-green-600" : entry.confidence >= 0.5 ? "text-amber-600" : "text-red-600";
            return (
              <div key={entry.id} className="glass-card group overflow-hidden p-4">
                <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-muted shrink-0
                                    ring-2 ring-transparent transition-all duration-300 group-hover:ring-primary/20">
                      {entry.imagePreview ? (
                        <img src={entry.imagePreview} alt={entry.waste_type}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <History className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold capitalize">{entry.waste_type}</p>
                        <Badge className={entry.recyclable
                          ? "bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20"
                          : "bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20"}>
                          {entry.recyclable
                            ? <><Recycle className="h-3 w-3 mr-1" />Recyclable</>
                            : <><XCircle className="h-3 w-3 mr-1" />Not Recyclable</>}
                        </Badge>
                      </div>
                      {entry.disposal_instructions && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.disposal_instructions}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(entry.timestamp).toLocaleString()} ·{" "}
                        <span className="font-medium">{(entry.confidence * 100).toFixed(1)}% confidence</span>
                      </p>
                    </div>

                    {/* Confidence score */}
                    <div className="shrink-0 text-right">
                      <div className={`text-2xl font-bold transition-transform duration-300 group-hover:scale-110 ${confColor}`}>
                        {(entry.confidence * 100).toFixed(0)}%
                      </div>
                      <p className="text-xs text-muted-foreground">confidence</p>
                    </div>
                  </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
