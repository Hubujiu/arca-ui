import {
  FileCode,
  FileCss,
  FileTs,
  FileText,
} from "@phosphor-icons/react";
import {
  FileTree,
  FileTreeFile,
  FileTreeFolder,
} from "@/components/motion/file-tree";

function FileTreePreview() {
  return (
    <div className="flex min-h-[420px] w-full items-start justify-center px-4 pt-10">
      <div className="w-full max-w-xs p-2">
        <FileTree
          defaultValue="file-tree"
          defaultExpandedIds={["app", "components"]}
          ariaLabel="Project files"
        >
          <FileTreeFolder value="app" name="app">
            <FileTreeFolder value="components" name="components">
              <FileTreeFile
                value="file-tree"
                name="file-tree.tsx"
                icon={<FileTs className="text-sky-500" />}
              />
              <FileTreeFile
                value="button"
                name="button.tsx"
                icon={<FileTs className="text-sky-500" />}
              />
            </FileTreeFolder>
            <FileTreeFile
              value="page"
              name="page.tsx"
              icon={<FileCode className="text-sky-500" />}
            />
            <FileTreeFile
              value="styles"
              name="globals.css"
              icon={<FileCss className="text-violet-500" />}
            />
          </FileTreeFolder>
          <FileTreeFolder value="public" name="public">
            <FileTreeFile value="logo" name="logo.svg" />
            <FileTreeFile value="grid" name="grid.svg" />
          </FileTreeFolder>
          <FileTreeFile
            value="package"
            name="package.json"
            icon={<FileCode className="text-amber-500" />}
          />
          <FileTreeFile
            value="readme"
            name="README.md"
            icon={<FileText className="text-muted-foreground" />}
          />
        </FileTree>
      </div>
    </div>
  );
}

export function FileTreeDemo() {
  return <FileTreePreview />
}
