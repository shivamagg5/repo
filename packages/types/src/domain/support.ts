export interface SupportTicket {
  id: string;
  userId: string | null;
  category: string;
  priority: string;
  status: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderUserId: string | null;
  body: string;
  createdAt: string;
}
