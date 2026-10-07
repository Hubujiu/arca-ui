import fs from 'node:fs'
import path from 'node:path'
import postcss from 'postcss'
const root=process.cwd(), output=path.join(root,'dist-library')
fs.mkdirSync(output,{recursive:true})
const source=postcss.parse(fs.readFileSync('src/weaveos/studio.css','utf8'))
const allowed=/^\.wo-(?:theme(?:\b|\[)|button|field|input|textarea|select|switch|check|badge|overlay|backdrop|dialog|close|icon-button|form|error|spin|sr-only|table|pagination)/
function filter(container){
 for(const node of [...container.nodes]){
  if(node.type==='rule'){
   if(node.parent.type==='atrule' && node.parent.name==='keyframes')continue
   const selected=node.selectors.filter(selector=>allowed.test(selector.trim()))
   if(selected.length)node.selector=selected.join(',');else node.remove()
  }else if(node.type==='atrule'){
   if(node.name==='media'){filter(node);if(!node.nodes.length)node.remove()}
   else if(node.name!=='keyframes')node.remove()
  }
 }
}
filter(source)
const base='.wo-theme,.wo-theme *{box-sizing:border-box}.wo-theme button,.wo-theme input,.wo-theme textarea{font:inherit;touch-action:manipulation}.wo-theme button{cursor:pointer}.wo-theme svg{flex-shrink:0}\n'
fs.writeFileSync(path.join(output,'styles.css'),base+source.toString())
fs.copyFileSync('docs/sources/reui/LICENSE.md',path.join(output,'REUI-LICENSE.txt'))
fs.writeFileSync(path.join(output,'THIRD-PARTY.md'),'# Source attribution\n\nBase Button, Input, Checkbox, Switch and semantic Table derive from MIT-licensed keenthemes/reui commit ef0fe1252d9b24d69bdedee48a69ec9b29d1f217. Exact original files and hashes are preserved in docs/sources/reui in the source repository. Button variants are split into a sibling module for Fast Refresh; the checkbox icon placeholder is resolved to Lucide Check. The Base UI control composition, WeaveOS styles, geometry, spring dialog and theme are project-owned additions. No Pro source was used.\n\nRuntime peers retain their respective licenses. This package is private/unpublished.\n')
fs.writeFileSync(path.join(output,'package.json'),JSON.stringify({name:'@weaveos/ui',version:'0.3.0-preview.1',private:true,type:'module',license:'UNLICENSED',files:['*.js','*.d.ts','*.css','reui','*.txt','*.md'],exports:{'.':{types:'./index.d.ts',import:'./index.js'},'./styles.css':'./styles.css'},sideEffects:['*.css'],peerDependencies:{react:'>=19.2.0 <20','react-dom':'>=19.2.0 <20','@base-ui/react':'1.8.0',motion:'13.4.0','lucide-react':'1.47.0','class-variance-authority':'0.7.1',cn:'0.3.0'}},null,2)+'\n')
console.log('Prepared private/unpublished component artifact at dist-library')
