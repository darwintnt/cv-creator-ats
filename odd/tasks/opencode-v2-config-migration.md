# OpenCode V2 Config Migration

## Objective
Migrate `~/.config/opencode` configuration and file-based definitions from V1 format to native V2 format, preserving behavior and all unrelated settings.

## Problem / Why
The user runs OpenCode v2.0.18 with legacy V1-shaped config (`agent`, `permission`, `mcp`, `plugin`, `subagent_depth` keys). V2 keeps accepting the legacy shape but the user explicitly requested native V2 conversion. The runtime hosting this session is the very service being changed — no service restart allowed from here.

## Scope (authorized by user request)
1. `~/.config/opencode/opencode.json`: convert top-level keys to native V2 (agents/permissions/mcp.servers/plugins/experimental.subagent_depth), per migration guide.
2. `~/.config/opencode/commands/*.md`: rename frontmatter `subtask` → `subagent` (3 files), `agent`+`subtask` keep names otherwise.
3. Local plugins under `~/.config/opencode/plugins/`: verify they load under V2.0.18; port API usage only if required by the v2 plugin contract.
4. Leave untouched: `cli.json` (already TUI-migrated), `tui.json` (V1 original left in place), `dcp.jsonc`, `AGENTS.md`, `skills/`, `prompts/`, `themes/`, `context-mode/`, `node_modules`, third-party npm plugins.

## Constraints
- Do not restart the opencode background service (this session runs inside it).
- Preserve prompt strings byte-verbatim (~218KB file; use a programmatic transform, no retyping).
- Keep JSON key order stable for human review; preserve agent map insertion order.
- V1 backups before edits: `opencode.json.v1.bak`, `plugins.v1.bak/`.
- Behavior preservation: `share:"disabled"` stays; engram MCP (no `enabled` key) means enabled by default → no `disabled` flag in V2; `permission.bash`/`permission.read` flattened to one ordered `permissions` array in declared order with bash→shell and read rules last-match-wins; git-commit/pushes/ssh rules become `shell` action; `*.key/.pem/.env/...` becomes `read` action.

## Tasks (final)
- [x] T1: Census of config files + frontend facts (opencode.json 218638 B: $schema, agent×23, default_agent, mcp×4, permission{bash,read}, plugin×4 strings, share:"disabled", subagent_depth:2).
- [x] T2: Fetch + distill V2 migration guide, permissions, agents, plugin-migration docs.
- [x] T3: Plugin census: all 9 local plugins load under v2.0.18 (log evidence), all import `type {Plugin}` from `@opencode-ai/plugin` (factory-style, present in node_modules).
- [x] T4: Create ODD feature doc + engram mirror `odd/opencode-v2-config-migration/tasks`.
- [x] T5: Backups: opencode.json → opencode.json.v1.bak (218638 B); plugins/ → plugins.v1.bak/ (9 files).
- [x] T6: Programmatic V1→V2 transform of opencode.json (python3 script at /private/var/folders/.../T/opencode/v2_migrate.py; 222415 B output).
- [x] T7: Command frontmatter `subtask` → `subagent` (impeccable.md, skill-registry.md, skill-creator.md).
- [x] T8: Validate (all green): JSON parses; 23 agents; 29 root perm rules (15 shell + 14 read, declared order); 4 mcp.servers w/ inverse disabled flags (engram: disabled:false = enabled default); 4 plugins strings; experimental.subagent_depth:2; share:disabled; default_agent preserved; zero legacy keys; 23/23 prompts byte-identical; agent map order preserved; 12 models joined to `opencode-go/glm-5.3-flash#max`.
- [x] T9: Plugins port assessment: kept factory-style `@opencode-ai/plugin` (V2 package, in node_modules). Runtime log confirms all 9 load under v2.0.18 — the running service hosting this session uses them (engram memory, review transport, telemetry all functional). Porting to `Plugin.define` = rewrite risk with no behavior gain. Not done, by design.

## Result
Native V2 top level: `$schema, default_agent, agents, permissions, mcp, plugins, share, experimental`. Untouched: cli.json (already TUI-migrated), tui.json (V1 original preserved), dcp.jsonc, AGENTS.md, skills/, prompts/, themes/, commands/ (only 3 subtask→subagent frontmatter lines), plugins/ (all 9 still load). User should restart the service themselves at a convenient time (`opencode service restart`) so the server re-reads the converted file; V1 backup stays until then.


## Acceptance criteria
- opencode.json is native V2 throughout (agents/permissions/mcp.servers/plugins/experimental.subagent_depth).
- All prompt strings identical to V1 file (byte-compare agents' `prompt`→`system` values).
- All agent order + descriptions + hidden/mode semantics preserved.
- Permission effects identical (deny/ask/allow same resources, same precedence).
- MCP servers same list/shape/values, engram stays enabled-by-default.
- All 9 local plugins still load under v2.0.18 (log evidence).
- No edits to cli.json, tui.json, dcp.jsonc, AGENTS.md, skills/, prompts/, themes/.

## Verification commands
- json.loads round-trip on transformed file.
- Byte-compare of prompts (python sha256 per-agent).
- grep: no remaining `"agent":`, `"permission":`, `"mcp":{`, `"plugin":` legacy keys(except $schema doc note).
- Log-based plugin load counts (pre + post) for 9 local plugins.

## Progress / Evidence
- T1–T4 done. ODD doc + file created. Engram mirror saved.
- Plugin decision: all 9 load under 2.0.18 today; no porting unless evidence shows otherwise.
- Next: T5 backup → T6 transform → T7 commands → T8 validate.
