#!/usr/bin/env python3
"""Root-specified assertion sensitivity experiment. Mutations are always restored."""
import argparse, hashlib, json, os, pathlib, subprocess

BASE='d88d380e06a724476610e44d1e350407b277f196'
CHROME='/workspace/.weaveos-tools/browsers/chromium-1243/chrome-linux64/chrome'
parser=argparse.ArgumentParser()
parser.add_argument('--repo', default='/workspace/arca-ui-v030-048')
parser.add_argument('--evidence', default=str(pathlib.Path(__file__).resolve().parent))
args=parser.parse_args()
repo=pathlib.Path(args.repo).resolve()
evidence=pathlib.Path(args.evidence).resolve()
evidence.mkdir(parents=True,exist_ok=True)
files=['src/weaveos/geometry.ts','src/weaveos/filter-manager.tsx','tests/weaveos/origin-motion.spec.ts','tests/weaveos/filter-manager.spec.ts']
saved={p:(repo/p).read_bytes() for p in files}
backup=evidence/'safe-originals'
backup.mkdir(exist_ok=True)
for p,data in saved.items():
 target=backup/p
 target.parent.mkdir(parents=True,exist_ok=True)
 target.write_bytes(data)

def replace_once(path, replacements):
 data=saved[path]
 for before,after in replacements:
  if data.count(before)!=1:
   raise RuntimeError(f'{path}: expected exactly one match, found {data.count(before)}: {before!r}')
  data=data.replace(before,after,1)
 (repo/path).write_bytes(data)

def restore():
 for p,data in saved.items():
  (repo/p).write_bytes(data)

def run(label, test_path, old, grep):
 (repo/test_path).write_bytes(subprocess.check_output(['git','show',f'{BASE}:{test_path}'],cwd=repo) if old else saved[test_path])
 cmd=['npm','run','test:weaveos','--','--grep',grep]
 metadata={'label':label,'command':cmd,'cwd':str(repo),'env':{'CHROMIUM_PATH':CHROME},'assertion_sensitivity_only':True,'test_source':'baseline' if old else 'Root patch'}
 (evidence/f'{label}.command.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
 with (evidence/f'{label}.log').open('wb') as output:
  result=subprocess.run(cmd,cwd=repo,env={**os.environ,'CHROMIUM_PATH':CHROME},stdout=output,stderr=subprocess.STDOUT)
 (evidence/f'{label}.exit').write_text(str(result.returncode)+'\n')
 results=repo/'test-results'
 if results.exists():
  import shutil
  shutil.copytree(results,evidence/f'{label}-test-results',dirs_exist_ok=True)
 print(f'{label}: exit {result.returncode}',flush=True)

try:
 replace_once('src/weaveos/geometry.ts',[(b'x: source.x + source.width / 2 - panel.x - panel.width / 2,',b'x: 0,'),(b'y: source.y + source.height / 2 - panel.y - panel.height / 2,',b'y: 0,')])
 (evidence/'A-geometry.patch').write_bytes(subprocess.check_output(['git','diff','--','src/weaveos/geometry.ts'],cwd=repo))
 run('A-corrected-old','tests/weaveos/origin-motion.spec.ts',True,'window geometry')
 run('A-corrected-new','tests/weaveos/origin-motion.spec.ts',False,'window geometry')
finally:
 restore()

for p,data in saved.items():
 if (repo/p).read_bytes()!=data:
  raise RuntimeError(f'Restoration mismatch: {p}')
(evidence/'restored.sha256').write_text(''.join(f'{hashlib.sha256(data).hexdigest()}  {p}\n' for p,data in saved.items()))
print('All original bytes restored.',flush=True)
