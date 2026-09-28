# Bug Report

This document records the bugs identified in the initial codebase, their reproduction steps, root causes, fixes, and corresponding regression tests.

---

## Bug 1: Pagination Offset Calculation Skips Page 1

- **Location:** `task-api/src/services/taskService.js` (line 12)
- **Description:** When requesting the first page of results (`page=1`), the service computes `offset = page * limit`. For `page = 1` and `limit = 10`, `offset = 10`, completely skipping the first 10 items (indices 0–9).
- **Reproduction:**
  1. Create 4 tasks: "Task 1", "Task 2", "Task 3", "Task 4".
  2. Call `GET /tasks?page=1&limit=2` (or invoke `taskService.getPaginated(1, 2)`).
- **Expected Behavior:** Returns "Task 1" and "Task 2" (offset 0, limit 2).
- **Actual Behavior:** Returns "Task 3" and "Task 4" (offset 2, limit 2). If there are fewer tasks than the limit, page 1 returns an empty array `[]`.
- **Root Cause:** 1-based pagination requires `offset = (page - 1) * limit`. Using `page * limit` causes an off-by-one page index bug.
- **Fix:**
  ```javascript
  const getPaginated = (page, limit) => {
    const pageNum = Math.max(1, page);
    const offset = (pageNum - 1) * limit;
    return tasks.slice(offset, offset + limit);
  };
  ```
- **Regression Tests:**
  - `tests/unit/taskService.test.js` -> `getPaginated › should return the first page of tasks for page 1`
  - `tests/integration/tasks.test.js` -> `GET /tasks › should paginate tasks with page and limit query params`
  - `tests/integration/tasks.test.js` -> `GET /tasks › should default limit to 10 if only page is specified`

---

## Bug 2: Task Priority Unconditionally Overwritten on Completion

- **Location:** `task-api/src/services/taskService.js` (line 70)
- **Description:** Marking a task as complete (`completeTask(id)` or `PATCH /tasks/:id/complete`) unconditionally mutates the task's `priority` to `'medium'`, even if it was originally set to `'high'` or `'low'`.
- **Reproduction:**
  1. Create a task with `priority: 'high'`.
  2. Send `PATCH /tasks/:id/complete`.
- **Expected Behavior:** `status` becomes `'done'`, `completedAt` is populated with an ISO timestamp, and `priority` remains `'high'`.
- **Actual Behavior:** `priority` is overwritten to `'medium'`.
- **Root Cause:** Hardcoded `priority: 'medium'` in the updated task object within `completeTask`.
- **Fix:** Removed the `priority: 'medium'` assignment from `completeTask`, preserving the task's existing priority.
- **Regression Tests:**
  - `tests/unit/taskService.test.js` -> `completeTask › should preserve original task priority when marking as complete`
  - `tests/integration/tasks.test.js` -> `PATCH /tasks/:id/complete › should return 200, mark task as done, and set completedAt timestamp`

---

## Bug 3: Status Filter Uses Substring Matching Instead of Strict Equality

- **Location:** `task-api/src/services/taskService.js` (line 9)
- **Description:** `getByStatus` filters using `tasks.filter((t) => t.status.includes(status))`. Querying with a partial string like `?status=do` matches both `todo` and `done` tasks.
- **Reproduction:**
  1. Create tasks with status `'todo'` and status `'done'`.
  2. Call `taskService.getByStatus('do')` or `GET /tasks?status=do`.
- **Expected Behavior:** Only tasks with exact matching status are returned (returns empty array for partial string `'do'`).
- **Actual Behavior:** Both `'todo'` and `'done'` tasks are returned.
- **Root Cause:** Using `String.prototype.includes` instead of exact equality `===`.
- **Fix:** Changed filter condition to `t.status === status`.
- **Regression Test:**
  - `tests/unit/taskService.test.js` -> `getByStatus › should not match partial status substrings`

---

## Bug 4: Pagination Ignored When Status Filter Is Present

- **Location:** `task-api/src/routes/tasks.js` (lines 14–25)
- **Description:** When both `status` and pagination parameters (`page`, `limit`) are provided in `GET /tasks`, the `if (status)` branch executes an early return and returns all matching tasks without paginating.
- **Reproduction:**
  1. Create 4 tasks with `status: 'todo'`.
  2. Call `GET /tasks?status=todo&page=1&limit=2`.
- **Expected Behavior:** Returns the first 2 tasks with status `'todo'`.
- **Actual Behavior:** Returns all 4 tasks with status `'todo'`.
- **Root Cause:** Mutually exclusive `if` branches in the route handler without composing filtering and pagination.
- **Fix:** Handled filtering and pagination cooperatively in `GET /tasks`.
- **Regression Test:**
  - `tests/integration/tasks.test.js` -> `GET /tasks › should filter by status and paginate results when both are provided`
