import { createContext, useContext } from "react";
import type { DocumentRow, Folder as SpaceFolder, Me, Space, SystemStatus, Term } from "@/shared/api/types";

import type { Directory } from "@/organization/model";

export type Catalog = {
  ready?: boolean; loading?: boolean; directory?: Directory; loadedSpaces?: string[]; documentErrors?: Record<string, string>;
  loadSpaceDocuments?: (id: string) => Promise<void>;
  me?: Me;
  system?: SystemStatus;
  spaces: Space[];
  foldersBySpace: Record<string, SpaceFolder[]>;
  documents: DocumentRow[];
  categories: Term[];
  tags: Term[];
  reload: () => Promise<void>;
  requestCreateSpace: () => void;
};

export const CatalogContext = createContext<Catalog | null>(null);

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("Catalog missing");
  return value;
}

