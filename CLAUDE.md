# Everything Claude Code — Arsenal Reference

> Distilled from [affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code) (35k+ stars)
> Battle-tested configs from 10+ months of daily use by an Anthropic hackathon winner.

---

## Quick Install

```bash
# Option 1: Plugin (recommended)
/plugin marketplace add affaan-m/everything-claude-code
/plugin install everything-claude-code@everything-claude-code

# Option 2: Manual
git clone https://github.com/affaan-m/everything-claude-code.git
cd everything-claude-code
./install.sh typescript   # or python, golang, swift (can combine)

# Rules must be copied manually (plugin limitation)
cp -r rules/common/* ~/.claude/rules/
```

After install you get: **16 agents, 65 skills, 40 commands**.

---

## Architecture Overview

```
~/.claude/
├── agents/        # Subagents with scoped tools & models
├── skills/        # Workflow definitions & domain knowledge
├── commands/      # Slash commands (quick-trigger skills)
├── rules/         # Always-follow guidelines (modular .md)
├── contexts/      # Dynamic system prompt injection files
└── settings.json  # Hooks, MCPs, plugins
```

**Rules** = what to do (always active, non-negotiable)
**Skills** = how to do it (loaded per-workflow)
**Commands** = trigger skills via `/slash`
**Agents** = scoped delegates with limited tools & model choice

---

## Agents (Subagents)

Subagents save context by returning summaries instead of dumping everything. Format:

```markdown
---
name: code-reviewer
description: Reviews code for quality, security, and maintainability
tools: ["Read", "Grep", "Glob", "Bash"]
model: opus
---
You are a senior code reviewer...
```

### Available Agents

| Agent | Purpose |
|-------|---------|
| `planner` | Feature implementation planning |
| `architect` | System design decisions |
| `tdd-guide` | Test-driven development |
| `code-reviewer` | Quality and security review |
| `security-reviewer` | Vulnerability analysis |
| `build-error-resolver` | Fix build errors |
| `e2e-runner` | Playwright E2E testing |
| `refactor-cleaner` | Dead code cleanup |
| `doc-updater` | Documentation sync |
| `go-reviewer` | Go-specific code review |
| `go-build-resolver` | Go build error resolution |

### Orchestrator Pattern (Sequential Phases)

```
Phase 1: RESEARCH   → research-summary.md
Phase 2: PLAN       → plan.md
Phase 3: IMPLEMENT  → code changes
Phase 4: REVIEW     → review-comments.md
Phase 5: VERIFY     → done or loop back
```

**Key rules:**
- Each agent gets ONE input, produces ONE output
- Outputs become inputs for next phase
- Never skip phases
- Use `/clear` between agents
- Store intermediate outputs in files

### Iterative Retrieval Pattern

The orchestrator has semantic context the sub-agent lacks. Fix this:

1. Orchestrator evaluates every sub-agent return
2. Ask follow-up questions before accepting
3. Sub-agent refines, returns updated answer
4. Loop until sufficient (max 3 cycles)

Pass **objective context**, not just the query.

---

## Commands (Slash Commands)

| Command | What It Does |
|---------|-------------|
| `/plan` | Implementation planning |
| `/tdd` | Test-driven development workflow |
| `/e2e` | E2E test generation |
| `/code-review` | Quality review |
| `/build-fix` | Fix build errors |
| `/refactor-clean` | Dead code removal |
| `/learn` | Extract patterns mid-session |
| `/checkpoint` | Save verification state |
| `/verify` | Run verification loop |
| `/go-review` | Go code review |
| `/go-test` | Go TDD workflow |
| `/go-build` | Fix Go build errors |
| `/skill-create` | Generate skills from git history |
| `/instinct-status` | View learned instincts |
| `/evolve` | Cluster instincts into skills |
| `/setup-pm` | Configure package manager |

---

## Rules (Always-Follow)

### Common Rules (`rules/common/`)

| File | Enforces |
|------|----------|
| `security.md` | No hardcoded secrets, validate inputs |
| `coding-style.md` | Immutability as default, file organization |
| `testing.md` | TDD workflow, 80% coverage requirement |
| `git-workflow.md` | Commit format, PR process |
| `agents.md` | When to delegate to subagents |
| `performance.md` | Model selection, context management |
| `patterns.md` | Design patterns & anti-patterns |
| `hooks.md` | Hook conventions |
| `development-workflow.md` | Dev process standards |

