# Interview Categories & Question Selection

**Status:** ✅ Complete  
**Created:** Sept 30, 2025  
**Completed:** Sept 30, 2025  
**Owner:** Engineering

## TL;DR

Replace the current "shopping cart" question selection with a **category-first approach**:
1. User picks ONE interview category (radio button)
2. Questions expand below the selected category (all visible)
3. User checks questions they want (with durations shown)
4. Summary shows total questions + estimated duration
5. Single screen, no tabs, no complexity

**Key simplification:** No duration picker, no auto-selection, no multi-category mixing. Just pick a type, pick questions, start.

## Overview

Refactor the interview prep flow from a free-form question selection model to a **category-first** approach. Users select ONE interview category type, then manually select which questions they want from that category. Question durations are shown to help users understand time commitment.

## Goals

1. Simplify prep UX by focusing users on one interview type at a time
2. Enable category-specific AI interview behaviors
3. Support both rigid questions (behavioral) and exploratory scenarios (product design)
4. Show question durations to help users understand time commitment

## Non-Goals

- Multi-category interviews in a single session (explicitly NOT supported)
- Duration-based auto-selection (too complex - users just pick questions they want)
- Custom categories/questions (removing this feature for now - can revisit)
- Job description upload (removing for simplification - can revisit)

---

## Data Model Changes

### New: Interview Categories

```javascript
{
  id: "behavioral",
  name: "Behavioral",
  description: "Traditional STAR-based questions about past experiences, team dynamics, and leadership",
  
  // AI behavior configuration
  aiGuidance: {
    systemStyle: "You are a professional interviewer conducting a behavioral interview...",
    questionApproach: "Ask each question clearly and wait for the candidate's full response...",
    pacing: "Spend 7-10 minutes per question including follow-ups.",
    probeFor: ["STAR completeness", "quantified impact", "specific examples"],
    avoid: ["combining multiple questions", "providing feedback during interview"],
    evaluationSignals: ["specificity", "impact metrics", "self-awareness", "learning from experience"]
  },
  
  // Questions in this category
  questions: [
    {
      id: "recent-project",
      text: "Tell me about a recent project you're proud of.",
      rationale: "Tests ownership, initiative, and ability to communicate impact",
      estimatedDuration: 8, // minutes
      type: "rigid" // or "exploratory" for product design scenarios
    },
    // ... 8-12 questions total
  ]
}
```

### Categories to Support (Initial Set)

1. **Behavioral** - STAR questions, past experiences
2. **Execution / Delivery** - Project management, stakeholder management, shipping
3. **Metrics / Analytics** - Data-driven decisions, A/B testing, success metrics
4. **Product Sense / Design** - User empathy, design thinking, exploratory (CIRCLES framework)
5. **Strategy / Market** - Market analysis, competitive positioning, business strategy

### Question Types

Questions have a `type` that determines how the AI handles them:

- `rigid`: Ask verbatim, wait for answer, probe, move on (e.g., behavioral questions)
- `exploratory`: Use as starting point for collaborative exploration (e.g., product design scenarios)

---

## API Changes

### `GET /questions` → `GET /interview/categories`

**Old Response:**
```json
{
  "questions": [...],
  "evaluationFocus": [...],
  "personas": [...],
  "defaults": {...}
}
```

**New Response:**
```json
{
  "categories": [
    {
      "id": "behavioral",
      "name": "Behavioral",
      "description": "Traditional STAR-based questions...",
      "aiGuidance": {
        "systemStyle": "...",
        "questionApproach": "...",
        "pacing": "...",
        "probeFor": [...],
        "avoid": [...],
        "evaluationSignals": [...]
      },
      "questions": [
        {
          "id": "recent-project",
          "text": "Tell me about a recent project you're proud of.",
          "rationale": "Tests ownership...",
          "estimatedDuration": 8,
          "type": "rigid"
        }
      ]
    }
  ],
  "personas": [...] // keep existing
}
```

### `POST /interview/start-session` Changes

