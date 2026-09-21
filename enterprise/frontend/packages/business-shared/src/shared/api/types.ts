export const AI_POLICIES = ["EXTERNAL_ALLOWED", "LOCAL_ONLY", "NO_MODEL"] as const;
export const CONTENT_MODES = ["STRUCTURED_TEXT", "METADATA_ONLY"] as const;

export type AiPolicy = (typeof AI_POLICIES)[number];
export type ContentMode = (typeof CONTENT_MODES)[number];

export type Me = {
  id: string;
  username: string;
  displayName: string;
  systemRole: "ADMIN" | "USER";
};

export type SystemStatus = {
  instanceName: string;
  objectStorageConfigured: boolean;
  aiEnabled: boolean;
};

export type Space = { status?: "ACTIVE" | "ARCHIVED"; canManage?: boolean; id: string; name: string; description?: string | null; createdByName?: string; orgUnitId?: string };
export type Folder = {
  createdByName?: string;
  orgUnitId?: string;
  id: string;
  spaceId: string;
  parentId?: string | null;
  name: string;
  sortOrder?: number;
};
export type Term = { id: string; name: string; status: "ACTIVE" | "ARCHIVED" };

export type DocumentRow = {
  orgUnitId?: string;
  id: string;
  spaceId: string;
  folderId?: string | null;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
  aiPolicy: AiPolicy;
  status: "DRAFT" | "ACTIVE" | "WITHDRAWN" | "ARCHIVED";
  currentVersionId?: string | null;
  createdBy: string;
  createdByName?: string;
  createdByUsername?: string;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
  versionNo?: number;
  versionStatus?: string;
  originalFilename?: string;
  mediaType?: string;
  versionCreatedAt?: string;
};

export type VersionRow = {
  id: string;
  documentId?: string;
  versionNo: number;
  originalFilename: string;
  mediaType: string;
  sizeBytes: number;
  sha256: string;
  status: string;
  contentMode: ContentMode;
  errorCode?: string | null;
  createdBy?: string;
  createdByName?: string;
  createdByUsername?: string;
  createdAt: string;
};

export type JobRow = {
  id: string;
  documentVersionId: string;
  jobType: string;
  status: string;
  attemptCount: number;
  errorCode?: string | null;
  updatedAt: string;
};

export type SearchHit = {
  id: string;
  title: string;
  versionId: string;
  score: number;
  spaceId: string;
  categoryId?: string | null;
  tagIds?: string[];
  aiPolicy: AiPolicy;
  status: "ACTIVE";
  versionNo: number;
  contentMode: ContentMode;
  match?: { content?: string; headingPath?: string | null };
};

export type CanonicalNode = { id: string; parentId?: string; kind?: string; level?: number; text?: string };
export type CanonicalTable = {
  id: string;
  nodeId?: string;
  columns?: { name?: string }[];
  rows?: { cells?: { text?: string; rowSpan?: number; columnSpan?: number }[] }[];
};

export type Preview =
  | { previewAvailable: false; reason: "METADATA_ONLY"; version: VersionRow }
  | { schemaVersion?: string; filename?: string; nodes?: CanonicalNode[]; tables?: CanonicalTable[]; warnings?: string[] };