Language-specific rule directories (`typescript/`, `python/`, `golang/`, `swift/`) extend common rules with framework-specific patterns.

---

## Skills

### Core Skills

| Skill | Purpose |
|-------|---------|
| `coding-standards/` | Language best practices |
| `backend-patterns/` | API, database, caching patterns |
| `frontend-patterns/` | React, Next.js patterns |
| `tdd-workflow/` | TDD methodology |
| `security-review/` | Security checklist |
| `golang-patterns/` | Go idioms |
| `golang-testing/` | Go TDD, benchmarks |

### Advanced Skills

| Skill | Purpose |
|-------|---------|
| `continuous-learning/` | Auto-extract patterns from sessions |
| `continuous-learning-v2/` | Instinct-based learning with confidence scoring |
| `iterative-retrieval/` | Progressive context refinement for subagents |
| `strategic-compact/` | Manual compaction suggestions |
| `eval-harness/` | Verification loop evaluation |
| `verification-loop/` | Continuous verification |

---

## Hooks

Hooks fire on tool events and lifecycle moments. Stored in `hooks/hooks.json`.

### Example: Warn on console.log

```json
{
  "PostToolUse": [{
    "matcher": "tool == \"Edit\" && tool_input.file_path matches \"\\\\.(ts|tsx|js|jsx)$\"",
    "hooks": [{
      "type": "command",
      "command": "grep -n 'console\\.log' \"$file_path\" && echo '[Hook] Remove console.log' >&2"
    }]
  }]
}
```

### Memory Persistence Hooks

| Hook | When | What |
|------|------|------|
| `PreCompact` | Before context compaction | Save important state to file |
| `Stop` (Session End) | Session ends | Persist learnings |
| `SessionStart` | New session begins | Load previous context |

**Why Stop hook, not UserPromptSubmit?** UserPromptSubmit runs every message (adds latency). Stop runs once at session end — lightweight.

### Runtime Controls

```bash
ECC_HOOK_PROFILE=minimal|standard|strict
ECC_DISABLED_HOOKS=hook1,hook2
```

---

## Token Optimization

### Model Selection

| Task | Model | Why |
|------|-------|-----|
| Exploration/search | Haiku | Fast, cheap, good enough |
| Simple edits | Haiku | Single-file, clear instructions |
| Multi-file implementation | Sonnet | Best coding balance |
| Complex architecture | Opus | Deep reasoning needed |
| PR reviews | Sonnet | Context + nuance |
| Security analysis | Opus | Can't afford misses |
| Writing docs | Haiku | Structure is simple |
| Complex debugging | Opus | Needs whole system in mind |

**Default to Sonnet for 90% of coding tasks.** Upgrade to Opus when: first attempt failed, 5+ files involved, architectural decisions, or security-critical code.

### Replace MCPs with CLI + Skills

MCPs eat context window. Most platforms have CLIs that MCPs just wrap.

Instead of GitHub MCP → create `/gh-pr` command wrapping `gh pr create`
Instead of Supabase MCP → skills using Supabase CLI directly

**Context window rule of thumb:**
- Configure 20-30 MCPs total
- Keep <10 enabled per project
- Under 80 tools active
- Use `disabledMcpServers` in project config

### Tool Optimization

Replace `grep` with `mgrep` — ~50% token reduction on average vs grep/ripgrep at similar or better quality.

### Modular Codebase

Files in hundreds of lines, not thousands. Helps token costs AND first-try accuracy.

---

## Context & Memory Management

### Session Memory Files

Save session state to `.tmp` files. Next session loads context and picks up where you left off.

Session files should contain:
- What approaches worked (with evidence)
- Which approaches were attempted but failed
- What's left to do

### Dynamic System Prompt Injection

Instead of loading everything every session via CLAUDE.md or rules:

```bash
claude --system-prompt "$(cat memory.md)"
```

System prompt > user messages > tool results (authority hierarchy).

**Practical aliases:**

```bash
alias claude-dev='claude --system-prompt "$(cat ~/.claude/contexts/dev.md)"'
alias claude-review='claude --system-prompt "$(cat ~/.claude/contexts/review.md)"'
alias claude-research='claude --system-prompt "$(cat ~/.claude/contexts/research.md)"'
```

