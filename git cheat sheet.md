Git Solo Flow Cheat Sheet (Andrew’s Edition)

⸻

What this is

Your personal branch-based workflow for safely developing solo on GitHub with VS Code or terminal.

⸻

Typical Flow: From Idea to Merge

1. Update main (always start fresh)

git checkout main
git pull

2. Create a feature branch

Use a clear short name:

git checkout -b my-feature-name

Example:

git checkout -b add-line-spacing

3. Work on your changes
	•	Edit files.
	•	Test locally.
	•	Review.

4. Commit your work

Check changes:

git status

Stage and commit:

git add .
git commit -m "Clear message describing your change"

Example:

git commit -m "Add support for JSON-based row line spacing"

5. Push your branch (optional but recommended)

git push -u origin my-feature-name

6. Merge back into main when done

Switch to main:

git checkout main
git pull

Merge your feature branch:

git merge my-feature-name

Push updated main to GitHub:

git push

7. Clean up old branch

git branch -d my-feature-name


⸻

Golden Rules
	•	Never code directly on main.
	•	Always branch before starting.
	•	Always pull before merging.
	•	Always push after merging.
	•	Clean up old branches.

⸻

Recovery Tip (if you accidentally committed on main)

git checkout -b fix-my-mistake
git push -u origin fix-my-mistake


⸻

Quick Branch Check

List local branches:

git branch

List local + remote:

git branch -a


⸻

Summary

With this simple solo flow you are:
	•	Safe
	•	Efficient
	•	Future-proof
	•	Avoiding overwrites or lost work

⸻

Keep this file in your repo as GIT-SOLO-FLOW.md for easy reference!