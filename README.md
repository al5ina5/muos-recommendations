# retro-curator

A CLI tool to generate and deploy curated game collections for muOS-powered retro gaming devices. Create beautiful, organized collections from essentials, franchises, genres, moods, and more.

## Features

- 🎮 **Curated Collections**: Pre-built collections including:
  - **Essentials**: Top 50 games for various systems (GBA, SNES, NES, PS1, etc.)
  - **Franchises**: Complete series collections (Zelda, Mario, Final Fantasy, etc.)
  - **Genres**: Genre-specific collections (RPGs, Platformers, Shooters, etc.)
  - **Moods**: Vibe-based collections (Cozy, Cinematic, Action-Packed, etc.)
  - **Special**: Hardware & port collections (PICO-8, Native Engine, etc.)

- 🔍 **Smart ROM Matching**: Intelligent fuzzy matching to find your ROMs automatically
- 💾 **Caching**: Cache ROM lists for faster subsequent runs
- 🚀 **Auto-Deploy**: Automatically deploy collections to your device via SSH
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
- A muOS-powered retro gaming device with SSH enabled
- SSH access to your device (default: username `root`, password `root`)

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

2. Enter your device IP address when prompted (default: `10.0.0.80`)

3. Configure your settings:
   - **ROMs Path**: Path to your ROMs folder on the device (default: `/mnt/sdcard/ROMS`)
   - **Collection Types**: Choose which types of collections to generate
   - **Missing ROMs**: Choose to mark missing ROMs with `[X]` or omit them
   - **Display Numbers**: Add numbering to collection entries
   - **Auto Deploy**: Automatically deploy collections after generation
   - **Clear Existing**: Clear existing collections before deploying

4. The tool will:
   - Connect to your device via SSH
   - Scan your ROMs directory (or use cached list)
   - Match ROMs to curated game lists
   - Generate collection `.cfg` files
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

1. **Connection**: Connects to your muOS device via SSH
2. **ROM Scanning**: Scans your ROMs directory (or uses cache)
3. **Matching**: Uses fuzzy matching to find ROMs that match curated game lists
4. **Generation**: Creates `.cfg` files for each game in the collection
5. **Deployment**: Uploads collections to `/mnt/mmc/MUOS/info/collection` on your device

## Collection Format

Each game in a collection is a `.cfg` file with the format:

```
/path/to/rom/file.gba
GBA
Game Display Name
```

## Troubleshooting

### Connection Issues

- Ensure SSH is enabled on your muOS device (see [Enabling SSH on muOS](#enabling-ssh-on-muos) above)
- Verify the device IP address is correct
- Check that you can SSH into the device manually using: `ssh root@<your-device-ip>`
- Ensure your computer and device are on the same Wi-Fi network
- Default credentials: `root` / `root`

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

ISC

## Author

Sebastian Alsina <alsinas@me.com>

