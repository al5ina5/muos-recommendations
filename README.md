# retro-curator

A CLI tool to generate and deploy curated game collections for retro gaming devices (muOS and SpruceOS). Create beautiful, organized collections from essentials, franchises, genres, moods, and more.

## Features

- 🎮 **Curated Collections**: Pre-built collections including:
  - **Essentials**: Top 50 games for various systems (GBA, SNES, NES, PS1, etc.)
  - **Franchises**: Complete series collections (Zelda, Mario, Final Fantasy, etc.)
  - **Genres**: Genre-specific collections (RPGs, Platformers, Shooters, etc.)
  - **Moods**: Vibe-based collections (Cozy, Cinematic, Action-Packed, etc.)
  - **Special**: Hardware & port collections (PICO-8, Native Engine, etc.)

- 🔍 **Smart ROM Matching**: Intelligent fuzzy matching to find your ROMs automatically
- 💾 **Caching**: Cache ROM lists for faster subsequent runs
- 🔌 **Multiple Connection Modes**: 
  - **SSH**: Deploy directly to your device over the network
  - **Local Folder**: Work with SD cards mounted on your computer or local folders
- 🎯 **Multi-OS Support**: 
  - **muOS**: Full support with .cfg collection format (multiple collections supported)
  - **SpruceOS** (Miyoo Flip): Support with JSON collection format (single collections.json file)
- 🚀 **Auto-Deploy**: Automatically deploy collections to your device
- ⚙️ **Customizable**: Configure missing ROM handling, numbering, and more

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
- For SSH mode: SSH access to your device (default: username `root`, password `root`)
- For Local Folder mode: SD card mounted on your computer or access to local folder

## Enabling SSH on muOS

To use retro-curator, you need to enable SSH on your muOS device:

1. **On your muOS device**, navigate to the main menu
2. Go to **Settings** → **Network** → **SSH**
3. **Enable SSH** (toggle it on)
4. Note your device's **IP address** (displayed in the network settings)
5. Ensure your computer and device are on the **same Wi-Fi network**

**Default SSH Credentials:**
- Username: `root`
- Password: `root`

**Finding Your Device IP:**
- The IP address is typically shown in the SSH settings menu
- You can also find it in your router's connected devices list
- Common IP ranges: `192.168.x.x` or `10.0.0.x`

**Testing SSH Connection:**
You can test the connection from your computer:
```bash
ssh root@<your-device-ip>
# Password: root
```

If the connection works, you're ready to use retro-curator!

## Usage

### First Run

1. Run the tool:
   ```bash
   npx retro-curator
   ```

2. Choose your connection mode:
   - **SSH**: For remote devices on your network
   - **Local Folder**: For SD cards mounted on your computer or local folders

3. Select your OS type:
   - **muOS**: Uses .cfg collection format
   - **SpruceOS (Miyoo Flip)**: Uses JSON collection format

4. Configure connection details:
   - **SSH Mode**: Enter device IP address (default: `10.0.0.80`)
   - **Local Folder Mode**: Enter path to your SD card or local folder

5. Configure paths:
   - **ROMs Path(s)**: 
     - **muOS**: Single ROMs folder path
     - **SpruceOS**: Multiple ROM paths (comma-separated, e.g., `/mnt/sdcard/Roms,/media/sdcard1/Roms`)
   - **Collection Path**: Where collections should be deployed

6. Configure collection options:
   - **Collection Types**: Choose which types of collections to generate
   - **Missing ROMs**: Choose to mark missing ROMs with `[X]` or omit them
   - **Display Numbers**: Add numbering to collection entries
   - **Auto Deploy**: Automatically deploy collections after generation
   - **Clear Existing**: Clear existing collections before deploying

7. Review the summary screen and confirm

8. The tool will:
   - Connect to your device (SSH) or access local folder
   - Scan your ROMs directory (or use cached list)
   - Match ROMs to curated game lists
   - Generate collection files (.cfg for muOS, .json for SpruceOS)
   - Optionally deploy them to your device

