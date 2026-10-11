/**
 * Problem Statement — Company Management API
 *
 * 📍 src/features/problem-statements/api/management.api.ts
 *
 * Endpoints for authenticated company owners (Company role + verified company).
 * Only a company's own statements are accessible; another company's returns 404.
 *
 * Routes prefix: /api/v1/dashboard/problem-statements/company/
 * Pattern: apiClient.get/post/patch/delete<T> — gateway auto-unwraps envelope.
 *
 * IMPORTANT: Only send the whitelisted fields (title, description, category,
 * skills, deadline). Extra fields cause 400 "Unknown field."
 */

import { endpoints } from "@/api";
import { ApiError, apiClient } from "@/api/client";
import type {
  CompanyCreateStatementPayload,
  CompanyQueryParams,
  InteractionsQueryParams,
  InteractionUser,
  PaginatedResponse,
  ProblemStatement,
  UpdateStatementPayload,
} from "../types/problem-statement.types";

// ─── List ─────────────────────────────────────────────────────────────────────

export async function fetchCompanyStatements(
  params?: CompanyQueryParams,
): Promise<PaginatedResponse<ProblemStatement>> {
  const q = new URLSearchParams();
  if (params?.pageIndex) q.set("pageIndex", String(params.pageIndex));
  if (params?.perPage) q.set("perPage", String(params.perPage));
  if (params?.search?.trim()) q.set("search", params.search.trim());
  if (params?.status && params.status !== "all") q.set("status", params.status);
  if (params?.category) q.set("category", params.category);
  if (params?.sortBy) q.set("sortBy", params.sortBy);
  const query = q.toString();
  const url = query
    ? `${endpoints.problemStatements.companyList}?${query}`
    : endpoints.problemStatements.companyList;
  try {
    return await apiClient.get<PaginatedResponse<ProblemStatement>>(url);
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.status === 404 ||
        error.message?.toLowerCase().includes("not found"))
    ) {
      return {
        data: [],
        pagination: {
          count: 0,
          totalPages: 1,
          isNext: false,
          isPrev: false,
          nextPage: null,
        },
      };
    }
    throw error;
  }
}

// ─── Get Single ───────────────────────────────────────────────────────────────

export async function fetchCompanyStatementDetail(
  id: string,
): Promise<ProblemStatement> {
  return apiClient.get<ProblemStatement>(
    endpoints.problemStatements.companyDetail(id),
  );
}

// ─── Create ───────────────────────────────────────────────────────────────────

/** Creates a new statement as Draft. Only send whitelisted fields. */
export async function createCompanyStatement(
  payload: CompanyCreateStatementPayload,
): Promise<ProblemStatement> {
  return apiClient.post<ProblemStatement>(
    endpoints.problemStatements.companyCreate,
    payload,
  );
}

// ─── Update ───────────────────────────────────────────────────────────────────

/** Partial update — works in any status. skills[] replaces the whole list. */
export async function updateCompanyStatement(
  id: string,
  payload: UpdateStatementPayload,
): Promise<ProblemStatement> {
  return apiClient.patch<ProblemStatement>(
    endpoints.problemStatements.companyUpdate(id),
    payload,
  );
}

// ─── Delete ───────────────────────────────────────────────────────────────────

/** Permanently deletes the statement and all its interactions. Confirm before calling. */
export async function deleteCompanyStatement(id: string): Promise<void> {
  await apiClient.delete(endpoints.problemStatements.companyDelete(id));
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/** Draft / Unpublished → Published. 409 if already published or deadline passed. */
export async function publishCompanyStatement(id: string): Promise<void> {
  await apiClient.post(endpoints.problemStatements.companyPublish(id), {});
}

/** Published → Unpublished. 409 if not currently Published. */
export async function unpublishCompanyStatement(id: string): Promise<void> {
  await apiClient.post(endpoints.problemStatements.companyUnpublish(id), {});
}

// ─── Interactions (Learners Trying) ──────────────────────────────────────────

/**
 * GET company/<id>/interactions/
 * Returns { counts, data, pagination }.
 * Search by user name or muid; sortBy: created_at, status, name.
 */
export async function fetchCompanyInteractions(
  id: string,
  params?: InteractionsQueryParams,
): Promise<{
  counts: Record<string, number>;
  data: InteractionUser[];
  pagination: PaginatedResponse<InteractionUser>["pagination"];
}> {
  const q = new URLSearchParams();
  if (params?.pageIndex) q.set("pageIndex", String(params.pageIndex));
  if (params?.perPage) q.set("perPage", String(params.perPage));
  if (params?.search?.trim()) q.set("search", params.search.trim());
  if (params?.sortBy) q.set("sortBy", params.sortBy);
  const query = q.toString();
  const url = query
    ? `${endpoints.problemStatements.companyInteractions(id)}?${query}`
    : endpoints.problemStatements.companyInteractions(id);
  return apiClient.get(url);
}
