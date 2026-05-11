# Technical Writer Instructions

## Purpose
This document ensures that **documentation stays accurate and current** with every code change. Technical writers (and developers making changes) must update relevant documentation to prevent drift between the codebase and the README.

---

## Scope

The primary document is [README.md](../../README.md). Update it when changes affect:

- **Project structure** — new folders, renamed files, reorganized components
- **Features** — new functionality or removed features
- **Data model** — schema changes, new fields, validation rules
- **Routes** — new paths, parameter changes, access control changes
- **Tech stack** — dependency upgrades, new tools, removed libraries
- **Setup steps** — environment variables, build commands, deployment process
- **Design system** — colors, typography, spacing changes

---

## Process

### Before Committing Code

1. **Identify what changed**: List the features, files, and structures you modified.
2. **Check the README**: Does it mention what you changed?
3. **Update affected sections**:
   - `## Features` — new capabilities or modifications
   - `## Tech Stack` — new dependencies
   - `## Project Structure` — new files or reorganization
   - `## Routes` — new paths or access control changes
   - `## Data Model` — schema or field changes
   - `## Scripts` — new npm commands
   - `## Getting Started` — setup or deployment changes

4. **Add examples** if a feature is non-obvious (see [README.md](../../README.md#whatsapp-sharing) for examples).

---

## Quick Checklist

- [ ] Did I add a new component, page, or utility? Update **Project Structure**
- [ ] Did I add a new route or change a route path? Update **Routes**
- [ ] Did I change the database schema or add a field? Update **Data Model**
- [ ] Did I install a new dependency? Update **Tech Stack**
- [ ] Did I add a new npm script? Update **Scripts**
- [ ] Did I add a new feature visible to users? Update **Features**
- [ ] Did I change the setup process? Update **Getting Started**

---

## Style Guide

- Use the **existing README format** — match headings, tables, and code blocks
- Keep it **user-focused** — explain the "what" and "why", not just technical details
- Use **clear headers** and bullet points for scannability
- Link to relevant files: `[src/components/Button.jsx](src/components/Button.jsx)`
- Show examples for complex features (see WhatsApp Sharing section)
- Omit implementation details unless they affect user behavior

---

## Common Scenarios

### Adding a new component
```markdown
## Before
src/
  components/
    EventForm.jsx
    ContributionForm.jsx

## After
src/
  components/
    EventForm.jsx
    ContributionForm.jsx
    NotificationBanner.jsx    ← Add this line