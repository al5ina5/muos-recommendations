# Retro Curator Architecture

## Overview

Retro Curator is a CLI tool that generates curated game collections for retro gaming devices (muOS and SpruceOS). It scans your ROM files, matches them against curated game lists, generates collection files in the appropriate format, and optionally deploys them to your device.

## Architecture Principles

1. **Separation of Concerns**: Each module has a single, clear responsibility
2. **Abstraction**: Connection layer abstracts transport (SSH vs local filesystem)
3. **Strategy Pattern**: Different formatters for different OS types
4. **Single Source of Truth**: All constants and types in global files
5. **Functional Approach**: Core logic is pure functions where possible

## File Structure

```
src/
├── index.ts                    # Entry point - CLI orchestration
├── constants.ts                # All constants (paths, ROM extensions)
├── types.ts                    # All TypeScript interfaces/types
│
├── cli/                        # Command-line interface layer
│   ├── flags.ts               # Parse & validate CLI flags
│   ├── prompts.ts             # Interactive prompts for settings
│   └── output.ts              # Display functions (banners, summaries)
│
├── core/                       # Core business logic
│   ├── executor.ts            # Main orchestrator (47 lines)
│   ├── connection-factory.ts  # Creates connections (SSH/local)
│   ├── rom-scanner.ts         # Scans & caches ROM files
│   ├── collection-generator.ts # Generates collection files
│   └── deployment.ts          # Deploys collections to device
│
├── data/                       # Curated game data
│   ├── recommendations.ts     # Collection definitions & exports
│   └── collections/           # Individual collection files
│       ├── essentials.ts      # Top 50 lists per system
│       ├── franchises.ts      # Series collections (Zelda, Mario)
│       ├── genres.ts          # Genre collections (RPGs, Platformers)
│       ├── moods.ts           # Vibe-based collections
│       └── special.ts         # Hardware/ports (PICO-8, etc.)
│
└── utils/                      # Utility modules
    ├── connections/            # Connection implementations
    │   ├── ssh.ts             # SSH connection (uses ssh2 library)
    │   └── local.ts           # Local filesystem connection
    ├── formatters/             # OS-specific formatters
    │   ├── muos-formatter.ts  # muOS .cfg format
    │   └── spruceos-formatter.ts # SpruceOS JSON format
    └── matcher.ts              # Fuzzy ROM matching (Fuse.js)
```

## File Responsibilities

### Entry Point

**`index.ts`** - CLI Entry Point
- Parses command-line arguments
- Routes to interactive or non-interactive mode
- Handles `--help` and `--version` flags
- Orchestrates the flow: parse → validate → execute

### Global Files

**`constants.ts`** - All Constants
- File paths (cache, settings, collections)
- ROM file extensions list
- Shared across entire codebase

**`types.ts`** - All Type Definitions
- CLI types (`ParsedFlags`, `Settings`)
- Connection types (`IConnection`, `SSHConfig`, `LocalConnectionConfig`)
- Formatter types (`ICollectionFormatter`, `FormatGameOptions`)
- SpruceOS types (`SpruceOSCollection`, `SpruceOSGameEntry`)

### CLI Layer (`cli/`)

**`flags.ts`** - CLI Flag Handling
- `parseFlags()` - Uses `yargs` to parse command-line arguments
- `validateFlags()` - Validates required flags for non-interactive mode
- `flagsToSettings()` - Converts flags to `Settings` object

**`prompts.ts`** - Interactive Prompts
- `promptForSettings()` - Interactive wizard for configuration
- `loadOrPromptSettings()` - Loads cached settings or prompts for new ones
- Handles cache age display and settings persistence

**`output.ts`** - Display Functions
- `showWelcomeBanner()` - Welcome message
- `displaySummary()` - Settings summary display
- `showSuccessBanner()` - Completion message

### Core Layer (`core/`)

**`executor.ts`** - Main Orchestrator (47 lines)
- High-level orchestration only
- Calls services in order: connection → scan → generate → deploy
- Handles errors and cleanup

**`connection-factory.ts`** - Connection Creation
- `createConnection()` - Factory function that creates appropriate connection
- Handles SSH vs Local mode
- OS-specific SSH credentials (muOS: root/root, SpruceOS: spruce/happygaming)
- Error handling with helpful troubleshooting messages

**`rom-scanner.ts`** - ROM Scanning & Caching
- `scanRoms()` - Scans ROM files from device/folder
- Handles cache checking and writing
- Progress indicators
- Filters out non-ROM files (images, metadata)
- Processes ROMs into `RomFile[]` format for matcher