**Old Request:**
```json
{
  "questionStack": [
    {"id": "...", "text": "...", "source": "...", "categoryId": "..."}
  ],
  "persona": {"id": "medium"},
  "difficulty": "medium",
  "resumeRef": "...",
  "jdSummary": "..."
}
```

**New Request:**
```json
{
  "categoryId": "behavioral", // NEW: required, single category
  "questionIds": ["q1", "q2", "q3"], // NEW: array of question IDs from selected category
  "difficulty": "medium",
  "resumeRef": "..." // optional, keep existing
}
```

**Backend Logic:**
- Validate that `questionIds` all belong to the specified `categoryId`
- Use the category's AI guidance to build system prompt
- Calculate total estimated duration from selected questions

**Response Changes:**
```json
{
  "session": {...}, // existing
  "categoryId": "behavioral",
  "questionStack": [...], // selected/generated questions
  "estimatedDuration": 38, // calculated based on selected questions
  "aiGuidance": {...}, // category-specific guidance
  "persona": {...}
}
```

---

## Frontend Changes

### State Management (`client/src/atoms/prepState.js`)

**New Atoms:**
```javascript
// Category selection
export const interviewCategoriesAtom = atom([]);
export const selectedCategoryIdAtom = atom(null);
export const selectedCategoryAtom = atom(get => {
  const categoryId = get(selectedCategoryIdAtom);
  const categories = get(interviewCategoriesAtom);
  return categories.find(c => c.id === categoryId) || null;
});

// Question selection scoped to selected category
export const selectedQuestionIdsAtom = atom([]);
export const selectedQuestionsAtom = atom(get => {
  const selectedIds = get(selectedQuestionIdsAtom);
  const category = get(selectedCategoryAtom);
  if (!category) return [];
  return category.questions.filter(q => selectedIds.includes(q.id));
});

// Computed summary
export const prepSummaryAtom = atom(get => {
  const selectedQuestions = get(selectedQuestionsAtom);
  return {
    totalQuestions: selectedQuestions.length,
    estimatedDuration: selectedQuestions.reduce((sum, q) => sum + (q.estimatedDuration || 0), 0)
  };
});
```

**Atoms to Remove:**
- `questionOptionsAtom` - replaced by category-based structure
- `customCategoriesAtom` - removing custom categories feature
- `jdQuestionsAtom`, `jdUploadAtom`, `jdSummaryAtom` - removing JD upload feature

### UI Flow (`client/src/components/prep/PrepWizard.jsx`)

**Single Screen Design:**

