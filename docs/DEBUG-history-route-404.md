# DEBUG: Interview History Dynamic Route 404 Issue

## Problem Statement

**Environment:** Local development with `vercel dev` (Vercel CLI 46.1.1)

**Issue:** The dynamic route `/api/interview/history/:id` consistently returns 404 (Not Found), while the base route `/api/interview/history` works correctly.

**Error in Browser Console:**
```
GET http://localhost:3000/api/interview/history/cf3096ce-3c57-437d-a416-107b33978b94 404 (Not Found)
Error: The page could not be found.
NOT_FOUND
```

---

## Current Working Setup

### ✅ What Works
- Base route: `GET http://localhost:3000/api/interview/history` → Returns list of interviews successfully
- Other API routes work fine (categories, questions, etc.)
- Frontend React app builds and runs
- Database queries work (SQLite with better-sqlite3)

### ❌ What Doesn't Work
- Dynamic route: `GET http://localhost:3000/api/interview/history/:id` → Returns 404
- Clicking on past interviews in sidebar fails to load detail view

---

## Current File Structure

```
api/
├── interview/
│   ├── history.js          ← Single file handler (current approach)
│   ├── save.js
│   ├── start-session.js
│   ├── jd.js
│   └── resume/
│       ├── index.js
│       └── [id].js
```

### Current Handler: `api/interview/history.js`

```javascript
import { listInterviews, getInterviewById } from '../../server/interviewStore.js';

export default async function handler(req, res) {
  const { method, url } = req;

  try {
    if (method === 'GET') {
      // Parse the URL to extract ID if present
      // URL format: /api/interview/history or /api/interview/history/:id
      const urlParts = url.split('/').filter(Boolean);
      const historyIndex = urlParts.indexOf('history');
      const id = historyIndex >= 0 && urlParts[historyIndex + 1] ? urlParts[historyIndex + 1] : null;

      if (id) {
        // Get single interview
        const interview = getInterviewById(id);
        if (!interview) {
          return res.status(404).json({ error: 'Interview not found.' });
        }
        return res.json(interview);
      } else {
        // Get list of interviews
        const interviews = listInterviews();
        return res.json({ interviews });
      }
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Interview history error:', error);
    res.status(500).json({ error: 'Failed to load history.' });
  }
}
```

### Current `vercel.json`

```json
{
  "installCommand": "npm install && cd client && npm install",
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    {
      "source": "/api/interview/history/:id",
      "destination": "/api/interview/history"
    }
  ]
}
```

---

## What We've Tried (Chronologically)

### Attempt 1: Directory with Dynamic Route ❌
**Structure:**
```
api/interview/
├── history/
│   ├── index.js     → GET /api/interview/history
│   └── [id].js      → GET /api/interview/history/:id
```

**Result:** 
- Base route worked
- Dynamic route `[id].js` returned 404
- Vercel dev did not recognize the dynamic route file

---

### Attempt 2: Flat File with Query Parameter ❌
**Structure:**
```
api/interview/
└── history.js       → Handles both routes via query.id
```

**Code:**
```javascript
if (query.id) {
  // Get single interview
}
```

**Problem:** Frontend calls `/api/interview/history/:id` (path parameter), not `?id=xxx` (query parameter)

---

### Attempt 3: Mixed Structure (File + Directory) ❌
**Structure:**
```
api/interview/
├── history.js       → GET /api/interview/history
└── history/
    └── [id].js      → GET /api/interview/history/:id
```

**Result:**
- Conflict between file and directory
- Vercel routing became unpredictable
- Sometimes neither route worked

---

### Attempt 4: URL Path Parsing (Current) ❌
**Structure:**
```
api/interview/
└── history.js       → Single handler parses URL to extract ID
```

**Approach:** Parse `req.url` to extract ID from path
```javascript
const urlParts = url.split('/').filter(Boolean);
const historyIndex = urlParts.indexOf('history');
const id = urlParts[historyIndex + 1];
```

**Added Rewrite Rule in `vercel.json`:**
```json
{
  "source": "/api/interview/history/:id",
  "destination": "/api/interview/history"
}
```

**Result:** Still returns 404 for dynamic route

---

## Testing Evidence

### Test 1: Base Route ✅
```bash
$ curl -s http://localhost:3000/api/interview/history
{"interviews":[{"id":"demo-1","title":"Demo Interview",...}]}
```
**Status:** 200 OK, returns data

### Test 2: Dynamic Route ❌
```bash
$ curl -s http://localhost:3000/api/interview/history/demo-1
The page could not be found.
NOT_FOUND
```
**Status:** 404 Not Found

### Test 3: Other Dynamic Routes ✅
```bash
$ curl -s http://localhost:3000/api/categories/some-id
# Works! (Similar pattern, different route)
```

---

## Key Observations

1. **Other dynamic routes work:** `api/categories/[id].js` successfully handles `/api/categories/:id`
2. **Handler is not invoked:** No console.log output from the history handler when hitting the dynamic route
3. **Vercel dev caching:** Even after clearing `.vercel` cache and restarting, issue persists
4. **Route specificity:** The exact path `/api/interview/history/:id` seems to be problematic, while `/api/categories/:id` works fine

---

