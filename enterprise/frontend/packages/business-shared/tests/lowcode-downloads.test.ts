import assert from "node:assert/strict";
import { test } from "node:test";

test("downloads preserve declared file responses and authentication retry", async () => {
  const broadcast = globalThis.BroadcastChannel; globalThis.BroadcastChannel = undefined as never;
  const {api,fetchFile,configureSession,ApiError} = await import("../src/shared/api/client");
  globalThis.BroadcastChannel = broadcast;
  const originalFetch = globalThis.fetch;
  try {
    configureSession({getAccessToken:()=>"test-token",onUnauthorized:()=>{}});
    for (const [mime,name,body] of [["text/plain","notes.txt","中文说明"],["application/vnd.openxmlformats-officedocument.wordprocessingml.document","notes.docx","PK"],["application/json","data.json",'{"snake_case":1}']]) {
      globalThis.fetch = async()=>new Response(body,{headers:{"Content-Type":mime,"Content-Disposition":`attachment; filename="${name}"`}});
      const file=await fetchFile("/api/v1/lc/files/test/content");assert.equal(file.filename,name);assert.equal(await file.blob.text(),body);
    }
    globalThis.fetch=async()=>new Response(new Uint8Array(0),{headers:{"Content-Type":"application/octet-stream","Content-Disposition":"attachment; filename=empty.bin"}});
    const emptyFile=await fetchFile("/api/v1/lc/files/test/content");assert.ok(emptyFile.blob instanceof Blob);assert.equal(emptyFile.blob.size,0);assert.equal(emptyFile.filename,"empty.bin");
    globalThis.fetch=async()=>new Response(null,{status:204});
    await assert.rejects(()=>fetchFile("/api/v1/lc/files/test/content"),(e:unknown)=>e instanceof ApiError && e.status===204 && e.code==="DOWNLOAD_EMPTY_RESPONSE" && e.message==="下载未返回文件。若启用了下载管理器，请暂时取消该站点的自动接管后重试");
    globalThis.fetch=async()=>new Response("denied",{status:403,headers:{"Content-Disposition":"attachment; filename=denied.txt","Content-Type":"text/plain"}});
    await assert.rejects(()=>fetchFile("/api/v1/lc/files/test/content"),(e:unknown)=>e instanceof ApiError && e.status===403);
    configureSession(undefined);let requests=0;
    globalThis.fetch=async(path)=>{
      if (String(path).endsWith("/csrf")) return Response.json({token:"csrf",headerName:"X-CSRF"});
      if (String(path).endsWith("/refresh")) return Response.json({accessToken:"new-token",expiresIn:3600});
      requests++;return requests===1 ? Response.json({message:"过期"},{status:401}) : new Response("refreshed file",{headers:{"Content-Type":"text/plain","Content-Disposition":"inline; filename=notes.txt"}});
    };
    const response=await api<Response>("/api/v1/lc/files/test/content");assert.ok(response instanceof Response);assert.equal(await response.text(),"refreshed file");assert.equal(requests,2);
  } finally {configureSession(undefined);globalThis.fetch=originalFetch;}
});