```
┌─────────────────────────────────────────────────────────────┐
│ Interview Prep                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SELECT INTERVIEW TYPE                                       │
│                                                             │
│ ⚪ Behavioral                                               │
│    Traditional STAR-based questions about experiences...   │
│                                                             │
│ ⚫ Execution / Delivery                                     │
│    Project management, stakeholder communication...         │
│    ┌─────────────────────────────────────────────────┐   │
│    │ SELECT QUESTIONS                                 │   │
│    │                                                  │   │
│    │ ☐ How do you prioritize features? (8 min)       │   │
│    │ ☑ Describe shipping a complex project (10 min)  │   │
│    │ ☑ Managing stakeholder expectations (7 min)     │   │
│    │ ☐ Handling scope creep (8 min)                  │   │
│    │ ... (8 more questions)                           │   │
│    └─────────────────────────────────────────────────┘   │
│                                                             │
│ ⚪ Metrics / Analytics                                      │
│    Data-driven decisions, A/B testing...                    │
│                                                             │
│ ⚪ Product Sense / Design                                   │
│    User empathy, design thinking...                         │
│                                                             │
│ ⚪ Strategy / Market                                        │
│    Market analysis, competitive positioning...              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ SUMMARY                                                     │
│ Questions: 2 selected                                       │
│ Estimated Duration: 17 minutes                              │
│                                                             │
│ Resume: [Upload] (optional)                                 │
│ Difficulty: [Medium ▾]                                      │
│                                                             │
│ [Start Interview]                                           │
└─────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Categories shown as radio buttons (only one can be selected)
- When a category is selected, questions expand below it
- All questions visible with checkboxes and durations inline: "Question text (8 min)"
- No questions pre-selected (user must choose at least 1)
- Switching categories clears all question selections
- Summary section shows total count + duration (auto-calculated)
- Validation: Cannot start with 0 questions selected
- Resume upload and difficulty stay at bottom (existing behavior)

### Component Breakdown

**Modified: `PrepWizard.jsx`**
- Replace tabs with single-screen layout
- Add category radio button list with descriptions
- Questions expand below selected category
- Show duration next to each question: "Question text (8 min)"
- Calculate total duration in summary section
- Remove tabs (no more "Upload JD" or "Categories" tabs)
- Remove custom categories section
- Keep resume uploader at bottom
- Keep difficulty selector at bottom

**Modified: `QuestionSection.jsx`** (or create new simplified version)
- Used to display questions for selected category
- Show checkboxes with question text + duration
- All questions visible, none pre-selected
- Props: `questions`, `selectedQuestionIds`, `onToggle`

**Remove:**
- `CustomCategoriesSection.jsx` - no longer needed
- JD upload UI (entire tab)
- Tab navigation component

---

## Backend Implementation

### Files to Modify

1. **`api/_lib/config.js`**
   - Replace `questionBank` array with `interviewCategories` array
   - Each category includes questions + AI guidance
   - Add helper: `getCategoryById(id)`
   - Add helper: `getQuestionsByIds(categoryId, questionIds)` with validation

2. **`api/questions.js`** → Rename to **`api/interview/categories.js`**
   - Return new structure with categories

3. **`api/interview/start-session.js`**
   - Accept new request format (`categoryId` + `questionIds`)
   - Validate question IDs belong to category
   - Use category-specific AI guidance in system prompt
   - Build system prompt using `category.aiGuidance`

4. **`api/_lib/config.js` - `buildInterviewerSystemPrompt()`**
   - Update to use category's `aiGuidance` object
   - Handle `type: 'rigid'` vs `type: 'exploratory'` questions differently

### System Prompt Building

```javascript
function buildInterviewerSystemPrompt(category, selectedQuestions, persona) {
  const guidance = category.aiGuidance;
  
  // Build question list with type awareness
  const questionsList = selectedQuestions.map((q, i) => {
    const prefix = q.type === 'exploratory' ? '[Exploratory]' : '';
    return `${i + 1}. ${prefix} ${q.text}`;
  }).join('\n');
  
  return [
    guidance.systemStyle,
    '',
    'Questions to cover:',
    questionsList,
    '',
    'Question Approach:',
    guidance.questionApproach,
    '',
    'Pacing:',
    guidance.pacing,
    '',
    'Probe For:',
    guidance.probeFor.map(p => `- ${p}`).join('\n'),
    '',
    'Avoid:',
    guidance.avoid.map(a => `- ${a}`).join('\n'),
    '',
    'Evaluation Signals:',
    guidance.evaluationSignals.map(s => `- ${s}`).join('\n')
  ].join('\n');
}
```

---

## Migration & Rollout

### Phase 1: Backend Data Structure
1. Define all 5 categories in `api/_lib/config.js` (waiting on research results)
2. Update API endpoints but maintain backward compatibility temporarily
3. Test API responses

### Phase 2: Frontend Refactor
1. Update state management (new atoms)
2. Build `CategorySelector` component
3. Update `PrepWizard` flow
4. Remove JD upload / custom categories

### Phase 3: Cleanup
1. Remove old `/questions` endpoint
2. Remove unused components
3. Remove unused atoms
4. Update tests

---

## UX Questions & Gaps

### ✅ Resolved

1. **Duration Picker** - NOT NEEDED (users just select questions they want)
2. **Category Selection UI** - Radio buttons in vertical list with descriptions
3. **Question Selection** - All questions visible with checkboxes and durations
4. **Progress/Steps** - Single screen with progressive disclosure
5. **Resume/Difficulty** - Keep existing at bottom of screen

### ✅ UX Decisions (Resolved)

1. **Validation**
   - ✅ Minimum 1 question required
   - ✅ No maximum
   - ✅ Show error if trying to start with 0 questions selected

2. **Category Switching**
   - ✅ Clear all question selections when category changes

3. **Question Display**
   - ✅ Show just question text + duration (no rationale)

4. **Estimated Duration Format**
   - ✅ Inline with question text: "Question text (8 min)"

---

## Open Technical Questions

1. **Category-Specific Evaluation**
   - Should post-interview feedback vary by category?
   - Do we need category-specific evaluation prompts?
   - (Recommendation: Yes, use `category.aiGuidance.evaluationSignals` in summary prompt)

2. **Question Metadata**
   - Do we need `difficulty` at question level (easy/hard variants of same question)?
   - Do we need `tags` or `subtopics` within categories?
   - (Recommendation: Not for MVP, can add later)

3. **Backward Compatibility**
   - Do we need to support old interview history that used the old question structure?
   - Migration strategy for existing saved interviews?
   - (Recommendation: Old interviews just display as-is, no migration needed)

---

## Success Metrics

- Users successfully complete category + question selection → interview start in < 60 seconds
- Reduce prep wizard abandonment rate (simpler single-screen flow)
- Interview quality (measured by user feedback) remains high or improves
- Users select appropriate question counts (avg 3-5 questions per session)
- Category selection provides clear guidance on interview types

---

## Implementation Plan

### Status
- ✅ Spec complete
- ✅ UX decisions resolved
- ✅ Research complete (see `docs/initial_question_bank.md`)
- ✅ **Stage 1: Backend Data Structure** - DONE
- ✅ **Stage 2: API Endpoints** - DONE
- ✅ **Stage 3: Frontend State** - DONE
- ✅ **Stage 4: API Service Layer** - DONE
- ✅ **Stage 5: Frontend UI** - DONE
- 🎉 **IMPLEMENTATION COMPLETE** - Ready to test!

---

### Stage 1: Backend Data Structure ✅
**Goal:** Create structured category objects with all 60 questions

**Files to Create/Modify:**
- `api/_lib/config.js` - Add `interviewCategories` array

**Tasks:**
1. Parse `initial_question_bank.md` into structured JS objects
2. Assign unique IDs to all 60 questions (e.g., `disagreed-engineer`, `owned-decision`)
3. Add specific duration to each question (8-15 min based on category guidance)
4. Mark question type: `rigid` or `exploratory`
5. Format AI guidance into code structure:
   ```javascript
   aiGuidance: {
     systemStyle: "Warm, attentive, professional...",
     questionApproach: "Ask verbatim. Let candidate answer fully...",
     pacing: "7-10 min per question; cover 3-4 deep stories...",
     probeFor: ["Clear role and personal actions", "Trade-offs and reasoning", ...],
     avoid: ["Leading or suggesting answers", "Turning it hypothetical", ...],
     evaluationSignals: ["Specific, owns decisions, quantifies impact", ...]
   }
   ```

**Output:** Complete `interviewCategories` array with 5 categories × 12 questions each

---

### Stage 2: Update API Endpoints
**Goal:** Return new category structure, accept new request format

**Files to Modify:**
- `api/questions.js` - Update response structure
- `api/interview/start-session.js` - Accept new payload format
- `api/_lib/config.js` - Update `buildInterviewerSystemPrompt()`

**Tasks:**

**2.1 Update `api/questions.js`:**
```javascript
// OLD response:
{
  questions: [...],
  evaluationFocus: [...],
  personas: [...],
  defaults: {...}
}