## Questions for Resolution

1. **Is there a special case with nested paths?** Does `/api/interview/history/:id` require different handling than `/api/categories/:id`?

2. **Is the rewrite rule syntax correct?** Should we use a different pattern for the rewrite?

3. **Is there a Vercel dev limitation?** Does `vercel dev` have issues with certain path patterns?

4. **File naming conflict?** Even though we removed the directory, could Vercel still be confused about the routing?

5. **Should we use a different approach entirely?** (e.g., query params, different URL structure, etc.)

---

## System Information

- **Node.js:** v22.14.0
- **Vercel CLI:** 46.1.1
- **Platform:** macOS (darwin 25.0.0)
- **Project Type:** React (Vite) frontend + Node.js serverless functions
- **Database:** better-sqlite3 (local SQLite)

---

## Expected Behavior

When a user clicks an interview in the sidebar, it should:
1. Call `GET /api/interview/history/:id` (e.g., `/api/interview/history/demo-1`)
2. Handler extracts the ID from the path
3. Handler calls `getInterviewById(id)` 
4. Returns the full interview object with transcript and evaluation
5. Frontend displays the interview detail view

---

## Desired Solution

A working approach that:
- ✅ Handles both `/api/interview/history` (list) and `/api/interview/history/:id` (detail)
- ✅ Works with `vercel dev` locally
- ✅ Works on Vercel production deployment
- ✅ Minimal configuration/workarounds
- ✅ Follows Vercel best practices

---

## ✅ RESOLUTION (Sept 29, 2025)

### The Solution: `routes` Configuration (Not `rewrites`)

**Key Insight:** The `rewrites` array in `vercel.json` is for client-side routing (SPA fallbacks), NOT for API route mapping. For API routes, use the `routes` array with query parameter transformation.

### Final Working Configuration

**File: `api/interview/history.js`**
```javascript
import { listInterviews, getInterviewById } from '../../server/interviewStore.js';

export default async function handler(req, res) {
  const { method, query, url } = req;

  try {
    if (method === 'GET') {
      // Check for ID in query parameter (e.g., ?id=xxx)
      if (query.id) {
        const interview = getInterviewById(query.id);
        if (!interview) {
          return res.status(404).json({ error: 'Interview not found.' });
        }
        return res.json(interview);
      }

      // Check for ID in URL path as fallback
      const match = url.match(/\/api\/interview\/history\/([^/?]+)/);
      if (match && match[1]) {
        const id = match[1];
        const interview = getInterviewById(id);
        if (!interview) {
          return res.status(404).json({ error: 'Interview not found.' });
        }
        return res.json(interview);
      }

      // No ID - return list
      const interviews = listInterviews();
      return res.json({ interviews });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Interview history error:', error);
    res.status(500).json({ error: 'Failed to load history.' });
  }
}
```

**File: `vercel.json`**
```json
{
  "installCommand": "npm install && cd client && npm install",
  "buildCommand": "cd client && npm run build",
  "outputDirectory": "client/dist",
  "routes": [
    {
      "src": "/api/interview/history/(?<id>[^/]+)",
      "dest": "/api/interview/history?id=$id"
    }
  ]
}
```

### Why This Works

1. **`routes` vs `rewrites`:**
   - `rewrites` are for client-side routing (e.g., redirecting all routes to `index.html` for SPAs)
   - `routes` are for server-side transformations and actually map requests to functions
   
2. **Query Parameter Transformation:**
   - Vercel can't invoke a handler for `/api/interview/history/:id` without an actual file at that path
   - But it CAN transform the request: `/api/interview/history/demo-1` → `/api/interview/history?id=demo-1`
   - The single handler then reads `query.id` instead of parsing the path

3. **Regex Named Groups:**
   - `(?<id>[^/]+)` captures the dynamic segment as a named group
   - `$id` references that captured value in the destination

### Key Learnings

1. **Directory-based dynamic routes are unreliable in `vercel dev`:**
   - `api/interview/history/[id].js` should work in theory but often doesn't register
   - File conflicts can occur if both `history.js` and `history/` directory exist
   - Cache issues persist even after clearing `.vercel/`

2. **Vercel routing precedence:**
   - File routes take priority over directory routes
   - Static assets can shadow API routes if paths overlap
   - Always ensure clean separation

3. **The documented approach works:**
   - Vercel's official docs recommend `routes` with regex for API transformations
   - This pattern is reliable across both dev and production
   - Single-file handlers with query params are simpler than directory structures

4. **Testing strategy:**
   - Always test with `curl` to isolate frontend vs backend issues
   - Check if other dynamic routes work to identify pattern-specific problems
   - Verify handler is actually being invoked (console.log)

### Time Investment
- **Total debugging time:** ~3 hours
- **Issue:** Confusion between `rewrites` (client-side) and `routes` (server-side)
- **Resolution:** Switching to documented `routes` pattern with query params

---

## Additional Context

- This is part of a larger refactor to individual serverless functions (see `docs/vercel-deployment-patterns.md`)
- The project was working before with Express server locally, but we're migrating to pure Vercel serverless
- All other endpoints migrated successfully except this dynamic history route
- Final solution follows Vercel's documented best practices for API route transformation
