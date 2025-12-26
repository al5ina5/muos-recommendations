# retro-curator

CLI tool to generate and deploy curated game collections for retro gaming devices (muOS and SpruceOS).

## Features

- **Curated Collections**: Pre-built collections including Essentials, Franchises, Genres, Moods, and Special collections
- **Smart ROM Matching**: Intelligent fuzzy matching to automatically find ROMs
- **Caching**: Cache ROM lists for faster subsequent runs
- **Multiple Connection Modes**: SSH (remote device) or Local Folder (SD card mounted or local folder)
- **Multi-OS Support**: muOS (.cfg format) and SpruceOS (JSON format)
- **Auto-Deploy**: Automatically deploy collections to your device
- **Customizable**: Configure missing ROM handling, numbering, and collection types

## Installation

### Using npx (Recommended)

```bash
npx retro-curator
```

### Global Installation

```bash
npm install -g retro-curator
```

Then run:

```bash
retro-curator
```

## Prerequisites

- Node.js 18.0.0 or higher
- A retro gaming device running muOS or SpruceOS (Miyoo Flip)
- For SSH mode: SSH access enabled on your device
- For Local Folder mode: SD card mounted on your computer or access to local folder

## Usage Modes

### Interactive Mode

Run the tool without any flags to enter interactive mode:

```bash
npx retro-curator
```

The tool will guide you through:
1. Connection mode selection (SSH or Local Folder)
2. OS type selection (muOS or SpruceOS)
3. Connection details (IP address or local folder path)
4. ROM paths configuration
5. Collection path configuration
6. Collection categories selection
7. Missing ROMs handling (mark with [X] or omit)
8. Display options (numbers, auto-deploy, clear existing)

Settings are saved to `.cache/settings.json` for future runs.

### Non-Interactive Mode

Run the tool with flags for automation:

```bash
npx retro-curator --mode ssh --os muos --ip 10.0.0.80 --rom-path /mnt/sdcard/ROMS ...
```

All required configuration must be provided via flags. The tool will not prompt for any settings.

## Command-Line Flags

### Connection Flags

| Flag | Alias | Description | Required |
|------|-------|-------------|----------|
| `--mode` | `-m` | Connection mode: `ssh` or `local` | Yes (non-interactive) |
| `--os` | `-o` | Device OS type: `muos` or `spruceos` | Yes (non-interactive) |
| `--ip` | `-i` | Device IP address (SSH mode only) | Yes (SSH mode) |
| `--local-path` | `-l` | Local folder path (local mode only) | Yes (local mode) |

### Path Flags

| Flag | Description | Required | Notes |
|------|-------------|----------|-------|
| `--rom-path` | ROM path for muOS | Yes (muOS) | Single path |
| `--rom-paths` | ROM paths for SpruceOS (comma-separated) | Yes (SpruceOS) | Multiple paths supported |
| `--collection-path` | `-c` | Collection output path | Yes (non-interactive) | Where collections will be deployed |

### Collection Flags

| Flag | Description | Required | Default |
|------|-------------|----------|---------|
| `--categories` | Comma-separated collection categories | No | `Essentials,Franchises,Special` | Available: `Essentials`, `Franchises`, `Genres`, `Moods`, `Special` |
| `--missing-roms` | How to handle missing ROMs: `mark` or `omit` | No | `mark` (muOS), `omit` (SpruceOS) |
| `--numbers` | `-n` | Display numbers in collections | No | `true` |
| `--no-numbers` | Disable numbers in collections | No | - |
| `--deploy` | `-d` | Auto deploy collections after generation | No | `true` |
| `--no-deploy` | Skip deployment | No | - |
| `--clear-existing` | Clear existing collections before deploying | No | `false` |

### Cache Flags

| Flag | Description | Required | Default |
|------|-------------|----------|---------|
| `--use-cache` | Use cached ROM list | No | `true` (if cache exists) |
| `--no-use-cache` | Force fresh ROM scan | No | - |
| `--clear-cache` | Clear ROM cache before running | No | `false` |

### Output Flags

| Flag | Alias | Description | Required |
|------|-------|-------------|----------|
| `--quiet` | `-q` | Minimal output | No |
| `--json` | JSON output format | No |
| `--dry-run` | Validate and show what would happen (no changes) | No |

### General Flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version number |

## Usage Examples

### Interactive Mode

```bash
npx retro-curator
```

Follow the prompts to configure your settings.

### Non-Interactive Mode - SSH with muOS

```bash
npx retro-curator \
  --mode ssh \
  --os muos \
  --ip 10.0.0.80 \
  --rom-path /mnt/sdcard/ROMS \
  --collection-path /mnt/mmc/MUOS/info/collection \
  --categories Essentials,Franchises \
  --deploy
```

