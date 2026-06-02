import type {
  Document,
  Organization,
  SummaryChunk,
  Trial,
  Subscription,
} from "@/app/generated/prisma/client";
import type { ChatMessage } from "@/features/chat/types";

const NOW = new Date("2026-01-01T00:00:00.000Z");

let counter = 0;
const nextId = (prefix: string) => `${prefix}_${++counter}`;

export function makeUser(overrides: Partial<UserLike> = {}): UserLike {
  return {
    id: nextId("user"),
    email: "user@example.com",
    name: "Test User",
    role: null,
    ...overrides,
  };
}

export type UserLike = {
  id: string;
  email: string;
  name: string;
  role: string | null;
};

export type SessionLike = {
  session: {
    id: string;
    userId: string;
    activeOrganizationId: string | null;
  };
  user: UserLike;
};

export function makeSession(overrides: {
  user?: Partial<UserLike>;
  activeOrganizationId?: string | null;
  sessionId?: string;
} = {}): SessionLike {
  const user = makeUser(overrides.user);
  return {
    session: {
      id: overrides.sessionId ?? nextId("session"),
      userId: user.id,
      activeOrganizationId:
        overrides.activeOrganizationId === undefined
          ? nextId("org")
          : overrides.activeOrganizationId,
    },
    user,
  };
}

export function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: nextId("doc"),
    organizationId: nextId("org"),
    userId: nextId("user"),
    modelProvider: "claude_haiku_4_5",
    fileType: "application/pdf",
    fileName: "test.pdf",
    fileSize: 12345,
    fileUrl: "documents/org/doc-original.pdf",
    triggerId: null,
    publicAccessToken: null,
    status: "pending",
    isArchived: false,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    expectedChunkCount: null,
    stripeEventIdentifier: null,
    pageCount: null,
    relevantStartPage: null,
    relevantEndPage: null,
    summaryUrl: null,
    ...overrides,
  } as Document;
}

export function makeChunk(overrides: Partial<SummaryChunk> = {}): SummaryChunk {
  return {
    id: nextId("chunk"),
    documentId: nextId("doc"),
    startPage: 1,
    endPage: 10,
    summary: "Test chunk summary",
    isRelevant: true,
    modelProvider: "claude_haiku_4_5",
    timeInMs: 1000,
    inputTokenCount: 100,
    outputTokenCount: 50,
    estimatedCost: 0.001,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as SummaryChunk;
}

export function makeOrganization(
  overrides: Partial<Organization> = {},
): Organization {
  return {
    id: nextId("org"),
    name: "Test Org",
    slug: null,
    logo: null,
    createdAt: NOW,
    metadata: null,
    freeForever: false,
    trialId: null,
    ...overrides,
  } as Organization;
}

export function makeTrial(overrides: Partial<Trial> = {}): Trial {
  return {
    id: nextId("trial"),
    endsAt: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
    creditsAvailable: 5,
    creditsUsed: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Trial;
}

export function makeChatMessage(
  overrides: Partial<ChatMessage> = {},
): ChatMessage {
  return {
    role: "user",
    content: "Hello",
    ...overrides,
  };
}

export function makeSubscription(
  overrides: Partial<Subscription> = {},
): Subscription {
  return {
    id: nextId("sub"),
    organizationId: nextId("org"),
    plan: "starter",
    status: "active",
    stripeCustomerId: "cus_test",
    stripeSubscriptionId: "sub_test",
    periodStart: NOW,
    periodEnd: new Date(NOW.getTime() + 30 * 24 * 60 * 60 * 1000),
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  } as Subscription;
}