**`collection-generator.ts`** - Collection Generation
- `generateCollections()` - Main entry point
- `generateSpruceOSCollections()` - Single JSON file generation
- `generateMuOSCollections()` - Individual .cfg files per game
- Handles game matching, formatting, and file writing
- Shows progress and statistics

**`deployment.ts`** - Collection Deployment
- `deployCollections()` - Deploys generated collections to device
- OS-specific deployment logic (muOS: folders, SpruceOS: single JSON)
- Connection mode handling (SSH: upload, Local: copy)
- Shows SpruceOS setup instructions

### Data Layer (`data/`)

**`recommendations.ts`** - Collection Definitions
- Exports `COLLECTIONS` array (all collections combined)
- Defines `Collection` and `Recommendation` interfaces
- Aggregates all collection categories

**`collections/*.ts`** - Individual Collection Files
- Each file contains curated game lists
- Organized by category (essentials, franchises, genres, moods, special)
- Static data, easy to modify/extend

### Utils Layer (`utils/`)

**`connections/ssh.ts`** - SSH Connection Implementation
- Implements `IConnection` interface
- Uses `ssh2` library for SSH/SFTP operations
- Methods: `connect()`, `listRomsRecursively()`, `deployCollections()`, `uploadFile()`
- Handles SSH authentication and SFTP file operations

**`connections/local.ts`** - Local Filesystem Connection
- Implements `IConnection` interface
- Uses Node.js `fs-extra` for file operations
- Same interface as SSH, different implementation
- Allows working with mounted SD cards or local folders

**`formatters/muos-formatter.ts`** - muOS Collection Format
- Implements `ICollectionFormatter` interface
- Generates `.cfg` files (one per game)
- Format: `romPath\nsystemID\ngameDisplayName\n`
- System ID mapping (e.g., "Genesis" → "MD")

**`formatters/spruceos-formatter.ts`** - SpruceOS Collection Format
- Implements `ICollectionFormatter` interface
- Generates single `collections.json` file
- Format: Array of collections, each with `collection_name` and `game_list`
- System ID mapping (different from muOS, e.g., "SNES" → "SFC")

**`matcher.ts`** - Fuzzy ROM Matching
- Uses `Fuse.js` for intelligent fuzzy matching
- Handles normalization (lowercase, remove accents, special chars)
- Token-based matching for better accuracy
- System-aware matching (considers parent directory)
- Returns best match or null

## Application Flow

### Interactive Mode (No Flags)

```
1. User runs: npx retro-curator
2. index.ts: Shows welcome banner
3. prompts.ts: Interactive wizard collects settings
   - Connection mode (SSH/Local)
   - OS type (muOS/SpruceOS)
   - Paths, categories, preferences
4. Prompts save settings to .cache/settings.json
5. output.ts: Shows settings summary
6. User confirms
7. executor.ts: Orchestrates execution
   a. connection-factory.ts: Creates connection
   b. rom-scanner.ts: Scans & caches ROMs
   c. collection-generator.ts: Generates collections
   d. deployment.ts: Deploys to device (if enabled)
8. Show success message
```

### Non-Interactive Mode (With Flags)

```
1. User runs: npx retro-curator --mode ssh --os muos --ip 10.0.0.80 ...
2. flags.ts: Parses flags with yargs
3. flags.ts: Validates required flags
4. flags.ts: Converts flags to Settings object
5. executor.ts: Orchestrates execution (same as step 7 above)
6. Show results (or JSON output if --json flag)
```

## Key Design Decisions

### 1. Connection Abstraction

**Why**: Supports both SSH (remote) and Local (SD card) workflows

**How**: `IConnection` interface abstracts transport mechanism
- Same interface for SSH and Local
- OS type doesn't affect connection (only affects formatting)
- Easy to add new connection types (e.g., FTP, SMB)

### 2. Formatter Strategy Pattern

**Why**: muOS and SpruceOS use completely different collection formats

**How**: `ICollectionFormatter` interface with OS-specific implementations
- muOS: Individual `.cfg` files per game
- SpruceOS: Single `collections.json` file
- Same input (games + matches), different output

### 3. Caching

**Why**: ROM scanning can be slow (especially over SSH)

**How**: 
- ROM list cached to `.cache/cache.json`
- Settings cached to `.cache/settings.json`
- Cache can be cleared with `--clear-cache` flag
- Cache age displayed in interactive mode

### 4. Fuzzy Matching

**Why**: ROM filenames rarely match game names exactly

**How**: 
- Uses Fuse.js for fuzzy matching
- Normalizes names (lowercase, remove accents, special chars)
- Token-based matching for better accuracy
- Considers parent directory for system detection

