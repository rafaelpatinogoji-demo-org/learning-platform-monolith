---
trigger: always_on
---

Concurrency & Non-Overlap Rules:
	1.	Do not edit or reformat files outside your task’s module unless explicitly required.
	2.	Do not change shared utilities, middleware, or existing routes’ response structures.
	3.	Do not bump/assume versions or rely on any version fields in responses or routes. Treat them as informational only.
	4.	Avoid large refactors, renames, or “cleanup” outside your scope.
	5.	If a helper is needed, create it inside your module (e.g., modules/progress/*, modules/notifications/*) and import locally.
	6.	If you must touch a shared file (router index, error types), keep the diff minimal