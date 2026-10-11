"use client";

/**
 * Problem Statement Detail View (Full Page)
 *
 * 📍 src/features/problem-statements/components/problem-statement-detail-view.tsx
 *
 * Standalone learner page view for /dashboard/problem-statements/[idOrSlug].
 * Aligned with the layout, padding, container structure, and design system of Events pages:
 *  - Full-width responsive container (px-0 py-2 lg:p-4)
 *  - Sleek Hero Banner with back navigation & live status pills
 *  - Horizontal Identity Bar with key metadata pills
 *  - 2-Column responsive grid (lg:grid-cols-[minmax(0,1fr)_360px])
 *  - Content card for Overview & Markdown brief
 *  - Skills card with clean tag pills
 *  - Sticky sidebar with Action/Registration CTA & Provider card
 *  - Mobile bottom sticky action bar
 */

import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StateDisplay } from "@/components/ui/state-display";
import { useUserInfo } from "@/features/auth/hooks";
import { authStore } from "@/lib/auth";
import { ROLES } from "@/lib/auth/roles";
import {
  useAdminInteractions,
  useCompanyInteractions,
  useProblemStatementDetail,
  useRemoveInteraction,
  useSetInteraction,
} from "../hooks";
import { ProblemStatementAboutSection } from "./problem-statement-about-section";

interface ProblemStatementDetailViewProps {
  idOrSlug: string;
}

