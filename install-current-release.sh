#!/usr/bin/env bash
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
python3 - "$HOME" "$HERE" <<'NZ_INSTALL_PY'
"""Choose complete NONZERO Pi releases by embedded version, never filename or age."""
from pathlib import Path, PurePosixPath
import re, zipfile, sys, os
REQUIRED=('wall/index.html','wall/app.js','bin/nonzero-update','bin/nonzero_server.py','bin/pm5_bridge.py','wall/readiness.js')
def version_tuple(text):
 m=re.fullmatch(r'NONZERO Pi Wall v(\d+)\.(\d+)\.(\d+)\s*',text)
 return tuple(map(int,m.groups())) if m else None
def release_info(path):
 try:
  with zipfile.ZipFile(path) as z:
   names=set(z.namelist());versions=[n for n in names if PurePosixPath(n).name=='VERSION.txt' and len(PurePosixPath(n).parts)<=2]
   if len(versions)!=1:return None
   n=versions[0];info=z.getinfo(n)
   if info.file_size>256:return None
   version=version_tuple(z.read(n).decode());prefix=n[:-len('VERSION.txt')]
   if version is None or any(prefix+x not in names for x in REQUIRED):return None
   if any(PurePosixPath(n).is_absolute() or '..' in PurePosixPath(n).parts or '\\' in n for n in names):return None
   return version,prefix
 except (OSError,ValueError,UnicodeError,zipfile.BadZipFile,RuntimeError):return None

def download_dirs(home,cwd):
 dirs=[Path(home)/'Downloads',Path(cwd)]
 config=Path(home)/'.config/user-dirs.dirs'
 try:
  m=re.search(r'^XDG_DOWNLOAD_DIR="([^"\n]+)"',config.read_text(),re.M)
  if m:dirs.insert(0,Path(m[1].replace('$HOME',str(home))))
 except OSError:pass
 return list(dict.fromkeys(p.resolve() for p in dirs))
def choose_release(dirs,required=None):
 candidates=[]
 for folder in dirs:
  try:files=list(folder.iterdir())
  except OSError:continue
  for p in files:
   if not p.is_file() or p.suffix.lower()!='.zip' or not re.search(r'nonzero[-_]pi',p.name,re.I):continue
   info=release_info(p)
   if info and (required is None or info[0]==required):candidates.append((info[0],p.stat().st_mtime_ns,str(p.resolve()),info[1]))
 return max(candidates,default=None)

import tempfile,subprocess,shutil
home=Path(sys.argv[1]);target=(7,16,0);selected=choose_release(download_dirs(home,sys.argv[2]),required=target)
if not selected:
 sys.exit('Download NONZERO-Pi-v7.16.0-PM5-ACTUAL-WORKOUT.zip to this folder or Downloads, then run this installer again. No older release was installed.')
print('Installing VERIFIED v7.16.0 from '+selected[2],flush=True)
with tempfile.TemporaryDirectory(prefix='nonzero-7.16.0-') as stage:
 with zipfile.ZipFile(selected[2]) as z:
  if sum(i.file_size for i in z.infolist())>100_000_000:sys.exit('Release archive exceeds size limit.')
  z.extractall(stage)
 package=Path(stage)/selected[3]
 # Call the updater from this verified archive, not an older installed shortcut.
 sys.exit(subprocess.call(['bash',str(package/'bin/nonzero-update'),str(package)]))
NZ_INSTALL_PY
