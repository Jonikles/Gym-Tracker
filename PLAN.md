# Overcoming Gravity Progressions Feature — Implementation Plan

## Summary
Add ~170 calisthenics exercises from the Overcoming Gravity book, organized into 37 progression chains with level attributes. Add a new "Progressions" page, filtering by progression in the exercise page, and detect "level up" records when a user completes a higher-level exercise in a progression.

---

## Phase 1: Data Model Changes

### 1.1 Update `types/exercise.ts`
- Add `ProgressionMembership` interface: `{ progressionId: string; level: number }`
- Add `progressionMemberships?: ProgressionMembership[]` to `Exercise` interface
- Keep existing `progressionLevel?: number` for backward compat / simple display

### 1.2 Create `data/progressions.ts` (new file)
- Define `ProgressionDefinition` type: `{ id, name, category }`
- Define `ProgressionCategory` type: `'Horizontal Push' | 'Vertical Push' | 'Horizontal Pull' | 'Vertical Pull' | 'Core' | 'Legs' | 'Skill / Rings'`
- Export `PROGRESSION_DEFINITIONS` array (all 37 progressions)
- Export `PROGRESSION_MAP` lookup object
- Export `PROGRESSION_CATEGORIES` array

### 1.3 Update `types/pr.ts`
- Add `'progression'` to `PRType` union
- Add optional `progressionId?: string` to `PR` interface

### 1.4 Add `'rings'` to equipment options in ExerciseForm

---

## Phase 2: Seed Data — Progression Exercises

### 2.1 Create `data/progression-exercises.ts` (new file)
- Define all ~170 exercises from the book with:
  - name, muscleGroups, movementPattern, equipment, defaultFields
  - `progressionMemberships` array (supports multi-progression)
- Exercises that appear in multiple progressions (e.g., "Floor Tuck Raises" in both Hanging Leg Raises and Dragon Flag, "Rings Turned Out L-Sit" in L-Sit and Rings Full Statics) defined ONCE with multiple memberships
- BW ratio exercises (Press, Weighted Pull-ups, Weighted Dips, Squats) as separate entries with multiplier in name, equipment = 'barbell'
- Equipment assignments:
  - Floor/bar exercises → 'bodyweight'
  - Rings exercises → 'rings'
  - BW ratio/weighted → 'barbell'

### 2.2 Update `db/seed.ts`
- Import progression exercises
- During seeding: merge with existing presets, deduplicate by name (case-insensitive)
- Existing exercises that match a progression exercise get upgraded with progressionMemberships
- New exercises get added

---

## Phase 3: Database Migration

### 3.1 Add Dexie version bump in `db/index.ts`
- Schema indexes stay the same (progressionMemberships stored as document property, not indexed)

### 3.2 Add migration in `db/migrations.ts`
- For existing users: iterate progression exercises, match by name, update existing or insert new
- Idempotent: check if already migrated before running

---

## Phase 4: Exercise Page Enhancements

### 4.1 Update `hooks/useExercises.ts`
- Add `progressionId?: string` filter to `ExerciseFilters`
- Add filtering logic for progressionMemberships
- Add `'level-asc' | 'level-desc'` sort options

### 4.2 Update `ExerciseList.tsx`
- Add progression dropdown filter (populated from PROGRESSION_DEFINITIONS)
- Existing progression toggle/level filter already works — wire it to use progressionMemberships

### 4.3 Update `ExerciseCard.tsx`
- Show progression name(s) alongside level badge

### 4.4 Update `ExerciseDetail.tsx` (if it exists)
- Show progression memberships section with clickable links to `/progressions/:id`

---

## Phase 5: New Progressions Page

### 5.1 Create `components/progressions/ProgressionList.tsx`
- Groups progressions by category (Horizontal Push, Vertical Push, etc.)
- Each progression shows: name, exercise count, user's highest achieved level
- Search filter
- Click to navigate to `/progressions/:id`

### 5.2 Create `components/progressions/ProgressionDetail.tsx`
- Shows exercises in level order as a vertical chain/timeline
- Visual level indicators with connector lines
- Highlights exercises the user has completed
- Click exercise to go to its detail page

### 5.3 Create page, route, nav link
- `pages/Progressions.tsx` — renders ProgressionList or ProgressionDetail based on params
- Add routes: `/progressions` and `/progressions/:progressionId`
- Add "Progressions" to Nav links array (after "Exercises")

---

## Phase 6: Progression Record Detection

### 6.1 Create `utils/progression.ts`
- `detectProgressionAdvancements(exerciseId)`: For each progression the exercise belongs to, check if the user has previously completed any exercise in that progression at a lower level. If this is the highest level attempted, record a "level up".

### 6.2 Integrate into SetRow.tsx
- After existing PR detection, run progression advancement check
- Save as PR with `type: 'progression'`, `value: newLevel`, `previousValue: oldHighestLevel`, `progressionId`
- Only trigger once per exercise per session (not on every debounce)

### 6.3 Update PR formatting
- `utils/pr.ts`: Add 'progression' case to `formatPRType` ("Level Up") and `formatPRValue` ("Level X")
- `PRNotification.tsx`: Distinct style for progression advancement (purple badge?)

---

## Phase 7: New Hooks

### 7.1 Create `hooks/useProgressions.ts`
- `useProgressionExercises(progressionId)` — all exercises in a progression, sorted by level
- `useProgressionAchievements()` — user's highest achieved level per progression (from session history)

---

## Implementation Order
1. Phase 1 (types) → 2 (data files) → 3 (DB migration + seed) — foundational
2. Phase 4 (exercise page) — uses new data, backward compatible
3. Phase 7 (hooks) → 5 (progressions page) — new feature
4. Phase 6 (record detection) — extends existing system

## Files Created (new)
- `src/data/progressions.ts`
- `src/data/progression-exercises.ts`
- `src/components/progressions/ProgressionList.tsx` + `.module.css`
- `src/components/progressions/ProgressionDetail.tsx` + `.module.css`
- `src/components/progressions/index.ts`
- `src/pages/Progressions.tsx`
- `src/hooks/useProgressions.ts`
- `src/utils/progression.ts`

## Files Modified
- `src/types/exercise.ts`
- `src/types/pr.ts`
- `src/db/index.ts`
- `src/db/seed.ts`
- `src/db/migrations.ts`
- `src/hooks/useExercises.ts`
- `src/components/exercises/ExerciseList.tsx`
- `src/components/exercises/ExerciseCard.tsx`
- `src/components/exercises/ExerciseDetail.tsx`
- `src/components/exercises/ExerciseForm.tsx`
- `src/components/session/SetRow.tsx`
- `src/components/session/PRNotification.tsx`
- `src/utils/pr.ts`
- `src/components/common/Nav.tsx`
- `src/App.tsx`
- `src/pages/index.ts`
