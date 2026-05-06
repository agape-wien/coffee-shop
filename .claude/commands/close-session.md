Close out the current working session by updating all project documentation to reflect what was actually done. Follow these steps in order.

## 1. Gather facts — read before writing anything

- Read `docs/TRACKER.md` (current state baseline)
- Read `docs/PLANNING.md` (phase checklists)
- Run `git diff --stat HEAD` to see which files changed this session
- Run `git status` to catch any untracked new files

## 2. Update `docs/TRACKER.md`

- Set **Current status** → phase name, brief description of where things stand, today's date
- Set **Active work** → "Nothing in progress — session closed cleanly."
- Move anything completed this session into the correct "Completed" section with `[x]`
- Rewrite **Next up** to reflect the actual remaining work, in priority order, with a numbered list a new session can follow without re-deriving anything
- Update the **Upcoming phases** table — mark phases as "Done", "Partial", or "Not started"
- Add any new architectural decisions made this session to the **Decision log** with a reason

## 3. Update `docs/PLANNING.md`

- Check off (`[x]`) any tasks completed this session
- If a task was partially done, add a sub-note explaining what remains

## 4. Update memory

- Read `C:\Users\aonisor\.claude\projects\C--order-app-new\memory\MEMORY.md` and relevant memory files
- Update `project_coffeeshop.md` to reflect the current implementation state (what files exist, what's working, what's next)
- Save any new user preferences or feedback learned this session as appropriate memory entries
- Do not duplicate information already in memory — update in place

## 5. Report back

Give a short summary (5–8 bullet points) of:
- What was completed
- What's blocked or missing
- What the next session should start with
