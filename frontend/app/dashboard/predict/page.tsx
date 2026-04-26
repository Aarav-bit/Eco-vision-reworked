"use client";

import { useState } from "react";
import {
  Brain, Loader2, Recycle, Trash2, Lightbulb,
  MapPin, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ImageUpload } from "@/components/image-upload";
import { predictWaste, savePredictionToHistory, ApiError, type PredictionResult } from "@/lib/api";
import { toast } from "sonner";

// Colour the confidence bar: green ≥ 75%, amber ≥ 50%, red < 50%
function confidenceColor(c: number) {
  if (c >= 0.75) return "text-green-600 dark:text-green-400";
  if (c >= 0.50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}
function confidenceBarColor(c: number) {
  if (c >= 0.75) return "[&>div]:bg-green-500";
  if (c >= 0.50) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

export default function PredictPage() {
  const [image, setImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);

  async function handlePredict() {
    if (!image) { toast.error("Please upload an image first"); return; }
    setIsLoading(true);
    setResult(null);
    try {
      const prediction = await predictWaste(image);
      setResult(prediction);
      const preview = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result as string);
        reader.readAsDataURL(image);
      });
      savePredictionToHistory(prediction, preview);
      if (prediction.low_confidence) {
        toast.warning("Low confidence result", {
          description: "The model is uncertain. Try a clearer, closer photo.",
        });
      } else {
        toast.success("Prediction complete!");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.status === 0 ? "Server not reachable" : "Prediction failed", {
          description: error.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }

  function resetPrediction() { setImage(null); setResult(null); }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
          <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">AI Waste Prediction</h1>
          <p className="text-muted-foreground">
            Upload a clear, close-up photo of the waste item for best results
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Upload ── */}
        <Card className="border transition-all duration-300 hover:shadow-lg hover:border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg">Upload Waste Image</CardTitle>
            <CardDescription>
              Best results: single item, good lighting, plain background
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUpload value={image} onChange={setImage} disabled={isLoading} label="" />
            <div className="flex gap-3">
              <Button onClick={handlePredict} disabled={!image || isLoading} className="flex-1">
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing (5-crop TTA)…</>
                ) : (
                  <><Brain className="mr-2 h-4 w-4" />Predict Waste Type</>
                )}
              </Button>
              {(image || result) && (
                <Button variant="outline" onClick={resetPrediction}>Reset</Button>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tips for better accuracy</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Fill the frame with the waste item</li>
                <li>Use natural light, avoid blur</li>
                <li>Plain or neutral background works best</li>
                <li>Supported: cardboard, glass, metal, paper, plastic</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* ── Results ── */}
        <Card className={`border transition-all duration-300 hover:shadow-lg ${result ? "hover:border-primary/20" : "border-dashed"}`}>
          <CardHeader>
            <CardTitle className="text-lg">Prediction Result</CardTitle>
            <CardDescription>
              {result ? "Here's what we found" : "Results will appear here after analysis"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">

                {/* Low-confidence warning */}
                {result.low_confidence && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold">Low confidence</p>
                      <p className="text-xs opacity-80">
                        The model is uncertain about this image. Try a clearer,
                        closer photo with the item filling the frame.
                      </p>
                    </div>
                  </div>
                )}

                {/* Waste type + confidence */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/50">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Trash2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Waste Type</p>
                    <p className="text-xl font-bold capitalize">{result.waste_type}</p>
                    {/* Confidence bar */}
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className={`font-semibold ${confidenceColor(result.confidence)}`}>
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={result.confidence * 100}
                        className={`h-2 ${confidenceBarColor(result.confidence)}`}
                      />
                    </div>
                  </div>
                </div>

                {/* Recyclable status */}
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${
                  result.recyclable
                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                    : "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
                }`}>
                  {result.recyclable ? (
                    <>
                      <CheckCircle2 className="h-6 w-6 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">Recyclable</p>
                        <p className="text-sm opacity-80">This item can be recycled</p>
                      </div>
                      <Badge className="ml-auto bg-green-500/20 text-green-700 dark:text-green-400">
                        <Recycle className="h-3 w-3 mr-1" />Recycle
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-6 w-6 shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold">Not Recyclable</p>
                        <p className="text-sm opacity-80">This item cannot be recycled</p>
                      </div>
                      <Badge variant="secondary" className="ml-auto bg-red-500/20 text-red-700 dark:text-red-400">
                        <Trash2 className="h-3 w-3 mr-1" />Dispose
                      </Badge>
                    </>
                  )}
                </div>

                {/* Disposal instructions */}
                {result.disposal_instructions && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Disposal Instructions
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                      {result.disposal_instructions}
                    </p>
                  </div>
                )}

                {/* Recycling ideas */}
                {result.ideas && result.ideas.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Recycling Ideas
                    </div>
                    <ul className="space-y-1 pl-6">
                      {result.ideas.map((idea, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-1.5">•</span>{idea}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                  <Brain className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">Upload an image and click predict to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map placeholder */}
      {result && (
        <Card className="border transition-all duration-300 hover:shadow-lg hover:border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Nearby Disposal Centers</CardTitle>
            </div>
            <CardDescription>Find recycling centers and disposal facilities near you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[21/9] rounded-xl bg-muted flex items-center justify-center border-2 border-dashed">
              <div className="text-center">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Map integration coming soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