// NEW response:
{
  categories: [...], // interviewCategories array
  personas: [...],   // keep existing
  // Remove: evaluationFocus, defaults (now per-category)
}
```

**2.2 Update `api/interview/start-session.js`:**
```javascript
// OLD request:
{
  questionStack: [{id, text, source, categoryId, ...}],
  persona: {id: "medium"},
  difficulty: "medium",
  resumeRef: "...",
  jdSummary: "..."
}

// NEW request:
{
  categoryId: "behavioral",
  questionIds: ["disagreed-engineer", "owned-decision"],
  difficulty: "medium",
  resumeRef: "..."
}

// Handler changes:
// - Get category by ID
// - Validate questionIds belong to category
// - Get questions from category
// - Use category.aiGuidance to build system prompt
```

**2.3 Update `buildInterviewerSystemPrompt()`:**
- Accept `category` parameter
- Use `category.aiGuidance` instead of global evaluationFocus
- Handle `type: 'rigid'` vs `type: 'exploratory'` differently in question list

**Notes:**
- ✅ No new Vercel routes needed - just updating existing endpoints
- ✅ Each file is already a serverless function
- Keep backward compatibility temporarily if needed

---

### Stage 3: Frontend State Management
**Goal:** Update Jotai atoms for category-based selection

**Files to Modify:**
- `client/src/atoms/prepState.js`

**New Atoms:**
```javascript
// Category management
export const interviewCategoriesAtom = atom([]);
export const selectedCategoryIdAtom = atom(null);
export const selectedCategoryAtom = atom(get => {
  const categoryId = get(selectedCategoryIdAtom);
  const categories = get(interviewCategoriesAtom);
  return categories.find(c => c.id === categoryId) || null;
});