function formatDeadline(deadline: string | null): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return "Deadline passed";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Ends today";
  if (days === 1) return "1 day left";
  if (days <= 7) return `${days} days left`;
  return d.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function ProblemStatementDetailView({
  idOrSlug,
}: ProblemStatementDetailViewProps) {
  const router = useRouter();
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const isAuthenticated =
    typeof window !== "undefined" ? authStore.isAuthenticated() : false;

  const { data: userInfo } = useUserInfo();
  const userRoles = (userInfo?.roles as string[]) ?? [];
  const isAdmin = userRoles.includes(ROLES.ADMIN);
  const isCompany = userRoles.includes(ROLES.COMPANY);

  const {
    data: statement,
    isLoading,
    isError,
  } = useProblemStatementDetail(idOrSlug);

  const statementId = statement?.id ?? idOrSlug;
  const setMutation = useSetInteraction(statementId);
  const removeMutation = useRemoveInteraction(statementId);

  // For admins / company owners: query interactions to show who joined
  const adminInteractionsQuery = useAdminInteractions(
    statementId,
    { pageIndex: 1, perPage: 50 },
    { enabled: Boolean(userInfo && isAdmin && statement?.id) },
  );
  const companyInteractionsQuery = useCompanyInteractions(
    statementId,
    { pageIndex: 1, perPage: 50 },
    { enabled: Boolean(userInfo && !isAdmin && isCompany && statement?.id) },
  );
  const interactionsQuery = isAdmin
    ? adminInteractionsQuery
    : companyInteractionsQuery;
  const interactions = interactionsQuery.data?.data ?? [];
  const canManage = isAdmin || (isCompany && Boolean(statement?.company?.id));

  // Loading skeleton matching event detail skeleton structure
  if (isLoading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden px-0 py-2 lg:p-4 min-h-[calc(100vh-6rem)]">
        <div className="mx-auto w-full space-y-5 pb-24 lg:pb-6 lc-fade-in overflow-x-hidden">
          {/* Banner Skeleton */}
          <Skeleton className="aspect-[16/9] md:aspect-[4/1] w-full rounded-2xl" />

          {/* Identity Bar Skeleton */}
          <div className="flex flex-wrap gap-3 rounded-2xl border border-border bg-card px-5 py-3.5">
            <Skeleton className="h-5 w-36 rounded-full" />
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-32 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>

          {/* Grid Skeleton */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-40 w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-72 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not found or error state
  if (isError || !statement) {
    return (
      <div className="w-full max-w-full overflow-x-hidden px-0 py-2 lg:p-4 min-h-[calc(100vh-6rem)]">
        <div className="mx-auto max-w-3xl py-16">
          <StateDisplay
            variant="not-found"
            title="Challenge Not Found"
            description="This problem statement might be unpublished, private, or the link may be invalid."
            action={
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/dashboard/problem-statements">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Challenges
                </Link>
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  const isTrying = statement.my_interaction === "Trying";
  const isOpen = statement.is_open;
  const tryingCount = statement.interaction_counts?.Trying ?? 0;
  const deadlineText = formatDeadline(statement.deadline);

  const deadlineTs = statement.deadline
    ? new Date(statement.deadline).getTime()
    : null;
  const isDeadlinePassed = deadlineTs ? deadlineTs <= Date.now() : false;
  let deadlineDaysLeft = 0;
  if (deadlineTs && !isDeadlinePassed) {
    deadlineDaysLeft = Math.ceil(
      (deadlineTs - Date.now()) / (1000 * 60 * 60 * 24),
    );
  }

  const companyName = statement.company?.name || "μLearn";

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleTryingToggle = async () => {
    if (!isAuthenticated) {
      toast.info("Please sign in to join this challenge.");
      return;
    }
    if (isTrying) {
      setShowWithdrawConfirm(true);
    } else {
      await setMutation.mutateAsync({ status: "Trying" });
      toast.success("You're now trying this challenge! 🚀");
    }
  };

  const handleWithdraw = async () => {
    await removeMutation.mutateAsync();
    setShowWithdrawConfirm(false);
    toast.success("Withdrawn from this challenge.");
  };

  const isInteractionPending =
    setMutation.isPending || removeMutation.isPending;

  return (
    <div className="w-full max-w-full overflow-x-hidden px-0 py-2 lg:p-4 min-h-[calc(100vh-6rem)]">
      <div className="mx-auto w-full space-y-5 pb-24 lg:pb-6 lc-fade-in overflow-x-hidden">
        {/* ─── Hero Banner ─── */}
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-foreground md:aspect-[4/1] bg-gradient-to-br from-brand-blue/30 via-slate-900/95 to-purple-900/40">
          {/* Subtle gradient lighting */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/20" />

          {/* Top-Left Back Control */}
          <Button
            variant="default"
            size="icon"
            onClick={() => router.back()}
            className="absolute left-4 top-4 z-30"
            aria-label="Go back"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/* Top-Right: Status Pill + Share Button */}
          <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
            {isOpen ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-bold text-white border border-emerald-500/35 backdrop-blur-md">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                Open Submissions
              </span>
            ) : (
              <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold text-white/80 border border-white/10 backdrop-blur-md">
                Submissions Closed
              </span>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              className="rounded-full h-7 px-3 text-xs bg-background/80 hover:bg-background text-foreground backdrop-blur-md border border-border/40 gap-1.5 shadow-xs"
            >
              <Share2 className="size-3.5" />
              <span className="hidden sm:inline">Share</span>
            </Button>

            {canManage && (
              <Button
                variant="secondary"
                size="sm"
                asChild
                className="rounded-full h-7 px-3 text-xs bg-background/80 hover:bg-background text-foreground backdrop-blur-md border border-border/40 gap-1.5 shadow-xs"
              >
                <Link
                  href={`/dashboard/manage-problem-statements/${statement.id}`}
                >
                  <Settings className="size-3.5" />
                  <span className="hidden sm:inline">Manage</span>
                </Link>
              </Button>
            )}
          </div>

          {/* Bottom Overlay Content */}
          <div className="absolute inset-x-0 bottom-0 p-5 z-20">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/20 bg-white/15 px-3 py-0.5 text-xs font-medium text-white backdrop-blur-md">
                  {statement.category}
                </span>

                {isTrying && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-0.5 text-xs font-bold text-white shadow-xs">
                    <CheckCircle2 className="size-3" /> Trying It
                  </span>
                )}
              </div>

              <h1 className="text-2xl font-black tracking-tight text-white sm:text-4xl drop-shadow-sm line-clamp-2">
                {statement.title}
              </h1>
            </div>
          </div>
        </div>

        {/* ─── Identity Bar ─── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card px-5 py-3.5 shadow-xs">
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Building2 className="size-3.5 text-primary" />
            {companyName}
          </span>

          <span className="h-3 w-px bg-border" />

          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-3.5 text-primary" />
            {deadlineText
              ? `Deadline: ${deadlineText}`
              : "No deadline (Continuous)"}
          </span>

          <span className="h-3 w-px bg-border" />

          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users className="size-3.5" />
            {tryingCount}{" "}
            {tryingCount === 1 ? "learner trying" : "learners trying"}
          </span>

          <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary ml-auto sm:ml-0">
            {statement.category}
          </span>
        </div>

        {/* ─── 2-Column Responsive Grid ─── */}
        <div className="grid gap-5 w-full max-w-full overflow-x-hidden lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main Column */}
          <div className="min-w-0 w-full max-w-full space-y-5 overflow-x-hidden">
            {/* Challenge Overview & Brief Section with Read More / Read Less */}
            <ProblemStatementAboutSection description={statement.description} />

            {/* Required Skills Section */}
            {statement.skills && statement.skills.length > 0 && (
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center gap-2.5 px-5 py-4">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                    <Sparkles className="size-4 text-primary" />
                  </div>
                  <h2 className="text-base font-bold text-foreground">
                    Required & Relevant Skills
                  </h2>
                </div>
                <div className="relative px-5 pb-5 pt-0">
                  <div className="flex flex-wrap gap-2">
                    {statement.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/40 transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Learners Joined & Community Section (All Together in Main Column) */}
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                    <Users className="size-4 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Learners Trying This Challenge
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {tryingCount}{" "}
                      {tryingCount === 1 ? "learner is" : "learners are"}{" "}
                      actively working on solutions
                    </p>
                  </div>
                </div>

                {canManage && (
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="rounded-xl text-xs gap-1.5"
                  >
                    <Link
                      href={`/dashboard/manage-problem-statements/${statement.id}#learners-section`}
                    >
                      Manage Roster
                    </Link>
                  </Button>
                )}
              </div>

              <div className="p-5">
                {canManage && interactions.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border/60 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-4 py-3">
                            Learner
                          </th>
                          <th scope="col" className="px-4 py-3">
                            MUID
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {interactions.slice(0, 10).map((item) => (
                          <tr
                            key={item.user_id}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-xs font-semibold text-foreground whitespace-nowrap">
                              {item.full_name}
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                              @{item.muid}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="size-3" />{" "}
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-muted/20 p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        {tryingCount === 0
                          ? "Be the first learner to try this challenge!"
                          : `${tryingCount} ${tryingCount === 1 ? "learner has" : "learners have"} started working on solutions.`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Click &ldquo;I&apos;m Trying It&rdquo; to add this
                        challenge to your workspace and join fellow learners.
                      </p>
                    </div>

                    {!isTrying && isOpen && (
                      <Button
                        size="sm"
                        onClick={handleTryingToggle}
                        disabled={isInteractionPending}
                        className="rounded-full font-bold px-4 shrink-0 shadow-sm"
                      >
                        <Zap className="size-3.5 mr-1.5" />
                        I&apos;m Trying It
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Sidebar */}
          <aside className="min-w-0 w-full max-w-full space-y-4 overflow-x-hidden lg:sticky lg:top-6 lg:self-start">
            {/* Registration / Action Card */}
            <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
              {/* Status Pill */}
              {isOpen ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <Zap className="size-3" /> Open for Submissions
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  Submissions Closed
                </span>
              )}

              {/* Deadline countdown & details */}
              {deadlineText && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Deadline
                    </span>
                    <span className="text-[11px] font-semibold text-foreground">
                      {deadlineText}
                    </span>
                  </div>
                  {!isDeadlinePassed && deadlineDaysLeft > 0 && (
                    <p className="text-[11px] font-medium text-amber-500">
                      {deadlineDaysLeft === 1
                        ? "1 day remaining"
                        : `${deadlineDaysLeft} days remaining`}
                    </p>
                  )}
                </div>
              )}

              {/* Primary Action Button */}
              <Button
                size="lg"
                className="w-full rounded-full font-bold shadow-sm"
                disabled={(!isOpen && !isTrying) || isInteractionPending}
                onClick={handleTryingToggle}
              >
                {isInteractionPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : isTrying ? (
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="size-4" /> Trying It ✓
                  </span>
                ) : isOpen ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Zap className="size-4" /> I&apos;m Trying It
                  </span>
                ) : (
                  "Submissions Closed"
                )}
              </Button>

              {/* Withdraw Button if currently trying */}
              {isTrying && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWithdrawConfirm(true)}
                  disabled={isInteractionPending}
                  className="w-full rounded-full text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Withdraw from Challenge
                </Button>
              )}

              {/* Share Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="w-full rounded-full text-xs gap-1.5"
              >
                <Share2 className="size-3.5" />
                Share Challenge
              </Button>

              {/* Community Engagement Stats */}
              <div className="space-y-2 border-t border-border pt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-3.5 text-primary" />
                    Community Engagement
                  </span>
                  <span className="font-semibold text-foreground">
                    {tryingCount} {tryingCount === 1 ? "learner" : "learners"}
                  </span>
                </div>
              </div>
            </div>

            {/* Provider / Company Card */}
            <div className="rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-2.5 px-5 py-4">
                <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10">
                  <Building2 className="size-4 text-primary" />
                </div>
                <h2 className="text-base font-bold text-foreground">
                  Problem Provider
                </h2>
              </div>
              <div className="flex items-center gap-3 px-5 pb-5">
                {statement.company?.logo ? (
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-background border border-border">
                    <Image
                      src={statement.company.logo}
                      alt={companyName}
                      fill
                      className="object-contain p-1"
                    />
                  </div>
                ) : (
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary">
                    <span className="text-sm font-black text-primary-foreground">
                      {companyName.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p
                    title={companyName}
                    className="text-sm font-bold text-foreground wrap-break-word line-clamp-2"
                  >
                    {companyName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Challenge Partner
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {/* ─── Mobile Bottom Sticky Action Bar ─── */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {statement.title}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {deadlineText
                  ? `Deadline: ${deadlineText}`
                  : `${tryingCount} trying`}
              </p>
            </div>
            <Button
              size="sm"
              disabled={(!isOpen && !isTrying) || isInteractionPending}
              onClick={handleTryingToggle}
              className="shrink-0 rounded-full px-5 py-2 text-xs font-semibold"
            >
              {isTrying ? "Trying ✓" : isOpen ? "I'm Trying It" : "Closed"}
            </Button>
          </div>
        </div>
      </div>

      {/* Withdraw Confirmation Dialog */}
      <ConfirmDialog
        open={showWithdrawConfirm}
        onOpenChange={setShowWithdrawConfirm}
        title="Stop Trying This Challenge?"
        description="This will remove this problem statement from your trying list. You can join again at any time while submissions remain open."
        confirmLabel="Withdraw"
        cancelLabel="Keep Trying"
        variant="destructive"
        onConfirm={handleWithdraw}
        isPending={removeMutation.isPending}
      />
    </div>
  );
}
