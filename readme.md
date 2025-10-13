# CapCom Project — Developer Guide (Git + Deploy + Ops)

## RUNNING LOCAL EMULATOR
To start the emulator
cd /Users/apndavies/Coding/flair-pdf-generator
LOCAL_API_KEY='Sausages2025!!' GLIDE_LOGS_APP="rIeUzfTQpgK4ComVOanX" GLIDE_LOGS_TABLE="native-table-EXf6OrHFQHS6x7kVCQ10" LOCAL_GLIDE_API_KEY="my-local-glide-key" GLIDE_LOGS_TOKEN="c5389e75-ed50-4e6c-b61d-3d94bfe8deaa" firebase emulators:start --only functions

## Curl commands
To test
curl "http://127.0.0.1:5001/flair-pdf-generator/europe-west2/v2?action=version"

## To generate home
curl -X POST \
  -H "Content-Type: application/json" \
  --data-binary @/Users/apndavies/Coding/flair-pdf-generator/functions/local-emulator/input/vsc25.json \
  "http://127.0.0.1:5001/flair-pdf-generator/europe-west2/v2?action=generateHome"


  ## Meals Pivot
curl -X POST \
  -H "Content-Type: application/json" \
  --data-binary @/Users/apndavies/Coding/flair-pdf-generator/functions/local-emulator/input/meals2.json \
  "http://127.0.0.1:5001/flair-pdf-generator/europe-west2/v2?action=mealsPivot"


### JSON payload conventions
- Every snapshot in the request must declare a `dataset`. Current accepted values: `scheduleDetail`, `truckingDetail`, `contacts`.
- Group presets (`functions/generateSchedules/assets/groupPresets.json`) also include a `dataset` so snapshots can inherit the correct source without extra configuration.
- Matching metadata for grouping lives under `groupMeta.<dataset>` (e.g. `groupMeta.scheduleDetail`). If the payload supplies dictionary-style metadata, it should live under `dicts.groupMeta.<dataset>`.

## 0) Prerequisites

- macOS or Linux shell (zsh/bash)
- Node.js LTS + npm
- Git (configured with your GitHub user/email)
- Firebase CLI (`npm i -g firebase-tools`)
- Cloudflare Wrangler (`npm i -D wrangler` in repo; or `npm i -g wrangler` globally)
- Access to:
  - Firebase project: **flair-pdf-generator**
  - Cloudflare account: **8b3fed5dd481b67a898081122010dc37**

---

## 1) First-time on a NEW computer (or switching machines)

> You might have made changes elsewhere. These steps keep you in sync **before** you touch anything.

```bash
# 1. Clone the repo (or fetch latest if already cloned)
git clone https://github.com/daviesap/flair-pdf-generator.git
cd flair-pdf-generator

# 2. Confirm remotes
git remote -v

# 3. Fetch all and update main
git checkout main
git fetch origin
git pull origin main

# 4. Install dependencies (root + frontend if applicable)
npm ci || npm install

# 5. Firebase auth (one time per machine)
firebase login
firebase use flair-pdf-generator

# 6. Cloudflare auth (one time per machine)
npx wrangler whoami || npx wrangler login
# Ensure wrangler.toml has the correct account_id:
# account_id = "8b3fed5dd481b67a898081122010dc37"

# 7. Verify local config files of interest
ls infra/cloudflare/
cat infra/cloudflare/wrangler.toml
```

**Optional sanity checks**

```bash
# Which branches do I have locally vs remote?
git branch -a

# What changed recently?
git log --oneline --decorate --graph --all -n 15
```

---

## 2) Day-to-day Git workflow (feature branches → merge → cleanup)

> Keep `main` clean. Do your work on short-lived branches.

```bash
# A) Create a new feature branch from main
git checkout main
git pull origin main
git checkout -b feature/my-change

# B) Work + commit (small, focused commits)
git status
git add <files>
git commit -m "feat: explain what changed concisely"

# C) Push your branch to GitHub
git push -u origin feature/my-change

# D) (Recommended) Open a PR on GitHub and merge when ready
#    Or merge locally if you prefer:
git checkout main
git pull origin main
git merge --no-ff feature/my-change

# E) Push the merged main
git push origin main

# F) Clean up the branch
git branch -d feature/my-change
git push origin --delete feature/my-change
```

**Tagging a stable milestone (optional, great for “stop fiddling”)**

```bash
git tag -a stable-$(date +%F) -m "Stable snapshot before X"
git push origin --tags
```

---

## 3) Deploys

