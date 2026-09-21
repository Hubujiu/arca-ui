import {useState} from "react";
import {download} from "@/shared/api/client";
import {Button} from "@/shared/ui";
import {base,message} from "./model";
import {uuidPattern,type AutomationPrintArtifact} from "./automation-model";
export function printArtifactPath(id:string){return uuidPattern.test(id)?`${base}/automation-artifacts/${id}/download`:undefined;}
export function AutomationPrintArtifacts({artifacts}:{artifacts:AutomationPrintArtifact[]}){
  const [busy,setBusy]=useState<string>(),[error,setError]=useState("");
  async function save(artifact:AutomationPrintArtifact){const path=printArtifactPath(artifact.artifactId);if(!path)return;setBusy(artifact.artifactId);setError("");try{await download(path);}catch(e){setError(message(e));}finally{setBusy(undefined);}}
  if(!artifacts.length)return null;
  return <section aria-label="打印文档" className="space-y-3 rounded-card border border-border p-4"><h4 className="text-body font-medium">打印文档</h4><p className="text-caption text-muted-foreground">文档保留生成时的内容修订，下载时重新校验当前权限。</p>{artifacts.map(artifact=><div key={artifact.artifactId} className="flex min-w-0 flex-wrap items-center gap-3"><div className="min-w-0 flex-1 basis-44"><p className="break-words text-body">{artifact.fileName}</p><p className="text-caption text-muted-foreground">{artifact.stepPath} · 内容修订 {artifact.revision} · {Math.ceil(artifact.size/1024)} KB</p></div><Button size="sm" variant="outline" disabled={!!busy||!printArtifactPath(artifact.artifactId)} onClick={()=>void save(artifact)}>{busy===artifact.artifactId?"正在下载…":"下载 DOCX"}</Button></div>)}{error&&<p role="alert" className="text-caption text-destructive">{error}</p>}</section>;
}
