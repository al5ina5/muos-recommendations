# CLI Flags Design for Non-Interactive Mode

## Overview
Add support for running `retro-curator` without prompts using command-line flags. This enables automation, scripting, and CI/CD integration.

---

## Command Structure

### Interactive Mode (Default - Current Behavior)
```bash
retro-curator
# Shows prompts for all configuration options
```

### Non-Interactive Mode (New)
```bash
retro-curator --mode=ssh --os=muos --ip=10.0.0.80 --rom-path=/mnt/sdcard/ROMS ...
# No prompts, uses flags only
```

---

## Flag Design

### Core Connection Flags

| Flag | Short | Required | Type | Description | Example |
|------|-------|----------|------|-------------|---------|
| `--mode` | `-m` | Yes | `ssh\|local` | Connection mode | `--mode=ssh` |
| `--os` | `-o` | Yes | `muos\|spruceos` | Device OS type | `--os=muos` |
| `--ip` | `-i` | If `mode=ssh` | string | Device IP address | `--ip=10.0.0.80` |
| `--local-path` | `-l` | If `mode=local` | string | Local folder path | `--local-path=/Volumes/SDCARD` |

### Path Configuration Flags

| Flag | Required | Type | Description | Example |
|------|----------|------|-------------|---------|
| `--rom-path` | Yes* | string | ROM path (muOS) | `--rom-path=/mnt/sdcard/ROMS` |
| `--rom-paths` | Yes* | string | ROM paths (SpruceOS, comma-separated) | `--rom-paths=/mnt/sdcard/Roms,/media/sdcard1/Roms` |
| `--collection-path` | Yes | string | Collection output path | `--collection-path=/mnt/mmc/MUOS/info/collection` |

*Required based on OS type

### Collection Options Flags

| Flag | Short | Required | Type | Description | Example |
|------|-------|----------|------|-------------|---------|
| `--categories` | `-c` | No | string | Comma-separated categories | `--categories=Essentials,Franchises,Special` |
| `--missing-roms` | | No | `mark\|omit` | How to handle missing ROMs | `--missing-roms=omit` |
| `--numbers` | `-n` | No | boolean | Display numbers | `--numbers` or `--no-numbers` |
| `--deploy` | `-d` | No | boolean | Auto deploy after generation | `--deploy` or `--no-deploy` |
| `--clear-existing` | | No | boolean | Clear existing collections | `--clear-existing` or `--no-clear-existing` |

### Cache Management Flags

| Flag | Short | Required | Type | Description | Example |
|------|-------|----------|------|-------------|---------|
| `--use-cache` | | No | boolean | Use cached ROM list | `--use-cache` or `--no-use-cache` |
| `--clear-cache` | | No | boolean | Clear ROM cache before running | `--clear-cache` |

---

## Use Cases & Examples

### Use Case 1: Quick Run with Saved Settings
**Current:** User runs `retro-curator`, answers "Use saved settings?", confirms, runs.

**With Flags:** Can skip prompts but still benefit from saved defaults:
```bash
# Uses saved settings if available, but no prompts
retro-curator --quick
# Or explicitly use saved settings
retro-curator --use-saved-settings
```

**UX Flow:**
1. User runs `retro-curator --quick`
2. Tool loads saved settings from `.cache/settings.json`
3. If cache exists, uses cached ROM list
4. Runs immediately without prompts
5. If saved settings missing, shows error with instructions

---

### Use Case 2: Full Automation Script
**Scenario:** User wants to run this in a cron job or CI/CD pipeline

```bash
retro-curator \
  --mode=ssh \
  --os=muos \
  --ip=10.0.0.80 \
  --rom-path=/mnt/sdcard/ROMS \
  --collection-path=/mnt/mmc/MUOS/info/collection \
  --categories=Essentials,Franchises \
  --missing-roms=omit \
  --numbers \
  --deploy \
  --clear-existing \
  --no-use-cache
```

**UX Flow:**
1. All flags provided → No prompts shown
2. Validation runs (checks IP format, path format, etc.)
3. If validation fails → Error message with specific issue
4. If validation passes → Runs immediately
5. Success/error output suitable for logging

---