### Strategic Compacting

Disable auto compact. Manually compact at logical intervals. Clear context after planning phase — exploration context isn't relevant to execution.

---

## Continuous Learning

When Claude discovers non-trivial patterns (debugging techniques, workarounds, project-specific knowledge), it saves them as skills. Next similar problem → skill loads automatically.

### v2: Instinct-Based Learning

```bash
/instinct-status        # Show learned instincts with confidence
/instinct-import <file> # Import instincts from others
/instinct-export        # Export for sharing
/evolve                 # Cluster related instincts into skills
```

---

## Verification Loops & Evals

### Eval Types

- **Checkpoint-Based**: Set explicit checkpoints, verify against criteria, fix before proceeding
- **Continuous**: Run every N minutes or after major changes (full test suite + lint)

### Key Metrics

```
pass@k: At least ONE of k attempts succeeds
        k=1: 70%  k=3: 91%  k=5: 97%

pass^k: ALL k attempts must succeed
        k=1: 70%  k=3: 34%  k=5: 17%
```

Use **pass@k** when you just need it to work. Use **pass^k** when consistency matters.

### Benchmarking Skills

Fork the conversation, run one instance with the skill and one without, diff the outputs.

---

## Parallelization

### Git Worktrees

```bash
git worktree add ../project-feature-a feature-a
git worktree add ../project-feature-b feature-b
cd ../project-feature-a && claude
```

Each worktree gets its own Claude instance. Use `/rename <name>` for all chats.

### The Cascade Method

- Open new tasks in new tabs to the right
- Sweep left to right (oldest → newest)
- Focus on at most 3-4 tasks at a time

### Two-Instance Kickoff Pattern

**Instance 1: Scaffolding Agent** — project structure, configs, CLAUDE.md, rules
**Instance 2: Deep Research Agent** — PRD, architecture diagrams, documentation clips

### Golden Rule

**How much can you get done with the minimum viable amount of parallelization?**

Main chat for code changes. Forks for questions about codebase state or external research.

---

## Security (from the Security Guide)

### Attack Vectors

Every entry point is an attack vector:
- Terminal input
- CLAUDE.md files in cloned repos
- MCP servers pulling external data
- Skills linking to external documentation

More connections = more risk. Compounding: one compromised channel can leverage access to everything.

### Defenses

- Audit community-contributed skills for hidden instructions (HTML comments, invisible unicode)
- Scope MCP server permissions narrowly
- Use `npx ecc-agentshield scan` to scan configs for vulnerabilities
- Don't trust foreign CLAUDE.md files blindly

---

## Useful Patterns

### llms.txt

Many documentation sites serve `/llms.txt` — an LLM-optimized version of their docs. Check for it when researching.

### Terminal Aliases

```bash
alias c='claude'
alias gb='github'
alias co='code'
alias q='cd ~/Desktop/projects'
```

### Voice Transcription

superwhisper or MacWhisper on Mac. Even with transcription mistakes, Claude understands intent. Faster than typing for many workflows.

### Custom Status Line

Use `/statusline` in Claude Code to set a custom status display.

---

## Example CLAUDE.md Structure

```markdown
# Project: MyApp

## Tech Stack
- Next.js 14, TypeScript, Tailwind
- Supabase (auth, database, storage)
- Vercel deployment

## Architecture
[Brief description of key patterns]

## Commands
- `npm run dev` — local development
- `npm run test` — run test suite
- `npm run build` — production build

## Conventions
- Use server components by default
- Client components only when interactivity needed
- All API routes in /app/api/
- Database queries through Supabase client only

## Current Focus
[What you're working on right now]
```

---

## MCP Configs

Example configs for: GitHub, Supabase, Vercel, Railway, and more are in `mcp-configs/mcp-servers.json`.

Replace `YOUR_*_HERE` placeholders with actual API keys.

---

## Links

- **Repo**: https://github.com/affaan-m/everything-claude-code
- **Shorthand Guide** (start here): https://x.com/affaanmustafa/status/2012378465664745795
- **Longform Guide** (advanced): https://x.com/affaanmustafa/status/2014040193557471352
- **Security Guide**: In repo at `the-security-guide.md`
- **AgentShield** (security scanner): `npx ecc-agentshield scan`
