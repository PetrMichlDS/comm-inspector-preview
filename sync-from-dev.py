#!/usr/bin/env python3
"""Refresh this preview repo from the ACI Web repo (committed HEAD), then neutralise it.

Usage:  python sync-from-dev.py <path-to-ACI-Web-repo> [extra working-tree files to overlay, e.g. index-v2.html styles.css]

What it changes in the PREVIEW copy only (the source repo is never touched):
  * every page gets <meta name="robots" content="noindex, nofollow">
  * the Cookiebot and Google Analytics (GA4) tags are removed, so preview visits don't pollute the
    production analytics property and the cookie banner (bound to comms-inspector.com) isn't needed
  * sitemap.xml, robots.txt and CLAUDE.md are dropped
Commit and push afterwards (git add -A && git commit && git push).
"""
import io, os, re, shutil, subprocess, sys, tarfile, tempfile

if len(sys.argv) < 2:
    sys.exit(__doc__)
src = os.path.abspath(sys.argv[1])
overlay = sys.argv[2:]
here = os.path.dirname(os.path.abspath(__file__))
keep = {".git", "README.md", "sync-from-dev.py", ".nojekyll"}

# 1. wipe previous content (except the files this repo owns)
for name in os.listdir(here):
    if name in keep:
        continue
    p = os.path.join(here, name)
    shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)

# 2. extract committed HEAD of the source repo
data = subprocess.run(["git", "-C", src, "archive", "HEAD"], check=True, capture_output=True).stdout
with tempfile.TemporaryDirectory() as tmp:
    tarfile.open(fileobj=io.BytesIO(data)).extractall(tmp)
    for name in os.listdir(tmp):
        d = os.path.join(here, name); s = os.path.join(tmp, name)
        shutil.copytree(s, d) if os.path.isdir(s) else shutil.copy2(s, d)

# 3. overlay uncommitted working-tree files on request
for rel in overlay:
    shutil.copy2(os.path.join(src, rel), os.path.join(here, rel))

# 4. neutralise
rx_cookiebot = re.compile(r'[ \t]*<!-- Cookiebot consent.*?-->\s*<script id="Cookiebot"[^>]*></script>\s*', re.S)
rx_gtag = re.compile(r'[ \t]*<!-- Google tag \(gtag\.js\) -->\s*<script async src="https://www\.googletagmanager\.com/gtag/js\?id=[A-Z0-9-]+"></script>\s*<script>.*?</script>\s*', re.S)
rx_robots = re.compile(r'<meta name="robots" content="[^"]*"\s*/?>')
for name in os.listdir(here):
    if not name.endswith(".html"):
        continue
    p = os.path.join(here, name)
    t = open(p, "rb").read().decode("utf8")
    t = rx_cookiebot.sub("", t)
    t = rx_gtag.sub("", t)
    if rx_robots.search(t):
        t = rx_robots.sub('<meta name="robots" content="noindex, nofollow" />', t, count=1)
    else:
        t = t.replace("<head>", '<head>\r\n  <meta name="robots" content="noindex, nofollow" />', 1)
    open(p, "wb").write(t.encode("utf8"))
for f in ("sitemap.xml", "robots.txt", "CLAUDE.md"):
    if os.path.exists(os.path.join(here, f)):
        os.remove(os.path.join(here, f))
shutil.rmtree(os.path.join(here, ".claude"), ignore_errors=True)
if os.path.exists(os.path.join(here, ".gitignore")):
    os.remove(os.path.join(here, ".gitignore"))
open(os.path.join(here, ".nojekyll"), "w").close()
print("preview refreshed from", src)
