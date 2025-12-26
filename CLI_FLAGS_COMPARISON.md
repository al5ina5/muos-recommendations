# CLI Flags: Saved Settings Support Comparison

## Two Approaches

### Option A: No Saved Settings in Non-Interactive Mode (Recommended)
**Philosophy:** Flags are explicit and self-contained. What you see is what you get.

### Option B: Saved Settings as Defaults in Non-Interactive Mode
**Philosophy:** Flags override saved settings. Convenient but less explicit.

---

## Detailed Comparison

### Option A: Explicit Flags Only (Recommended ✅)

#### How It Works:
```bash
# Non-interactive mode - ONLY uses flags + defaults
retro-curator --mode=ssh --os=muos --ip=10.0.0.80 --rom-path=... --collection-path=...

# Interactive mode - uses saved settings
retro-curator
```

#### Pros:
1. ✅ **Predictable & Reproducible**
   - Same command always produces same result
   - No hidden dependencies on saved state
   - Easier to debug - all settings visible in command

2. ✅ **Better for Automation**
   - Scripts are self-contained
   - CI/CD pipelines are reproducible
   - No surprises from external state

3. ✅ **Clear Separation of Concerns**
   - Interactive = uses saved settings (convenient for humans)
   - Non-interactive = explicit flags only (reliable for automation)

4. ✅ **Easier to Document**
   - Flags are the complete source of truth
   - No "it depends on saved settings" explanations needed

5. ✅ **Safer for Production**
   - Won't accidentally use wrong settings from cache
   - Explicit is better than implicit (Zen of Python)

#### Cons:
1. ❌ **More Verbose**
   - Need to specify all flags every time
   - Longer command lines

2. ❌ **Less Convenient for Quick Tweaks**
   - Can't just override one setting
   - Must provide full config

#### Use Cases:

**Automation Script:**
```bash
#!/bin/bash
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
  --clear-existing
```

**Cron Job:**
```bash
0 2 * * * retro-curator --mode=ssh --os=muos --ip=10.0.0.80 --rom-path=... --collection-path=... --deploy
```

**CI/CD Pipeline:**
```yaml
- name: Generate Collections
  run: |
    retro-curator \
      --mode=ssh \
      --os=muos \
      --ip=${{ secrets.DEVICE_IP }} \
      --rom-path=/mnt/sdcard/ROMS \
      --collection-path=/mnt/mmc/MUOS/info/collection \
      --deploy
```

---

### Option B: Saved Settings as Defaults

#### How It Works:
```bash
# Non-interactive mode - uses saved settings + flag overrides
retro-curator --ip=10.0.0.92 --deploy

# Interactive mode - uses saved settings
retro-curator
```

#### Pros:
1. ✅ **More Convenient**
   - Can override just what you need
   - Less typing for quick changes
   - Feels more flexible

2. ✅ **Backwards Compatible Feel**
   - Similar to how many CLI tools work
   - Familiar pattern

#### Cons:
1. ❌ **Less Predictable**
   - Same command might behave differently
   - Depends on external state (saved settings)
   - Harder to reason about

2. ❌ **Worse for Automation**
   - Scripts depend on saved state
   - Not self-contained
   - CI/CD might fail if settings missing
   - Harder to debug (what settings are actually being used?)

3. ❌ **Hidden Dependencies**
   - Need to check saved settings to understand behavior
   - Not explicit about what's happening

4. ❌ **Error-Prone**
   - Might accidentally use wrong settings
   - Settings file could be corrupted
   - Settings might be for different device/environment

5. ❌ **Harder to Document**
   - "These flags override saved settings, except when..."
   - Need to explain priority rules
   - More complex mental model

#### Use Cases:

**Quick Override:**
```bash
# Uses saved settings, but changes IP and enables deploy
retro-curator --ip=10.0.0.92 --deploy
```

**Problem Example:**
```bash
# Developer A's machine - saved settings for Device A
retro-curator --ip=10.0.0.93
# Uses Device A's other settings + Device B's IP
# Could cause issues!

# Developer B's machine - different saved settings
retro-curator --ip=10.0.0.93
# Different behavior! Not reproducible.
```

---

## Recommendation: Option A (Explicit Flags Only) ✅

### Why Option A is Better:

#### 1. **Automation-First Design**
Non-interactive mode is primarily for automation. Automation needs:
- Predictable behavior
- Self-contained scripts
- Reproducible results
- No hidden dependencies

Option A delivers all of these.

#### 2. **Principle of Least Surprise**
When you run a command with flags, you expect those flags to be the complete configuration. Using saved settings violates this expectation.

#### 3. **Clear Mental Model**
```
Interactive Mode:     Saved Settings → Prompts → Run
Non-Interactive Mode: Flags → Validate → Run
```
Simple, clear, no confusion.

#### 4. **Better Error Handling**
```bash
# Option A: Clear error if missing required flags
$ retro-curator --ip=10.0.0.80
[ERROR] Missing required flags: --mode, --os, --rom-path, --collection-path

# Option B: Might use saved settings, might fail, unclear behavior
$ retro-curator --ip=10.0.0.80
# What happens? Depends on saved settings! Confusing.
```

---

## Hybrid Approach (Best of Both Worlds)

We can offer both, with clear separation:

### Option A: Explicit Mode (Default for flags)
```bash
# No saved settings used
retro-curator --mode=ssh --os=muos --ip=10.0.0.80 ...
```

### Special Flag: `--use-saved` (Opt-in to saved settings)
```bash
# Explicitly opt-in to using saved settings
retro-curator --use-saved --ip=10.0.0.92 --deploy
```

This gives:
- ✅ Default behavior is explicit (better for automation)
- ✅ Option to use saved settings when convenient (opt-in)
- ✅ Clear intent - `--use-saved` makes it obvious

---

## Minimum Required Flags

For Option A (explicit flags only), minimum required flags:

### Mode-Specific Minimums:

**SSH Mode:**
```bash
retro-curator \
  --mode=ssh \
  --os=muos \
  --ip=10.0.0.80 \
  --rom-path=/mnt/sdcard/ROMS \
  --collection-path=/mnt/mmc/MUOS/info/collection
```

**Local Mode:**
```bash
retro-curator \
  --mode=local \
  --os=muos \
  --local-path=/Volumes/SDCARD \
  --rom-path=ROMS \
  --collection-path=MUOS/info/collection
```

### Optional Flags (with defaults):
- `--categories` → Default: `Essentials,Franchises,Special`
- `--missing-roms` → Default: `mark` (muOS), `omit` (SpruceOS)
- `--numbers` → Default: `true`
- `--deploy` → Default: `true`
- `--clear-existing` → Default: `false`
- `--use-cache` → Default: `true` (if cache exists)
- `--clear-cache` → Default: `false`

---

## Final Recommendation

**Use Option A (Explicit Flags Only) as the default behavior**, with an optional `--use-saved` flag for the rare case where someone wants to use saved settings in non-interactive mode.

### Benefits:
1. ✅ Predictable and reproducible (critical for automation)
2. ✅ Clear separation of concerns
3. ✅ Self-contained scripts
4. ✅ Easy to understand and debug
5. ✅ Still flexible with `--use-saved` when needed

### Command Examples:

```bash
# Fully explicit (recommended for automation)
retro-curator --mode=ssh --os=muos --ip=10.0.0.80 --rom-path=... --collection-path=... --deploy

# Use saved settings + override some (opt-in, explicit intent)
retro-curator --use-saved --ip=10.0.0.92 --deploy

# Interactive mode (uses saved settings)
retro-curator
```

This gives the best of both worlds while keeping explicit as the default (better for automation).