### 3.1 Firebase Functions
```bash
# Deploy all functions (or target a single function like v2)
firebase deploy --only functions
# firebase deploy --only functions:v2
```

### 3.2 Firebase Hosting
We have two Hosting sites:

- **Frontend** (`admin.capcom.london`) → site: `flair-pdf-generator`
- **API** (`api.capcom.london`) → site: `api-capcom-london`

```bash
# Frontend (React/Vite build already in frontend/dist)
firebase deploy --only hosting:flair-pdf-generator

# API Hosting (rewrites/404.html in api-public/)
firebase deploy --only hosting:api-capcom-london
```

### 3.3 Cloudflare Worker (vox & snapshots)
Source of truth in Git:
```
infra/cloudflare/worker-vox-snapshots.js
infra/cloudflare/wrangler.toml
```

Deploy from the repo:

```bash
# Authenticate once per machine
npx wrangler whoami || npx wrangler login

# Deploy using project config
npm run cf:deploy
# (which runs: wrangler deploy --config infra/cloudflare/wrangler.toml)
```

**Wrangler notes**
- `account_id = "8b3fed5dd481b67a898081122010dc37"`
- Routes in `wrangler.toml`:
  ```toml
  routes = [
    { pattern = "vox.capcom.london/*",       zone_name = "capcom.london" },
    { pattern = "snapshots.capcom.london/*", zone_name = "capcom.london" }
  ]
  ```

---

## 4) Verify after deploy (curl quick checks)

### 4.1 API (`api.capcom.london`)

```bash
# Root should be 404 (served by Hosting 404.html)
curl -I https://api.capcom.london/

# v2 should respond with JSON
curl -i "https://api.capcom.london/v2?action=version"

# If zsh complains about ? and &, quote or use --globoff
curl -i --globoff https://api.capcom.london/v2?action=version
```

### 4.2 Worker (vox + snapshots)

```bash
# Vox debug mapping → should show upstream "public/<app>/<event>/<file>"
curl "https://vox.capcom.london/<app>/<event>/<file>.html?debug=1"

# Vox real file → HTML headers should revalidate
curl -I https://vox.capcom.london/<app>/<event>/Fullschedule.html

# Versioned PDF → long cache, immutable
curl -I https://vox.capcom.london/<app>/<event>/Fullschedule-YYYYMMDD-HHmm.pdf

# Old snapshots domain still works (back-compat)
curl -I https://snapshots.capcom.london/CapcomDemo/Fullschedule.html
```

**Cache testing picks**

```bash
# Conditional GET: expect 304 second time
curl -I https://vox.capcom.london/<app>/<event>/Fullschedule.html
# Copy ETag from above to <ETAG>:
curl -I -H "If-None-Match: <ETAG>" https://vox.capcom.london/<app>/<event>/Fullschedule.html

# Force fresh bypass (Worker honors ?fresh=1)
curl -I "https://vox.capcom.london/<app>/<event>/Fullschedule.html?fresh=1"
```

---

## 5) Storage layout & rules (for reference)

Objects are written under Firebase Storage as **prefixes** (not real folders):

```
public/<app>/<event>/<filename>
```

Typical assets:
- HTML: `text/html; charset=utf-8` — `Cache-Control: public, max-age=0, must-revalidate`
- PDF (versioned): `application/pdf` — `Cache-Control: public, max-age=31536000, immutable`
- XLSX: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (usually attachment)

Worker maps:
- `vox.capcom.london/<app>/<event>/<file>` → `public/<app>/<event>/<file>`
- `snapshots.capcom.london/<App>/<file>` → `snapshots/<App>/<file>` (legacy)

---

## 6) Finishing up a task (end-of-day “close the loop”)

```bash
# 1. Ensure everything is committed on your branch
git status
git add -A
git commit -m "chore: finalize X"

# 2. Push your branch
git push

# 3. Open PR and merge to main (or merge locally as in Section 2)
#    Then push main:
git checkout main
git pull origin main
git merge feature/my-change
git push origin main

# 4. Clean up branches
git branch -d feature/my-change
git push origin --delete feature/my-change

# 5. (Optional) Tag a stable point
git tag -a stable-$(date +%F) -m "Stable after task X"
git push origin --tags
```

**Deploy if needed**
```bash
# Functions
firebase deploy --only functions

# API Hosting
firebase deploy --only hosting:api-capcom-london

# Frontend Hosting
firebase deploy --only hosting:flair-pdf-generator

# Cloudflare Worker
npm run cf:deploy
```

**Jot future tweaks** in a simple `FUTURE_TWEAKS.md` instead of touching code.