### Use Case 3: Partial Flags (Hybrid Mode)
**Scenario:** User wants to override some settings but keep others from saved config

```bash
# Use saved settings but override IP and deploy flag
retro-curator --ip=10.0.0.92 --deploy
```

**UX Flow:**
1. Loads saved settings as base
2. Overrides with provided flags
3. Shows summary of final settings
4. Prompts once: "Proceed with these settings?"
5. User confirms → Runs

**Alternative (strict mode):**
```bash
# Only use flags, ignore saved settings
retro-curator --no-saved-settings --ip=10.0.0.92 --deploy
# Shows error if required flags missing
```

---

### Use Case 4: First-Time User with Flags
**Scenario:** New user wants to configure everything via flags without prompts

```bash
retro-curator \
  --mode=local \
  --os=muos \
  --local-path=/Volumes/SDCARD \
  --rom-path=ROMS \
  --collection-path=MUOS/info/collection \
  --categories=Essentials,Franchises,Special \
  --missing-roms=mark \
  --numbers \
  --deploy \
  --no-clear-existing
```

**UX Flow:**
1. All required flags provided → No prompts
2. Validates all paths exist (for local mode)
3. Creates collections
4. Deploys if `--deploy` specified
5. Saves settings to `.cache/settings.json` for next time

---

### Use Case 5: SpruceOS Multiple ROM Paths
**Scenario:** SpruceOS user with ROMs on multiple SD cards

```bash
retro-curator \
  --mode=ssh \
  --os=spruceos \
  --ip=10.0.0.93 \
  --rom-paths=/mnt/sdcard/Roms,/media/sdcard1/Roms \
  --collection-path=/mnt/sdcard/Collections \
  --categories=Essentials \
  --deploy
```

**UX Flow:**
1. Detects `--os=spruceos` → expects `--rom-paths` (not `--rom-path`)
2. Validates multiple paths format (comma-separated)
3. Scans all paths for ROMs
4. Generates collections.json
5. Deploys single file

---

## Flag Priority & Precedence

### Order of Precedence (Highest to Lowest):
1. **Command-line flags** (highest priority)
2. **Saved settings** (`.cache/settings.json`)
3. **Defaults** (lowest priority)

### Examples:

**Example A: Flag overrides saved setting**
```bash
# Saved settings have IP=10.0.0.80
retro-curator --ip=10.0.0.92
# Result: Uses 10.0.0.92 (flag wins)
```

**Example B: Saved setting fills missing flag**
```bash
# Saved settings have all configs
retro-curator --ip=10.0.0.92
# Result: Uses 10.0.0.92 for IP, all other settings from saved config
```

**Example C: No saved settings, partial flags**
```bash
# No saved settings exist
retro-curator --ip=10.0.0.92 --os=muos
# Result: Error - missing required flags (--mode, --rom-path, etc.)
```

---

## Validation & Error Handling

### Required Flag Validation

**Mode-Specific Requirements:**
- If `--mode=ssh`: Requires `--ip`, `--os`, `--rom-path` (or `--rom-paths` for SpruceOS), `--collection-path`
- If `--mode=local`: Requires `--local-path`, `--os`, `--rom-path` (or `--rom-paths` for SpruceOS), `--collection-path`

**OS-Specific Requirements:**
- If `--os=muos`: Requires `--rom-path` (single)
- If `--os=spruceos`: Requires `--rom-paths` (comma-separated, can be single)

**Error Messages:**
```bash
# Missing required flag
$ retro-curator --os=muos
[ERROR] Missing required flag: --mode
       Required flags: --mode, --rom-path, --collection-path

# Invalid value
$ retro-curator --mode=invalid
[ERROR] Invalid value for --mode: 'invalid'
       Valid values: ssh, local

# Conflicting flags
$ retro-curator --mode=ssh --local-path=/path
[ERROR] --local-path is only valid with --mode=local
       Use --ip instead for SSH mode
```

---

## Special Flags

### `--quick` / `-q`
Shortcut flag that:
- Uses saved settings (if available)
- Uses cached ROM list (if available)
- Skips all prompts
- Equivalent to: `retro-curator` + "Use saved settings? Yes" + "Proceed? Yes"