### Subsequent Runs

The tool saves your settings in `.cache/settings.json`. On subsequent runs, you can:
- Use saved settings (recommended for quick runs)
- Configure new settings

### Collection Output

Collections are generated locally in `.cache/collections/` before deployment. Each collection is a folder containing `.cfg` files for each game.

## Configuration

### Settings File

Your settings are saved in `.cache/settings.json`. You can edit this file directly or reconfigure through the CLI.

### ROM Cache

Your ROM list is cached in `.cache/cache.json` to speed up subsequent runs. Delete this file to force a fresh scan.

## Supported Systems

- GBA (Game Boy Advance)
- SNES (Super Nintendo)
- NES (Nintendo Entertainment System)
- Genesis (Sega Genesis)
- PS1 (PlayStation 1)
- GB (Game Boy)
- GBC (Game Boy Color)
- Arcade
- N64 (Nintendo 64)
- PCE (PC Engine)
- NEOGEO
- PICO-8
- PORTS
- NDS (Nintendo DS)
- PSP (PlayStation Portable)
- Dreamcast
- GG (Game Gear)
- NGPC (Neo Geo Pocket Color)

## How It Works

1. **Connection**: Connects to your device via SSH or accesses local folder
2. **ROM Scanning**: Scans your ROMs directory (or uses cache)
3. **Matching**: Uses fuzzy matching to find ROMs that match curated game lists
4. **Generation**: Creates `.cfg` collection files for muOS
5. **Deployment**: Uploads/copies collections to your configured path

## Collection Formats

### muOS Format

Each game in a collection is a `.cfg` file with the format:

```
/path/to/rom/file.gba
GBA
Game Display Name
```

Collections are stored in: `/mnt/mmc/MUOS/info/collection/[CollectionName]/`

Each collection is a folder containing individual `.cfg` files for each game, allowing you to create multiple organized collections.

### SpruceOS Format (Miyoo Flip)

All collections are stored in a single JSON file: `/mnt/sdcard/Collections/collections.json`

Format:
```json
[
    {
        "collection_name": "Essential GBA Games",
        "game_list": [
            {
                "rom_file_path": "/mnt/sdcard/Roms/GBA/Game1.gba",
                "game_system_name": "GBA"
            },
            {
                "rom_file_path": "/media/sdcard1/Roms/GBA/Game2.gba",
                "game_system_name": "GBA"
            }
        ]
    },
    {
        "collection_name": "Zelda Collection",
        "game_list": [...]
    }
]
```

**Note:** SpruceOS supports multiple ROM paths, so ROMs can be located in `/mnt/sdcard/Roms/*` or `/media/sdcard1/Roms/*`. The tool will scan all specified paths and match ROMs from any location.

## Troubleshooting

### Connection Issues

**SSH Mode:**
- Ensure SSH is enabled on your device
  - **muOS**: See [Enabling SSH on muOS](#enabling-ssh-on-muos) above
  - **SpruceOS**: SSH is typically enabled by default
- Verify the device IP address is correct
- Check that you can SSH into the device manually
- Ensure your computer and device are on the same Wi-Fi network
- Default credentials:
  - **muOS**: `root` / `root`
  - **SpruceOS**: `spruce` / `happygaming`

**Local Folder Mode:**
- Ensure the folder path exists and is accessible
- Check that the path points to your SD card mount point or local folder
- Verify you have read/write permissions to the folder

### ROM Matching Issues

- Ensure your ROM files are in the configured ROMs path
- Check that ROM filenames are reasonably similar to game names
- Try deleting `.cache/cache.json` to force a fresh scan

### Missing ROMs

- Missing ROMs are marked with `[X]` by default
- You can choose to omit missing ROMs entirely
- Collections will still be created with available ROMs

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

