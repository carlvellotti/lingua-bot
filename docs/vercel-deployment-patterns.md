# Vercel Deployment Patterns

This document explains the two main approaches for deploying backend APIs to Vercel, with lessons learned from this project.

---

## TL;DR

**Current approach (Sept 2025):** Individual serverless functions in `api/` directory  
**Why:** Simple, reliable, Vercel's intended pattern  
**Tradeoff:** More files, but clearer and easier to debug

---

## Pattern 1: Individual Serverless Functions ⭐ (Current)

### Structure
```
api/
├── health.js                    → /api/health
├── questions.js                 → /api/questions
├── categories/
│   ├── index.js                → /api/categories
│   └── [id].js                 → /api/categories/:id
└── interview/
    ├── save.js                 → /api/interview/save
    ├── history/
    │   ├── index.js           → /api/interview/history
    │   └── [id].js            → /api/interview/history/:id
    └── start-session.js        → /api/interview/start-session
```

### Handler Format
```javascript
// api/health.js
export default async function handler(req, res) {
  const { method } = req;
  
  if (method === 'GET') {
    return res.json({ status: 'ok' });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
```

### Dynamic Routes
```javascript
// api/categories/[id].js
export default async function handler(req, res) {
  const { method, query } = req;
  const { id } = query;  // Extracted from URL
  
  if (method === 'DELETE') {
    // Delete logic
    return res.status(204).send();
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
```

### Pros
✅ Auto-routing based on file structure  
✅ Each function is independent (easy to understand)  
✅ Fast cold starts (small bundle per function)  
✅ Clear 1:1 mapping of files to endpoints  
✅ No complex middleware to debug  

### Cons
❌ More files to maintain  
❌ Some code duplication (imports, validation)  
❌ Harder to share middleware across routes  

### Best For
- Stateless REST APIs
- Projects with <50 endpoints
- Open source projects (easier for contributors)
- Teams new to Vercel

---

## Pattern 2: Express App as Single Function (Not Recommended)

### Structure
```
api/
└── index.js                    → All /api/* routes

server/
└── index.js                    → Express app (exported, not listening)
```

### Handler Format
```javascript
// api/index.js
import app from '../server/index.js';

export default async function handler(req, res) {
  // Strip /api prefix before passing to Express
  req.url = req.url.replace(/^\/api/, '') || '/';
  return app(req, res);
}

// server/index.js
import express from 'express';
const app = express();

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/questions', (req, res) => res.json({ questions: [...] }));

export default app;  // Export WITHOUT calling listen()
```

### Requirements
1. **All dependencies in root `package.json`** (not `server/package.json`)
2. **Database in `/tmp`** (ephemeral in serverless)
3. **No `app.listen()`** in the exported module
4. **Test with `vercel dev`** before deploying

### Pros
✅ Familiar Express patterns  
✅ All routes in one place  
✅ Share middleware easily  
✅ Less file duplication  

### Cons
❌ Larger cold start (entire Express app loaded)  
❌ Harder to debug routing issues  
❌ Not Vercel's intended pattern  
❌ Requires careful path manipulation  
❌ All dependencies bundled together  

### Common Pitfalls (What Broke in This Project)
1. **Import path issues** - Native modules like `better-sqlite3` need special handling
2. **Wrong API format** - OpenAI SDK vs raw `fetch` calls
3. **Path mismatches** - `/api/foo` vs `/foo` routing confusion
4. **Cached builds** - Vercel dev caches aggressively, needs frequent restarts
5. **Smart quotes** - Copy-paste from docs can introduce syntax errors

### Best For
- Complex backends (50+ endpoints)
- Existing Express apps being migrated
- Heavy middleware requirements
- Teams already fluent in Express + Vercel

---

## Hybrid Approach (Recommended for Large Projects)

**Frontend:** Vercel (fast CDN, serverless functions for simple endpoints)  
**Backend:** Railway/Render/Fly.io (persistent Express server)

### Setup
```javascript
// Frontend calls backend directly
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.yourapp.com';
```

### Pros
✅ Best of both worlds  
✅ Persistent database connections  
✅ Full Express power  
✅ Global CDN for frontend  

### Cons
❌ Two services to manage  
❌ Slightly higher latency  
❌ More deployment complexity  

---

## Our Journey (Sept 2025)

### What We Started With
- Individual serverless functions (`api/health.js`, `api/questions.js`) ✅
- Worked perfectly on Vercel

### What We Added
- Interview history feature
- Only added to Express server (`server/index.js`)
- Never deployed to Vercel - only worked locally!

### What We Tried (and Failed)
- Wrapped entire Express app in `api/index.js`
- Hit multiple issues:
  - `better-sqlite3` import problems
  - OpenAI Realtime API format mismatches
  - Vercel routing not recognizing the handler
  - Smart quote syntax errors

### What We Learned
- Vercel wants "routes as files" not "app as monolith"
- Individual functions are actually easier to understand
- The pain was in **migrating**, not the pattern itself

### Final Solution
- Back to individual serverless functions
- Each new endpoint = copy existing file, modify
- ~5 minutes per endpoint
- **It just works** ✅

---

## Decision Matrix

| Criterion | Individual Functions | Express-in-One | Hybrid |
|-----------|---------------------|----------------|--------|
| **Simplicity** | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| **Performance** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| **Debuggability** | ⭐⭐⭐ | ⭐ | ⭐⭐ |
| **Scalability** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Local Dev** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Contributor Friendly** | ⭐⭐⭐ | ⭐ | ⭐⭐ |

---

## Recommendations

### Start New Project
1. Begin with **individual functions**
2. Keep them until you hit ~30 endpoints
3. If complexity grows, consider **hybrid approach**

### Migrate Existing Express App
1. Try **Express-in-one** pattern first
2. If you hit issues, break into **individual functions**
3. Keep Express app for local dev (`vercel dev` can be slow)

### This Project Going Forward
- **Stick with individual functions**
- Express app (`server/index.js`) stays for local dev only
- Adding new endpoints: copy existing pattern
- Clean, debuggable, forker-friendly

---

## Resources

- [Vercel Serverless Functions Docs](https://vercel.com/docs/functions)
- [Dynamic Routes](https://vercel.com/docs/functions/edge-functions/edge-functions-api#dynamic-routes)
- This project's refactor: `docs/specs/app-refactor.md`
