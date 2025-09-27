---
description: Push to remote code repository
auto_execution_mode: 3
---

Flow for Cascade: Push + PR via MCP
	1.	Create a new branch (MCP)
	•	Use the MCP server to create the branch, do not use the command line.
	•	Branch naming convention:
CASCADE/<type>-<module>-<date>
Example: CASCADE/test-auth-20250923
	2.	Commit changes (MCP)
	•	Use the MCP server to commit the staged changes.
	•	Commit message format:
CASCADE - <Short commit title>
Example: CASCADE - Add unit tests for Auth JWT middleware
	3.	Push branch to remote (MCP)
	•	Push the newly created branch using the MCP server.
	4.	Open Pull Request (MCP)
	•	Create the PR against the main branch using the MCP server.
	•	Title = same as main commit message.
	•	Body = short summary in bullet points of what was done.