**Use Case:** Quick re-run with same settings
```bash
retro-curator --quick
```

### `--dry-run`
Validates flags and shows what would happen, but doesn't actually run:
```bash
retro-curator --mode=ssh --os=muos --ip=10.0.0.80 --dry-run
```

**Output:**
```
[INFO] Dry run mode - no changes will be made

Settings that would be used:
  Connection Mode: SSH
  OS Type: muOS
  Device IP: 10.0.0.80
  ...

[INFO] Would generate collections: Essentials, Franchises
[INFO] Would deploy to: /mnt/mmc/MUOS/info/collection
```

### `--config-file`
Load settings from a specific config file:
```bash
retro-curator --config-file=/path/to/config.json
```

---

## Output Modes

### Default Output (Current)
Normal colored output with progress indicators.

### `--json-output`
Output results as JSON for programmatic use:
```bash
retro-curator --quick --json-output
```

**Output:**
```json
{
  "status": "success",
  "roms_found": 1234,
  "collections_generated": 5,
  "games_matched": 456,
  "deployed": true
}
```

### `--quiet` / `-q`
Minimal output, only errors and final result:
```bash
retro-curator --quick --quiet
```

### `--verbose` / `-v`
Detailed output with debugging info:
```bash
retro-curator --quick --verbose
```

**Note:** `-v` conflicts with `--version`. Use `--version` for version, `--verbose` for verbose mode.

---

## Default Values

When flags are not provided and no saved settings exist:

| Flag | Default Value |
|------|---------------|
| `--mode` | (required) |
| `--os` | (required) |
| `--categories` | `Essentials,Franchises,Special` |
| `--missing-roms` | `mark` (muOS), `omit` (SpruceOS) |
| `--numbers` | `true` |
| `--deploy` | `true` |
| `--clear-existing` | `false` |
| `--use-cache` | `true` (if cache exists) |

---

## Migration Path

### Phase 1: Add Flags, Keep Interactive as Default
- Flags work but interactive mode is still default
- `retro-curator` → Shows prompts (current behavior)
- `retro-curator --flags...` → No prompts (new behavior)

### Phase 2: Smart Mode Detection
- If flags provided → Non-interactive mode
- If no flags → Interactive mode
- Best of both worlds

---

## Implementation Notes

### Flag Parsing Library
Consider using a library like:
- `commander` - Popular, feature-rich
- `yargs` - Powerful, flexible
- `meow` - Minimal, simple
- Built-in `process.argv` - No dependencies, more manual

**Recommendation:** Start with built-in `process.argv` parsing for minimal dependencies, or `commander` for better UX.

### Flag Format Options

**Option A: Equal Sign (Recommended)**
```bash
--mode=ssh
--categories=Essentials,Franchises
```

**Option B: Space Separated**
```bash
--mode ssh
--categories Essentials,Franchises
```

**Option C: Both Supported**
```bash
--mode=ssh
--mode ssh  # Also works
```

**Recommendation:** Support both for flexibility (Option C).

---

## Summary

### Key Benefits:
1. **Automation-friendly** - Can be run in scripts, cron jobs, CI/CD
2. **Flexible** - Works with full flags, partial flags, or saved settings
3. **Backwards compatible** - Interactive mode remains default
4. **User-friendly** - Clear error messages guide users

### Common Commands:

```bash
# Quick run with saved settings
retro-curator --quick

# Full automation
retro-curator --mode=ssh --os=muos --ip=10.0.0.80 --rom-path=... --collection-path=... --deploy

# Override specific settings
retro-curator --ip=10.0.0.92 --deploy

# Dry run to test
retro-curator --mode=ssh --os=muos --ip=10.0.0.80 --rom-path=... --dry-run

# JSON output for scripts
retro-curator --quick --json-output
```

---

## Questions to Consider:

1. Should `--quick` require saved settings, or fall back to defaults if none exist?
2. Should we support environment variables (e.g., `RETRO_CURATOR_IP`)?
3. Should we support config files in addition to flags?
4. How should we handle password/credentials? (SSH currently uses defaults)
5. Should `--help` show all available flags with descriptions?

