"use client";

/**
 * Cliente de soporte (Lemy Support). Pega a los endpoints proxy del API Go
 * (`/support/*`), que inyecta la API key + identidad del reporter server-side.
 * Reusa apiMutate (refresh-retry en 401). No es household-scoped: el soporte
 * es por usuario, así que `householdScoped: false` en todas las calls.
 */

import { apiMutate } from "./mutations";
import type { Ticket, TicketMessage, TicketType, PagedTickets } from "./schemas";
import type { ClientMetadata } from "@/lib/support-metadata";

const MAX_FILES = 3;

export type CreateTicketInput = {
  type: TicketType;
  subject: string;
  description: string;
  files: File[];
  metadata?: ClientMetadata;
};

export function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const fd = new FormData();
  fd.append("type", input.type);
  fd.append("subject", input.subject);
  fd.append("description", input.description);
  for (const f of input.files.slice(0, MAX_FILES)) fd.append("files", f);
  if (input.metadata) fd.append("metadata", JSON.stringify(input.metadata));

  return apiMutate<Ticket>({
    method: "POST",
    path: "/support/tickets",
    body: fd,
    householdScoped: false,
  });
}

export function getMyTickets(params: { cursor?: string; limit?: number } = {}): Promise<PagedTickets> {
  return apiMutate<PagedTickets>({
    method: "GET",
    path: "/support/tickets/mine",
    query: { cursor: params.cursor, limit: params.limit ?? 20 },
    householdScoped: false,
  });
}

export function getTicket(id: string): Promise<Ticket> {
  return apiMutate<Ticket>({
    method: "GET",
    path: `/support/tickets/${id}`,
    householdScoped: false,
  });
}

export function addTicketMessage(id: string, body: string): Promise<TicketMessage> {
  return apiMutate<TicketMessage>({
    method: "POST",
    path: `/support/tickets/${id}/messages`,
    body: { body },
    householdScoped: false,
  });
}
