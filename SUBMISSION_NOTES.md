# Submission Notes — The Untested API

## 1. Executive Summary

This submission completes all requirements for the Take-Home Assignment:
- **Comprehensive Test Suite:** 78 automated tests (both unit and integration tests) using Jest and Supertest, achieving **97.5% statement coverage** across the application.
- **Bug Fixes & Regressions:** Identified and fixed 4 concrete bugs (including pagination off-by-one, priority corruption on completion, and status substring matching), each backed by failing regression tests.
- **New Feature:** Implemented `PATCH /tasks/:id/assign` following the existing route -> validation -> service architecture, with full test coverage for happy paths, validation errors, resource errors, and reassignments.

---

## 2. New Feature: `PATCH /tasks/:id/assign`

### Endpoint Specification
- **Method:** `PATCH`
- **Route:** `/tasks/:id/assign`
- **Request Headers:** `Content-Type: application/json`
- **Request Body:**
  ```json
  {
    "assignee": "Alice Smith"
  }
  ```
- **Success Response:** `200 OK`
  ```json
  {
    "id": "6c449c2d-8b01-447e-8588-e9f022ef2049",
    "title": "Implement feature",
    "description": "",
    "status": "todo",
    "priority": "medium",
    "dueDate": null,
    "completedAt": null,
    "createdAt": "2026-09-28T13:11:49.439Z",
    "assignee": "Alice Smith"
  }
  ```

### Validation & Error Handling
- **400 Bad Request:** Returned when:
  - Request body is missing or empty (`{}`).
  - `assignee` is not a string (e.g. number, boolean, object).
  - `assignee` is an empty string `""` or whitespace only `"   "`.
  - Response: `{ "error": "assignee is required and must be a non-empty string" }`
- **404 Not Found:** Returned when the task with the specified `:id` does not exist.
  - Response: `{ "error": "Task not found" }`

### Design Decisions
1. **Architectural Consistency:** Added `validateAssignTask` to `src/utils/validators.js`, `assignTask` to `src/services/taskService.js`, and the endpoint to `src/routes/tasks.js`. The route handler remains thin and focuses on HTTP protocol duties.
2. **Whitespace Trimming:** `req.body.assignee.trim()` is performed to ensure clean data storage while rejecting empty/whitespace-only input.
3. **Reassignment Support:** Reassigning an already assigned task seamlessly updates the `assignee` field to the new user.

---

## 3. Testing Strategy

### Frameworks & Tools
- **Jest 29.7.0** as test runner and assertion library.
- **Supertest 6.3.4** for HTTP integration testing against Express.

### Test Isolation
- Complete test isolation is guaranteed by invoking `taskService._reset()` in a `beforeEach` hook across every test suite.
- No test depends on execution order or shared mutable state.

### Test Categories
1. **Unit Tests (`tests/unit/taskService.test.js`)**:
   - `create`: default values, custom fields, in-memory persistence.
   - `getAll`: empty state, all items, shallow copy integrity.
   - `findById`: existing ID lookup, missing ID returning `undefined`.
   - `getByStatus`: exact status matching, empty result on no matches, non-matching substrings.
   - `getPaginated`: 1-based offset calculation, multi-page retrieval, out-of-range pages.
   - `getStats`: initial zero counts, counts by status, overdue task logic (excluding completed tasks and future/null due dates).
   - `update`: field updates, non-existent ID handling.
   - `remove`: deletion verification, non-existent ID handling.
   - `completeTask`: status update to 'done', ISO timestamp generation, priority preservation.
   - `assignTask`: assignment, reassignment, non-existent ID handling.
   - `_reset`: store clearance.

2. **Validator Unit Tests (`tests/unit/validators.test.js`)**:
   - `validateCreateTask`: required title, non-empty string, valid enums for status/priority, valid ISO date parsing, null/falsy dates.
   - `validateUpdateTask`: optional fields, non-empty title if provided, enum validations, ISO date validation.
   - `validateAssignTask`: non-empty string validation, missing/null/type checks.

3. **API Integration Tests (`tests/integration/tasks.test.js`)**:
   - Full HTTP lifecycle tests for all endpoints:
     - `GET /tasks` (all, status filter, pagination, combined filter + pagination)
     - `POST /tasks` (201 created, 400 validation failures)
     - `PUT /tasks/:id` (200 updated, 404 not found, 400 validation failures)
     - `DELETE /tasks/:id` (204 no content, 404 not found, persistence removal verification)
     - `PATCH /tasks/:id/complete` (200 completed, 404 not found, priority preservation)
     - `PATCH /tasks/:id/assign` (200 assigned, 200 reassigned, 400 validation errors, 404 not found)
     - `GET /tasks/stats` (200 correct aggregates and overdue calculations)

### Coverage Results
```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-----------------|---------|----------|---------|---------|-------------------
All files        |    97.5 |    96.73 |   93.33 |   97.26 |                   
 src             |   69.23 |       75 |       0 |   69.23 |                   
  app.js         |   69.23 |       75 |       0 |   69.23 | 10-11,17-18       
 src/routes      |     100 |    96.55 |     100 |     100 |                   
  tasks.js       |     100 |    96.55 |     100 |     100 | 20                
 src/services    |     100 |    94.73 |     100 |     100 |                   
  taskService.js |     100 |    94.73 |     100 |     100 | 23                
 src/utils       |     100 |      100 |     100 |     100 |                   
  validators.js  |     100 |      100 |     100 |     100 |                   
-----------------|---------|----------|---------|---------|-------------------
```
*(Uncovered lines in `app.js` correspond solely to the top-level CLI execution guard `if (require.main === module)` and global fallback 500 error handler).*

---

## 4. Assignment Reflections

### What you'd test next if you had more time
1. **Concurrent Request Race Conditions:** Concurrency tests using `Promise.all` against rapid read/write/delete operations to ensure store stability.
2. **Schema Sanitization / Parameter Pollution:** Enforcing strict schema whitelisting on `PUT` and `POST` to reject or strip unknown fields (e.g., preventing client tampering with `id` or `createdAt`).
3. **Due Date Edge Cases:** Testing timezones (UTC vs local offset strings) and leap years in `dueDate` parsing and overdue calculations.
4. **Security / Header Auditing:** Adding tests for rate limiting, CORS configuration, security headers (Helmet), and large JSON payload rejection.

### Anything that surprised you in the codebase
1. **In-memory Store Substring Matching:** `tasks.filter((t) => t.status.includes(status))` was unexpected; querying for `status=do` would return both `todo` and `done`.
2. **Priority Resetting during Completion:** In `completeTask`, hardcoding `priority: 'medium'` directly degraded the task's priority on completion.
3. **1-Based vs 0-Based Offset Confusion:** The route handler established 1-based indexing (`parseInt(page) || 1`), but the service multiplied directly without subtracting 1 (`page * limit`), completely omitting the first page.

### Questions to ask before shipping this to production
1. **Persistence & Scalability:** In-memory storage is ephemeral and non-scalable across multiple cluster instances. What persistent storage layer (e.g. PostgreSQL, Redis, MongoDB) will be adopted?
2. **Authentication & Authorization:** Who is permitted to assign tasks, modify statuses, or delete tasks? Should assignees be validated against an active user directory?
3. **Pagination Contract:** Should paginated responses include metadata headers or a envelope structure (`{ data: [...], pagination: { total, page, limit, totalPages } }`) rather than a raw array?
4. **Unassigning Tasks:** Should `PATCH /tasks/:id/assign` support unassigning (e.g., passing `null` or a separate `DELETE /tasks/:id/assign` route)?