### 5. Global Constants & Types

**Why**: Single source of truth, easier maintenance

**How**: 
- `constants.ts`: All constants in one place
- `types.ts`: All interfaces in one place
- Easy to find and modify
- Consistent imports across codebase

## Usage Examples

### Interactive Mode

```bash
# Simple usage - guided wizard
npx retro-curator
```

### Non-Interactive Mode (Automation)

```bash
# SSH mode, muOS
npx retro-curator \
  --mode ssh \
  --os muos \
  --ip 10.0.0.80 \
  --rom-path /mnt/sdcard/ROMS \
  --collection-path /mnt/mmc/MUOS/info/collection \
  --categories Essentials,Franchises \
  --deploy

# Local mode, SpruceOS
npx retro-curator \
  --mode local \
  --os spruceos \
  --local-path /Volumes/SDCARD \
  --rom-paths Roms,/media/sdcard1/Roms \
  --collection-path Collections \
  --categories Essentials,Special \
  --no-deploy \
  --quiet

# Dry run (validate without making changes)
npx retro-curator --mode ssh --os muos --ip 10.0.0.80 --dry-run

# JSON output for scripting
npx retro-curator --mode ssh --os muos --ip 10.0.0.80 --json
```

## Configuration Files

### `.cache/cache.json`
- Cached ROM file list
- Speeds up subsequent runs
- Can be cleared with `--clear-cache`

### `.cache/settings.json`
- Saved settings from interactive mode
- Allows "run like before" option
- Never used in non-interactive mode

### `.cache/collections/`
- Generated collection files
- Stored locally before deployment
- muOS: Individual `.cfg` files in folders
- SpruceOS: Single `collections.json` file

## OS-Specific Considerations

### muOS
- **Format**: Individual `.cfg` files per game
- **Structure**: Collection folders with multiple `.cfg` files
- **SSH Credentials**: `root/root`
- **ROM Path**: Single path (`/mnt/sdcard/ROMS`)
- **Collection Path**: `/mnt/mmc/MUOS/info/collection`
- **Missing ROMs**: Can mark with `[X]` prefix

### SpruceOS
- **Format**: Single `collections.json` file
- **Structure**: One JSON file with all collections
- **SSH Credentials**: `spruce/happygaming`
- **ROM Paths**: Multiple paths supported (array)
- **Collection Path**: `/mnt/sdcard/Collections`
- **Missing ROMs**: Must omit (SpruceOS doesn't support missing file lists)
- **Setup Required**: User must enable Collections in theme settings

## Error Handling

- Connection errors: Detailed troubleshooting steps
- Invalid flags: Clear error messages with suggestions
- File errors: Descriptive error messages
- All errors: Exit code 1, helpful messages
- Validation: Happens before execution (fast failure)

## Performance Considerations

- **Caching**: ROM list cached to avoid slow rescans
- **Parallel Processing**: Game matching done in parallel
- **Progress Indicators**: Shows progress during long operations
- **SSH vs Local**: SSH slower but more convenient, Local faster

## Extensibility

### Adding a New OS

1. Create new formatter in `utils/formatters/`
2. Implement `ICollectionFormatter` interface
3. Update `connection-factory.ts` if credentials differ
4. Update `collection-generator.ts` to handle new format
5. Update `deployment.ts` for deployment logic
6. Update types and CLI flags

### Adding a New Collection Category

1. Create new file in `data/collections/`
2. Export collection array
3. Import in `data/recommendations.ts`
4. Add to `COLLECTIONS` array
5. No code changes needed!

### Adding a New Connection Type

1. Create new file in `utils/connections/`
2. Implement `IConnection` interface
3. Update `connection-factory.ts` to support new type
4. Update types and CLI flags

## Dependencies

- **chalk**: Terminal colors
- **fs-extra**: Enhanced file operations
- **fuse.js**: Fuzzy string matching
- **inquirer**: Interactive CLI prompts
- **ssh2**: SSH/SFTP client
- **yargs**: CLI argument parsing

## Testing Considerations

- **Unit Tests**: Each module is testable independently
- **Integration Tests**: Test full flow with mock connections
- **E2E Tests**: Test with actual devices (SSH/local)
- **Mocking**: Connection layer can be easily mocked

## Build Process

1. `tsc`: Compiles TypeScript to JavaScript
2. `postbuild.js`: Adds shebang to `dist/index.js`
3. Output: `dist/` directory with compiled code
4. Package: Only `dist/`, `README.md`, `LICENSE` included

