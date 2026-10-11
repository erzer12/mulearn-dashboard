"use client";

/**
 * Problem Statement Solution Submission Dialog
 *
 * 📍 src/features/problem-statements/components/problem-statement-submit-dialog.tsx
 *
 * General-purpose submission modal for all types of solutions (not just code):
 *  - 🎨 UI/UX Design & Prototypes (Figma, Behance, Dribbble)
 *  - 📊 Presentations & Pitch Decks (Slides, PDF, Drive)
 *  - 📄 Strategy & Research Reports (Notion, Google Docs, Whitepapers)
 *  - 💻 Code & Software (GitHub, GitLab, Live Deployment)
 *  - 🎥 Video Walkthroughs (Loom, YouTube, Drive)
 *  - ⚙️ Hardware & 3D Models (CAD, Schematics)
 *  - 🌐 Other Solutions
 *
 * Persists locally via `submissionsStore` and updates the interaction state.
 */

import {
  Code,
  ExternalLink,
  FileText,
  Layers,
  Link as LinkIcon,
  Loader2,
  Palette,
  Plus,
  Presentation,
  Send,
  Trash2,
  Video,
  Wrench,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUserInfo } from "@/features/auth/hooks";
import { submissionsStore } from "../lib/submissions.store";
import type {
  ProblemStatement,
  SolutionDeliverable,
  SolutionDeliverableType,
} from "../types/problem-statement.types";

interface ProblemStatementSubmitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statement: ProblemStatement;
  onSuccess?: () => void;
}

const SOLUTION_TYPES: Array<{
  type: SolutionDeliverableType;
  label: string;
  icon: typeof Palette;
  description: string;
}> = [
  {
    type: "design",
    label: "UI/UX Design",
    icon: Palette,
    description: "Figma, Behance, Adobe XD, interactive prototype",
  },
  {
    type: "deck",
    label: "Pitch Deck / Slides",
    icon: Presentation,
    description: "Google Slides, PDF, Pitch, Canva",
  },
  {
    type: "document",
    label: "Report / Document",
    icon: FileText,
    description: "Notion, Google Doc, Whitepaper, Research",
  },
  {
    type: "code",
    label: "Code / Software",
    icon: Code,
    description: "GitHub, GitLab, Replit, Live web or mobile app",
  },
  {
    type: "multimedia",
    label: "Video / Audio",
    icon: Video,
    description: "Loom, YouTube, Drive demo video walkthrough",
  },
  {
    type: "hardware",
    label: "Hardware / CAD",
    icon: Wrench,
    description: "Onshape, Tinkercad, schematics, 3D model",
  },
  {
    type: "other",
    label: "Other Solution",
    icon: Layers,
    description: "Any other deliverable or mixed approach",
  },
];