### Non-Interactive Mode - Local Folder with SpruceOS

```bash
npx retro-curator \
  --mode local \
  --os spruceos \
  --local-path /Volumes/SDCARD \
  --rom-paths Roms,/media/sdcard1/Roms \
  --collection-path Collections \
  --categories Essentials,Special \
  --no-deploy \
  --quiet
```

### Dry Run (Validation Only)

```bash
npx retro-curator \
  --mode ssh \
  --os muos \
  --ip 10.0.0.80 \
  --rom-path /mnt/sdcard/ROMS \
  --collection-path /mnt/mmc/MUOS/info/collection \
  --dry-run
```

### JSON Output

```bash
npx retro-curator \
  --mode ssh \
  --os muos \
  --ip 10.0.0.80 \
  --rom-path /mnt/sdcard/ROMS \
  --collection-path /mnt/mmc/MUOS/info/collection \
  --json
```

### Clear Cache and Rescan

```bash
npx retro-curator \
  --mode ssh \
  --os muos \
  --ip 10.0.0.80 \
  --rom-path /mnt/sdcard/ROMS \
  --collection-path /mnt/mmc/MUOS/info/collection \
  --clear-cache
```

## SSH Configuration

### muOS

1. On your muOS device, navigate to Settings → Network → SSH
2. Enable SSH
3. Note your device IP address
4. Ensure your computer and device are on the same Wi-Fi network

**Default SSH Credentials:**
- Username: `root`
- Password: `root`

### SpruceOS

SSH is typically enabled by default.

**Default SSH Credentials:**
- Username: `spruce`
- Password: `happygaming`

### Testing SSH Connection

```bash
# For muOS
ssh root@<your-device-ip>
# Password: root

# For SpruceOS
ssh spruce@<your-device-ip>
# Password: happygaming
```

## Collection Categories

- **Essentials**: Top 50 games for various systems (GBA, SNES, NES, PS1, etc.)
- **Franchises**: Complete series collections (Zelda, Mario, Final Fantasy, etc.)
- **Genres**: Genre-specific collections (RPGs, Platformers, Shooters, etc.)
- **Moods**: Vibe-based collections (Cozy, Cinematic, Action-Packed, etc.)
- **Special**: Hardware & port collections (PICO-8, Native Engine, etc.)

## Supported Systems

GBA, SNES, NES, Genesis, PS1, GB, GBC, Arcade, N64, PCE, NEOGEO, PICO-8, PORTS, NDS, PSP, Dreamcast, GG, NGPC

## Collection Formats

### muOS Format

Each game in a collection is a `.cfg` file:

```
/path/to/rom/file.gba
GBA
Game Display Name
```

Collections are stored in: `/mnt/mmc/MUOS/info/collection/[CollectionName]/`

Each collection is a folder containing individual `.cfg` files for each game.

### SpruceOS Format

All collections are stored in a single JSON file: `/mnt/sdcard/Collections/collections.json`

```json
[
    {
        "collection_name": "Essential GBA Games",
        "game_list": [
            {
                "rom_file_path": "/mnt/sdcard/Roms/GBA/Game1.gba",
                "game_system_name": "GBA"
            }
        ]
    }
]
```

**Note:** After deploying to SpruceOS, you must:
1. Reload UI: Settings → Reload UI
2. Enable Collections: Settings → Theme Settings → Main Menu → Theme Options → Show Collections

## File Locations

- **Settings**: `.cache/settings.json` (saved from interactive mode)
- **ROM Cache**: `.cache/cache.json` (cached ROM list for faster runs)
- **Generated Collections**: `.cache/collections/` (generated files before deployment)

## Troubleshooting

### Connection Issues

**SSH Mode:**
- Verify SSH is enabled on your device
- Check that the IP address is correct
- Ensure your computer and device are on the same Wi-Fi network
- Test SSH connection manually before using the tool

**Local Folder Mode:**
- Verify the folder path exists and is accessible
- Check that you have read/write permissions
- Ensure the path points to your SD card mount point

### ROM Matching Issues

- Ensure ROM files are in the configured ROMs path
- Check that ROM filenames are reasonably similar to game names
- Delete `.cache/cache.json` to force a fresh scan

### Missing ROMs

- muOS: Missing ROMs can be marked with `[X]` or omitted
- SpruceOS: Missing ROMs must be omitted (SpruceOS does not support missing file lists)

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## License

MIT License (Non-Commercial) - see [LICENSE](LICENSE) file for details.

## Author

Sebastian Alsina <alsinas@me.com>