// Question selection (updated)
export const selectedQuestionIdsAtom = atom([]); // keep existing
export const selectedQuestionsAtom = atom(get => {
  const selectedIds = get(selectedQuestionIdsAtom);
  const category = get(selectedCategoryAtom);
  if (!category) return [];
  return category.questions.filter(q => selectedIds.includes(q.id));
});

// Update prepSummaryAtom to calculate duration
export const prepSummaryAtom = atom(get => {
  const selectedQuestions = get(selectedQuestionsAtom);
  return {
    totalQuestions: selectedQuestions.length,
    estimatedDuration: selectedQuestions.reduce((sum, q) => sum + (q.estimatedDuration || 0), 0)
  };
});
```

**Atoms to Remove (Phase 2 - not now):**
- `questionOptionsAtom` - will be replaced by category structure
- `jdQuestionsAtom`, `jdUploadAtom`, `jdSummaryAtom` - when we remove JD feature
- `customCategoriesAtom` - when we remove custom categories

**Keep for now:**
- All existing atoms (maintain compatibility)
- Will gradually migrate in separate PR

---

### Stage 4: Update API Service Layer
**Goal:** Add functions to fetch categories, update start session payload

**Files to Modify:**
- `client/src/services/api.js`

**Tasks:**

**4.1 Update `fetchConfiguration()`:**
```javascript
export async function fetchConfiguration() {
  const response = await fetch(`${API_BASE_URL}/questions`);
  const data = await response.json();
  return {
    categories: data.categories || [],
    personas: data.personas || [],
    // OLD fields still supported:
    questions: data.questions || [],
    evaluationFocus: data.evaluationFocus || []
  };
}
```

**4.2 Update `startInterviewSession()` payload:**
```javascript
export async function startInterviewSession(payload) {
  const response = await fetch(`${API_BASE_URL}/interview/start-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      categoryId: payload.categoryId,      // NEW
      questionIds: payload.questionIds,    // NEW (array of IDs)
      difficulty: payload.difficulty,
      resumeRef: payload.resumeRef
      // Remove: questionStack (old format), jdSummary
    })
  });
  return response.json();
}
```

---

### Stage 5: Frontend UI - PrepWizard (SIMPLIFIED)
**Goal:** Add category selection to existing "Categories" tab

**Files to Modify:**
- `client/src/components/prep/PrepWizard.jsx`
- `client/src/components/prep/QuestionSection.jsx` (minor updates)

**What STAYS the same:**
- ✅ Tab structure (Categories, Upload JD, Review Stack)
- ✅ Resume uploader sidebar
- ✅ Summary card showing question count + duration
- ✅ Difficulty selector
- ✅ CustomCategoriesSection component
- ✅ JD upload functionality

**What CHANGES in "Categories" tab:**

**Current structure:**
```jsx
<Tabs.Content value="categories">
  <QuestionSection 
    title="Seed Categories"
    questions={questionOptions}
    selectedQuestionIds={selectedQuestionIds}
    onToggle={handleToggleQuestion}
  />
  <CustomCategoriesSection ... />
  {jdSelectionSections}
</Tabs.Content>
```

**New structure:**
```jsx
<Tabs.Content value="categories">
  {/* NEW: Category selector at top */}
  <section className="card">
    <div className="card-header">
      <h3>Select Interview Type</h3>
      <p className="subtle">Choose one interview category</p>
    </div>
    <div className="card-body category-selector">
      {categories.map(category => (
        <label key={category.id} className="category-option">
          <input 
            type="radio" 
            name="category"
            checked={selectedCategoryId === category.id}
            onChange={() => handleCategorySelect(category.id)}
          />
          <div>
            <strong>{category.name}</strong>
            <p className="subtle">{category.description}</p>
          </div>
        </label>
      ))}
    </div>
  </section>

  {/* NEW: Questions appear when category selected */}
  {selectedCategory && (
    <QuestionSection
      title={`${selectedCategory.name} Questions`}
      subtitle="Select questions for your interview"
      questions={selectedCategory.questions}
      selectedQuestionIds={selectedQuestionIds}
      onToggle={handleToggleQuestion}
    />
  )}

  {/* KEEP: Custom categories */}
  <CustomCategoriesSection ... />
  
  {/* KEEP: JD-generated questions */}
  {jdSelectionSections}
</Tabs.Content>
```

**Handler changes:**
```javascript
const handleCategorySelect = useCallback((categoryId) => {
  setSelectedCategoryId(categoryId);
  setSelectedQuestionIds([]); // Clear selections when switching
}, [setSelectedCategoryId, setSelectedQuestionIds]);
```

**QuestionSection updates:**
- Show duration inline: `{question.text} ({question.estimatedDuration} min)`
- No other changes needed

**Validation:**
- Check `selectedQuestions.length > 0` before allowing start
- Show error: "Select at least one question before starting"

---

### Stage 6: Testing & Validation
**Goal:** Verify everything works end-to-end

**Test Cases:**

1. **Category Selection**
   - Select each category, verify questions appear
   - Switch categories, verify selections clear
   - Verify no category selected initially

2. **Question Selection**
   - Check/uncheck questions
   - Verify duration calculation in summary
   - Verify minimum 1 question validation

3. **Interview Start**
   - Select category + questions
   - Click "Start Interview"
   - Verify payload sent: `{categoryId, questionIds, difficulty, resumeRef}`
   - Verify interview starts successfully

4. **AI Behavior**
   - Start behavioral interview → verify STAR probing
   - Start product sense interview → verify exploratory/collaborative style
   - Verify category-specific pacing and guidance

5. **Backward Compatibility**
   - Verify custom categories still work
   - Verify JD upload still works
   - Verify old saved interviews display correctly

6. **Edge Cases**
   - Try to start with 0 questions → should error
   - Select 10+ questions → should work (no max)
   - Switch category with questions selected → should clear

---

### Stage 7: Deployment
**Goal:** Ship to production

**Pre-deployment:**
- [ ] All tests pass
- [ ] Code review complete
- [ ] Update `docs/workings.md` with new category system
- [ ] Update `docs/specs_in_progress/interview-categories.md` → `docs/specs_completed/`

**Deployment:**
1. Push to main branch
2. Vercel auto-deploys
3. Verify environment variables set (no new ones needed)
4. Smoke test in production

**Post-deployment:**
- Monitor error logs
- Check user feedback
- Verify interview quality maintained

---

### Future Phases (Not in this PR)

**Phase 2 - Full Cleanup:**
- Remove old `questionOptionsAtom`
- Remove custom categories feature
- Remove JD upload feature
- Simplify to single "Categories" experience
- Remove "Upload JD" and "Review Stack" tabs

**Phase 3 - Enhancements:**
- Category-specific evaluation prompts
- Question difficulty levels
- Recently used categories
- Recommended question sets

---

## Current Status

**Ready to implement:** All stages defined, research complete, UX decided.

**Next action:** Begin Stage 1 - Create category data structure

---

## Related Documents

- `docs/workings.md` - Overall system architecture
- `docs/specs_completed/app-refactor.md` - Previous frontend refactor
- Research output (TBD) - Category definitions & AI guidance

