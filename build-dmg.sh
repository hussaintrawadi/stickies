#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  FreeStickies — Production DMG Builder
#  Run this once on your Mac to produce a shareable FreeStickies.dmg
# ─────────────────────────────────────────────────────────────────────────────
set -e

STICKIES="$(cd "$(dirname "$0")" && pwd)"
SRC="$STICKIES/FreeStickies"
APP="$STICKIES/FreeStickies.app"
DMG="$STICKIES/FreeStickies.dmg"
ELECTRON_APP="$SRC/node_modules/electron/dist/Electron.app"
ICNS="$SRC/icon.png"            # used as fallback; we keep electron.icns in place
BG="$SRC/dmg_background.png"

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   FreeStickies  ·  DMG Builder  ·  v1.0.0   ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# ── Guard: make sure Electron is installed ────────────────────────────
if [ ! -d "$ELECTRON_APP" ]; then
  echo "  ✗  Electron not found. Run:  cd FreeStickies && npm install"
  exit 1
fi

# ── 1. Clean ──────────────────────────────────────────────────────────
echo "  ▸  Cleaning previous build..."
rm -rf "$APP" "$DMG"

# ── 2. Copy Electron.app as base ─────────────────────────────────────
echo "  ▸  Copying Electron base..."
cp -R "$ELECTRON_APP" "$APP"

# ── 3. Rename binary ─────────────────────────────────────────────────
echo "  ▸  Renaming binary..."
mv "$APP/Contents/MacOS/Electron" "$APP/Contents/MacOS/FreeStickies"

# ── 4. Place app source files ─────────────────────────────────────────
echo "  ▸  Placing app source files..."
mkdir -p "$APP/Contents/Resources/app"
cp "$SRC/main.js"      "$APP/Contents/Resources/app/"
cp "$SRC/preload.js"   "$APP/Contents/Resources/app/"
cp "$SRC/note.html"    "$APP/Contents/Resources/app/"
cp "$SRC/package.json" "$APP/Contents/Resources/app/"

# ── 5. Write Info.plist ───────────────────────────────────────────────
echo "  ▸  Writing Info.plist..."
/usr/libexec/PlistBuddy -c "Set :CFBundleDisplayName FreeStickies"       "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleName FreeStickies"               "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleExecutable FreeStickies"         "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier com.freestickies.app" "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString 1.0.0"        "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion 1.0.0"                   "$APP/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :LSApplicationCategoryType public.app-category.productivity" \
                                                                           "$APP/Contents/Info.plist"
# Remove the asar integrity check so macOS doesn't reject our modified app
/usr/libexec/PlistBuddy -c "Delete :ElectronAsarIntegrity" "$APP/Contents/Info.plist" 2>/dev/null || true

# ── 6. Ad-hoc code sign ───────────────────────────────────────────────
echo "  ▸  Signing (ad-hoc)..."
codesign --deep --force --sign - \
  --entitlements /dev/null \
  "$APP" 2>&1 | grep -v "^$" || true
echo "  ✓  Signed"

# ── 7. Stage DMG contents ─────────────────────────────────────────────
echo "  ▸  Staging DMG contents..."
STAGING="$(mktemp -d)"
cp -R "$APP"    "$STAGING/FreeStickies.app"
ln -s /Applications "$STAGING/Applications"
[ -f "$BG" ] && cp "$BG" "$STAGING/.background.png"

# ── 8. Create initial writable DMG ────────────────────────────────────
echo "  ▸  Building DMG (may take 30–60 seconds)..."
WORK_DMG="$(mktemp -d)/work.dmg"
hdiutil create \
  -volname "FreeStickies" \
  -srcfolder "$STAGING" \
  -ov \
  -fs HFS+ \
  -format UDRW \
  "$WORK_DMG" > /dev/null

# Mount it
MOUNT_DIR="$(mktemp -d)"
hdiutil attach "$WORK_DMG" -mountpoint "$MOUNT_DIR" -nobrowse -quiet

# ── 9. Set window layout via AppleScript ─────────────────────────────
echo "  ▸  Styling DMG window..."
osascript << APPLESCRIPT
tell application "Finder"
  tell disk "FreeStickies"
    open
    set current view of container window to icon view
    set toolbar visible of container window to false
    set statusbar visible of container window to false
    set the bounds of container window to {100, 100, 760, 500}
    set theViewOptions to the icon view options of container window
    set arrangement of theViewOptions to not arranged
    set icon size of theViewOptions to 96
    set background picture of theViewOptions to file ".background.png"
    set position of item "FreeStickies.app" of container window to {160, 200}
    set position of item "Applications"     of container window to {500, 200}
    close
    open
    update without registering applications
    delay 2
    close
  end tell
end tell
APPLESCRIPT

# ── 10. Unmount and convert to compressed read-only DMG ───────────────
echo "  ▸  Compressing DMG..."
hdiutil detach "$MOUNT_DIR" -quiet
hdiutil convert "$WORK_DMG" -format UDZO -imagekey zlib-level=9 -o "$DMG" > /dev/null

# Clean up
rm -rf "$STAGING" "$(dirname "$WORK_DMG")" "$MOUNT_DIR"

# ── Done ──────────────────────────────────────────────────────────────
SIZE=$(du -sh "$DMG" | cut -f1)
echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║   ✓  FreeStickies.dmg  ready!  ($SIZE)         "
echo "  ╚══════════════════════════════════════════════╝"
echo ""
echo "  Location:  $DMG"
echo ""
echo "  → Share this DMG with anyone on macOS"
echo "  → They open it and drag FreeStickies to Applications"
echo ""

open "$(dirname "$DMG")"
