# Working on the Navon website — a guide for [co-founder]

You don't need to be a coder to change the site. You'll work through **Claude
Code** — you describe what you want in plain English, and it makes the change,
checks it, and ships it to a safe practice area for review. This guide is the
whole routine. Read it once, then keep it handy.

---

## The one thing to understand first: two "versions" of the site

There are two copies of the website, called **branches**:

- **`main`** — the **live** site. This is what the world sees at **navon.africa**.
  You never touch this directly.
- **`staging`** — the **practice / draft** copy. This is where all your changes
  go first. Breaking something here is totally fine and hurts nobody.

**Your golden rule: everything you do happens on `staging`. Never on `main`.**

When your change looks good on staging, Karan (or Claude) reviews it and then
"merges" it to `main` — that's the moment it goes live. You don't do that step,
and that's on purpose: it's the safety net.

Think of it like a Google Doc with "Suggesting" mode on. You suggest; someone
accepts. Nothing you do can break the live site.

---

## One-time setup (do this once, with Karan's help if needed)

1. **Get added to the project.** Karan adds your GitHub account as a collaborator
   so you're allowed to save changes. (Karan: GitHub repo → Settings → Collaborators.)
2. **Install Claude Code** on your laptop and open this project folder in it.
3. That's it. You won't be typing code or git commands — Claude does that.

---

## The routine for EVERY change (5 steps)

Do this start-to-finish for each change. Keep each change small — one thing at a
time (see "Keep changes small" below).

### Step 1 — Open Claude Code and prime it

At the very start of every session, paste this in:

> **"Read CO-FOUNDER-GUIDE.md and act as my guide for it. I'm the non-technical
> co-founder. Always work on the `staging` branch, never `main`. Before we start,
> get the latest version of staging."**

This tells Claude the rules so it keeps you safe automatically.

### Step 2 — Describe the change in plain English

Just say what you want, like you'd tell a designer. Examples:

> "On the About page, change the headline to 'Building Africa's deep-tech backbone.'"

> "On the home page, the second paragraph has a typo — 'recieve' should be 'receive.'"

> "Swap the partner logo in the third slot for the new one I just put in this folder."

Be specific about **which page** and **what exactly** should change. If you're
unsure where something lives, just ask: *"Which page is the partners section on?"*

### Step 3 — Look at it before saving

Ask Claude to show you the result:

> **"Show me what this looks like — start the preview and take a screenshot."**

Claude can run the site locally and show you a picture. Check it's what you wanted.
If not, just say what's off and have it adjust. Repeat until you're happy.

### Step 4 — Push it to staging

When you're happy, say:

> **"Looks good. Save this to the `staging` branch with a short note describing
> the change."**

Claude will commit and push to `staging`. This is safe — it does NOT go live.

### Step 5 — Hand it off for review

Tell Claude:

> **"Open a pull request from `staging` to `main` describing what changed, and
> tag Karan as the reviewer."**

That creates a tidy summary of your change for Karan to approve.

**Bonus — see your change on a real, live web page.** A minute or two after you
push to staging, your change is automatically published to a private preview
site you can open in any browser:

> **https://staging.navon-site.pages.dev**

This is a *safe copy* — it is NOT the public site. Open it, check your change
looks right, and share that link with Karan so he can see exactly what he's
approving. Then message him: *"New change on staging, ready for review —
here's the preview: staging.navon-site.pages.dev."* He (or Claude) reviews and
merges to `main` — and only then does it go live on navon.africa. **You're done.**

> Note: the live site (`main`) is locked — changes can only reach it through a
> reviewed pull request that Karan approves. So there's genuinely no way for you
> to break navon.africa by accident. Work freely.

---

## Keep changes small (this is the most important habit)

One change = one idea. Fix the typo, push, hand off. Then start fresh for the
next thing. **Don't** batch up ten edits across five pages into one go.

Why: small changes are easy to review, easy to understand, and if something's
ever wrong it's obvious what caused it. A big pile of mixed changes is slow to
review and risky to ship. When in doubt, ship smaller.

If you catch yourself saying "and also, while we're here…" — stop, push what you
have, and make that a separate change.

---

## Golden rules (the short list)

✅ **Do**
- Start every session by priming Claude with the Step 1 prompt.
- Work only on `staging`.
- Make one small change at a time.
- Look at the preview before you push.
- Push to `staging`, then hand off for review.

🚫 **Don't**
- Don't push to `main` or merge anything yourself — that's the review step,
  always done by Karan/Claude.
- Don't edit lots of things at once.
- Don't touch anything Claude tells you is "config", "deploy", "the build", or
  files ending in `.yml`, `.mjs`, `.json`, or `.toml`. If a change seems to need
  that, stop and ask Karan first.
- Don't delete files or whole sections unless that's exactly the change you mean.
- If Claude warns you something is risky or unusual, **pause and ask Karan**
  rather than approving it.

---

## If something feels stuck or scary

Nothing you do on `staging` can hurt the live site, so don't panic. If you're
confused, just ask Claude in plain words:

> "Did that change save correctly? What branch am I on right now?"
>
> "I think I messed something up — can you undo my last change on staging?"
>
> "Can you explain in simple terms what just happened?"

And if you're ever unsure whether to approve something Claude is about to do:
**when in doubt, don't — message Karan.** A 2-minute question is always cheaper
than fixing a mistake.

---

## Quick reference — copy-paste prompts

| When | Say this to Claude |
|------|--------------------|
| Start of session | *"Read CO-FOUNDER-GUIDE.md and act as my guide. Work on `staging`, never `main`. Pull the latest staging."* |
| Make a change | *"On the [page] page, change [thing] to [new thing]."* |
| Preview it | *"Start the preview and show me a screenshot."* |
| Save it | *"Save this to `staging` with a short note describing the change."* |
| Hand off | *"Open a pull request from `staging` to `main` and tag Karan."* |
| See it live | Open **staging.navon-site.pages.dev** in your browser (safe preview, ~2 min after pushing) |
| Undo | *"Undo my last change on staging."* |
| Confused | *"What branch am I on, and what did my last change do? Explain simply."* |
