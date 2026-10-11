/**
 * Problem Statement Submissions Store
 *
 * 📍 src/features/problem-statements/lib/submissions.store.ts
 *
 * Client-side store for persisting general problem statement solutions.
 * Works seamlessly with localStorage for local development and offline mock,
 * designed to cleanly map to backend API endpoints once deployed.
 */

import type {
  ProblemStatementSubmission,
  SolutionDeliverable,
  SolutionDeliverableType,
  SubmissionStatus,
} from "../types/problem-statement.types";

const STORAGE_KEY = "mulearn_problem_submissions_v1";

function getStoredSubmissions(): ProblemStatementSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ProblemStatementSubmission[];
  } catch {
    return [];
  }
}

function persistSubmissions(submissions: ProblemStatementSubmission[]): void {
  if (typeof window === "undefined") return;
  try {
    const storage = window.localStorage;
    storage[STORAGE_KEY] = JSON.stringify(submissions);
  } catch {
    // Ignore storage quota or disabled errors
  }
}

export const submissionsStore = {
  /** Get all submissions for a specific statement (used by company / admin) */
  getSubmissionsForStatement(
    statementId: string,
  ): ProblemStatementSubmission[] {
    const all = getStoredSubmissions();
    return all.filter((s) => s.statementId === statementId);
  },

  /** Get a learner's submission for a statement */
  getMySubmission(
    statementId: string,
    userId: string,
  ): ProblemStatementSubmission | null {
    const all = getStoredSubmissions();
    return (
      all.find((s) => s.statementId === statementId && s.userId === userId) ??
      null
    );
  },

  /** Save or update a solution submission */
  saveSubmission(data: {
    statementId: string;
    userId: string;
    muid: string;
    fullName: string;
    title: string;
    primaryType: SolutionDeliverableType;
    description: string;
    deliverables: SolutionDeliverable[];
  }): ProblemStatementSubmission {
    const all = getStoredSubmissions();
    const existingIndex = all.findIndex(
      (s) => s.statementId === data.statementId && s.userId === data.userId,
    );

    const now = new Date().toISOString();

    if (existingIndex >= 0 && all[existingIndex]) {
      const existing = all[existingIndex];
      const updated: ProblemStatementSubmission = {
        ...existing,
        ...data,
        updatedAt: now,
      };
      all[existingIndex] = updated;
      persistSubmissions(all);
      return updated;
    }

    const newSubmission: ProblemStatementSubmission = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `sub-${Date.now()}`,
      statementId: data.statementId,
      userId: data.userId,
      muid: data.muid,
      fullName: data.fullName,
      title: data.title,
      primaryType: data.primaryType,
      description: data.description,
      deliverables: data.deliverables,
      status: "Submitted",
      submittedAt: now,
      updatedAt: now,
    };

    all.unshift(newSubmission);
    persistSubmissions(all);
    return newSubmission;
  },

  /** Update review status and feedback (Company / Admin action) */
  updateSubmissionStatus(
    submissionId: string,
    status: SubmissionStatus,
    reviewFeedback?: string,
  ): ProblemStatementSubmission | null {
    const all = getStoredSubmissions();
    const index = all.findIndex((s) => s.id === submissionId);
    if (index === -1) return null;

    const current = all[index];
    if (!current) return null;

    const updated: ProblemStatementSubmission = {
      ...current,
      status,
      reviewFeedback: reviewFeedback ?? current.reviewFeedback,
      updatedAt: new Date().toISOString(),
    };

    all[index] = updated;
    persistSubmissions(all);
    return updated;
  },

  /** Delete a submission */
  deleteSubmission(submissionId: string): void {
    const all = getStoredSubmissions();
    const filtered = all.filter((s) => s.id !== submissionId);
    persistSubmissions(filtered);
  },
};
