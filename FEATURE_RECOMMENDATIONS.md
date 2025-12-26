# Feature & UX Recommendations for Launch

## 🔥 High Priority (Quick Wins)

### 1. **Progress Indicators for Long Operations**
**Issue:** ROM scanning can take a long time with no feedback, making users think it's frozen.

**Recommendation:**
- Add a spinner or "Scanning... found X ROMs so far" message during recursive scanning
- Show progress during deployment (e.g., "Uploading collection 3/10...")

**Impact:** High - Users will understand the app is working

---

### 2. **--version Flag**
**Issue:** No way to check version without looking at package.json

**Recommendation:**
```bash
# Add to package.json scripts or handle in index.ts
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  console.log(require('../package.json').version);
  process.exit(0);
}
```

**Impact:** Medium - Standard CLI expectation

---

### 3. **Better Error Messages with Actionable Steps**
**Issue:** Some errors are generic and don't tell users what to do

**Recommendation:**
- SSH connection errors: "Connection failed. Try: 1) Verify IP is correct, 2) Ensure SSH is enabled, 3) Check you're on same network"
- Path errors: Show what path was tried and suggest checking permissions
- ROM matching: "0 ROMs found. Check your ROM path and file extensions"

**Impact:** High - Reduces support burden

---

### 4. **Collection Preview Before Deploy**
**Issue:** Users don't know what will be generated until after it's done

**Recommendation:**
- After generation, show a preview table:
  ```
  Collections to deploy:
  ├─ Essential GBA Games (45 games)
  ├─ Zelda Collection (12 games)
  └─ Cozy Games (23 games)
  
  Total: 80 games across 3 collections
  ```
- Ask for confirmation before deploying

**Impact:** Medium - Better user confidence

---

### 5. **Cache Management Commands**
**Issue:** Users must manually delete cache files

**Recommendation:**
- Add prompt option: "Clear ROM cache and rescan?" when cache exists
- Or CLI flag: `--clear-cache`
- Show cache age: "Using cache from 2 days ago (XXX ROMs)"

**Impact:** Medium - Better UX for troubleshooting

---

## 🚀 Medium Priority (Nice to Have)

### 6. **Validation Before Starting**
**Issue:** Invalid settings only fail after connection/scanning

**Recommendation:**
- Pre-validate paths (if local mode, check they exist)
- Pre-validate IP format (basic regex check)
- Show warnings for potential issues (e.g., "Path doesn't exist, will try anyway")

**Impact:** Medium - Catches errors earlier

---

### 7. **Estimated Time / Progress Bar**
**Issue:** No indication of how long operations will take

**Recommendation:**
- Show estimated time remaining during ROM scan
- Use a progress bar library like `cli-progress` for visual feedback
- Show file count progress: "Scanning... 1,234 files found"

**Impact:** Medium - Better perceived performance

---

### 8. **Summary Statistics After Generation**
**Issue:** Users might want more detailed stats

**Recommendation:**
- Show breakdown by system (GBA: 45, SNES: 23, etc.)
- Show which collections had best/worst match rates
- Show total file size being deployed

**Impact:** Low-Medium - Nice info but not critical

---

### 9. **Dry Run Mode**
**Issue:** Users can't test without actually deploying

**Recommendation:**
- Add `--dry-run` flag that generates collections but skips deployment
- Shows what would be deployed without making changes

**Impact:** Medium - Great for testing and confidence

---

### 10. **Keyboard Interrupt Handling**
**Issue:** Ctrl+C might leave connection open or files in bad state

**Recommendation:**
- Catch SIGINT/SIGTERM and cleanup gracefully
- Show "Cleaning up..." message
- Close connections properly

**Impact:** Medium - Prevents resource leaks

---

## 💡 Lower Priority (Future Enhancements)

### 11. **Interactive Collection Selection**
**Issue:** Must select all categories upfront

**Recommendation:**
- Show list of available collections and let users pick specific ones
- Show how many games in each collection
- Allow selecting individual collections from categories

**Impact:** Low - Current checkbox approach is fine

---

### 12. **Configuration File Support**
**Issue:** Settings only in .cache (JSON), not a documented config format

**Recommendation:**
- Support `retro-curator.config.json` in project root
- Document config file format
- Allow overriding with CLI flags

**Impact:** Low - Settings cache already works

---

### 13. **Logging to File**
**Issue:** No persistent log of operations

**Recommendation:**
- Optionally log operations to `.cache/retro-curator.log`
- Useful for debugging issues

**Impact:** Low - Console output is usually enough

---

### 14. **ROM Matching Confidence Score**
**Issue:** Users can't see how confident matches are

**Recommendation:**
- In verbose mode, show match scores
- Highlight low-confidence matches
- Allow users to review matches before deploying

**Impact:** Low - Fuzzy matching seems to work well

---

### 15. **Batch Operations**
**Issue:** Must run for each device separately

**Recommendation:**
- Support multiple device configs
- Run same collections on multiple devices

**Impact:** Low - Most users have one device

---

## 🎨 UX Polish (Quick Improvements)

### 16. **Better Spacing in Output**
**Recommendation:**
- Add more visual separation between sections
- Use consistent spacing
- Make success messages more prominent

---

### 17. **Emoji Consistency**
**Issue:** Mix of emoji and text

**Recommendation:**
- Use emoji consistently (or remove them)
- Consider platform compatibility (Windows terminal)

---

### 18. **Color Coding Improvements**
**Recommendation:**
- Use green only for success, yellow for warnings, red for errors
- Consider color-blind friendly options
- Add `--no-color` flag for scripts

---

### 19. **Help Text / Examples**
**Recommendation:**
- Add `--help` flag with usage examples
- Show example commands in README more prominently
- Add "Quick Start" section

---

### 20. **Connection Timeout**
**Issue:** SSH connections can hang indefinitely

**Recommendation:**
- Add connection timeout (e.g., 10 seconds)
- Show "Connecting... (this may take up to 10s)"
- Better timeout error message

---

## 📊 Recommended Priority Order for Pre-Launch

**Must Have:**
1. Better error messages (#3)
2. Progress indicators (#1)
3. Keyboard interrupt handling (#10)
4. Connection timeout (#20)

**Should Have:**
5. --version flag (#2)
6. Collection preview (#4)
7. Cache management (#5)
8. Validation before starting (#6)

**Nice to Have (Post-Launch):**
9. Dry run mode (#9)
10. Estimated time / progress bar (#7)
11. Better statistics (#8)

---

## 💻 Quick Implementation Examples

### Progress Indicator (Simple)
```typescript
// During ROM scanning
let fileCount = 0;
const interval = setInterval(() => {
  process.stdout.write(`\rScanning... ${fileCount} ROMs found`);
}, 500);
// Clear interval when done
```

### Version Flag
```typescript
if (process.argv.includes('--version') || process.argv.includes('-v')) {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
  console.log(pkg.version);
  process.exit(0);
}
```

### Connection Timeout
```typescript
const timeout = setTimeout(() => {
  throw new Error('Connection timeout after 10 seconds');
}, 10000);
await connection.connect(sshConfig);
clearTimeout(timeout);
```