export function ProblemStatementSubmitDialog({
  open,
  onOpenChange,
  statement,
  onSuccess,
}: ProblemStatementSubmitDialogProps) {
  const { data: userInfo } = useUserInfo();

  const [title, setTitle] = useState("");
  const [primaryType, setPrimaryType] =
    useState<SolutionDeliverableType>("design");
  const [description, setDescription] = useState("");
  const [deliverables, setDeliverables] = useState<SolutionDeliverable[]>([
    {
      id: "deliv-1",
      label: "Primary Deliverable Link",
      url: "",
      type: "design",
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load existing submission if available
  useEffect(() => {
    if (!open || !userInfo?.muid) return;
    const existing = submissionsStore.getMySubmission(
      statement.id,
      userInfo.muid,
    );
    if (existing) {
      setTitle(existing.title);
      setPrimaryType(existing.primaryType);
      setDescription(existing.description);
      setDeliverables(
        existing.deliverables.length > 0
          ? existing.deliverables
          : [
              {
                id: "deliv-1",
                label: "Primary Deliverable Link",
                url: "",
                type: existing.primaryType,
              },
            ],
      );
    } else {
      // Default initial state
      setTitle(`Solution for ${statement.title}`);
      setPrimaryType("design");
      setDescription("");
      setDeliverables([
        {
          id: "deliv-1",
          label: "Primary Deliverable Link",
          url: "",
          type: "design",
        },
      ]);
    }
  }, [open, statement.id, statement.title, userInfo?.muid]);

  const handleAddDeliverable = () => {
    setDeliverables((prev) => [
      ...prev,
      {
        id: `deliv-${Date.now()}`,
        label: "Additional Resource / Asset",
        url: "",
        type: primaryType,
      },
    ]);
  };

  const handleRemoveDeliverable = (id: string) => {
    setDeliverables((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDeliverableChange = (
    id: string,
    field: "label" | "url" | "type",
    value: string,
  ) => {
    setDeliverables((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a solution title.");
      return;
    }

    if (!description.trim()) {
      toast.error("Please provide a brief description of your approach.");
      return;
    }

    // Validate deliverables
    const validDeliverables = deliverables.filter((d) => d.url.trim() !== "");
    if (validDeliverables.length === 0) {
      toast.error("Please provide at least one valid deliverable link.");
      return;
    }

    setIsSubmitting(true);
    try {
      const muid = userInfo?.muid || "learner";
      const userId = muid;
      const fullName = userInfo?.full_name || "Student Innovator";

      submissionsStore.saveSubmission({
        statementId: statement.id,
        userId,
        muid,
        fullName,
        title: title.trim(),
        primaryType,
        description: description.trim(),
        deliverables: validDeliverables,
      });

      toast.success("Solution submitted successfully! 🚀", {
        description: "The company and admins can now review your deliverables.",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Failed to save submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border p-6 sm:p-7">
        <DialogHeader className="space-y-1 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Send className="size-3.5" />
            <span>Submit Solution</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            Submit Solution for &ldquo;{statement.title}&rdquo;
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Share your work with the challenge organizers. Submissions are open
            to all solution types—designs, pitch decks, whitepapers, code, or
            hardware.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Solution Title */}
          <div className="space-y-1.5">
            <label
              htmlFor="submission-title"
              className="text-xs font-semibold text-foreground"
            >
              Solution Title / Headline{" "}
              <span className="text-destructive">*</span>
            </label>
            <Input
              id="submission-title"
              placeholder="e.g., Interactive Prototype & Automated Demand Forecaster"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setTitle(e.target.value)
              }
              className="rounded-xl text-sm"
              required
            />
          </div>

          {/* Primary Solution Type Selector */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-foreground">
              Primary Solution Domain{" "}
              <span className="text-destructive">*</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SOLUTION_TYPES.map((item) => {
                const Icon = item.icon;
                const isSelected = primaryType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => {
                      setPrimaryType(item.type);
                      // Auto-update deliverable type of first item if unchanged
                      if (
                        deliverables.length === 1 &&
                        !deliverables[0]?.url &&
                        deliverables[0]?.id
                      ) {
                        handleDeliverableChange(
                          deliverables[0].id,
                          "type",
                          item.type,
                        );
                      }
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                        : "border-border bg-card hover:bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    <Icon className="size-4 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate text-foreground">
                        {item.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">
                        {item.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Solution Description & Methodology */}
          <div className="space-y-1.5">
            <label
              htmlFor="submission-description"
              className="text-xs font-semibold text-foreground flex items-center justify-between"
            >
              <span>
                Solution Overview & Methodology{" "}
                <span className="text-destructive">*</span>
              </span>
              <span className="text-[11px] font-normal text-muted-foreground">
                Markdown supported
              </span>
            </label>
            <Textarea
              id="submission-description"
              placeholder="Explain how you approached this challenge, your research, technical or design decisions, and how to explore your solution..."
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              rows={4}
              className="rounded-xl text-sm resize-y"
              required
            />
          </div>

          {/* Deliverables & Links (Repeater) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <LinkIcon className="size-3.5 text-primary" />
                <span>
                  Deliverables & Resource Links{" "}
                  <span className="text-destructive">*</span>
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDeliverable}
                className="h-7 rounded-lg text-xs gap-1 px-2.5"
              >
                <Plus className="size-3" />
                Add Link
              </Button>
            </div>

            <div className="space-y-2">
              {deliverables.map((deliverable, index) => (
                <div
                  key={deliverable.id}
                  className="p-3 rounded-2xl border border-border bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Link #{index + 1}
                    </span>
                    {deliverables.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveDeliverable(deliverable.id)}
                        className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 rounded-md"
                        title="Remove link"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Link Label */}
                    <Input
                      placeholder="e.g., Figma Prototype, Slide Deck, GitHub"
                      value={deliverable.label}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleDeliverableChange(
                          deliverable.id,
                          "label",
                          e.target.value,
                        )
                      }
                      className="rounded-xl text-xs h-8 bg-background"
                    />

                    {/* Link Type */}
                    <select
                      value={deliverable.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        handleDeliverableChange(
                          deliverable.id,
                          "type",
                          e.target.value,
                        )
                      }
                      className="h-8 rounded-xl border border-border bg-background px-2.5 text-xs text-foreground outline-none"
                    >
                      {SOLUTION_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* URL Input */}
                  <div className="relative">
                    <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 size-3 text-muted-foreground" />
                    <Input
                      type="url"
                      placeholder="https://... (Figma, Drive, GitHub, Loom, etc.)"
                      value={deliverable.url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleDeliverableChange(
                          deliverable.id,
                          "url",
                          e.target.value,
                        )
                      }
                      className="pl-8 rounded-xl text-xs h-8 bg-background"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl font-bold text-xs gap-1.5 shadow-sm"
            >
              {isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Send className="size-3.5" />
              )}
              Submit Solution
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
