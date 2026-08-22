#!/usr/bin/env python3
"""
build_moments.py — turn a folder of photos into a manifest the website can read.

WHY THIS EXISTS
---------------
A static host (GitHub Pages, or serve.py locally) will happily serve
assets/moments/IMG_4821.jpg, but it will NOT tell the browser that the file is
there. There is no directory listing. So the page cannot "look in a folder";
something has to write down what the folder contains.

That is this script. It scans assets/moments/ and writes
assets/moments/manifest.json describing every image it found. js/moments.js
fetches that file and renders the section from it.

Consequences worth knowing:
  * Filenames genuinely do not matter. Nothing anywhere hardcodes a name.
  * Extensions do not matter either, within reason - see IMAGE_EXTS.
  * An EMPTY folder produces a manifest with an empty list, and js/moments.js
    then renders nothing at all. The site stays exactly as it is today.

It runs in three places, so it cannot be forgotten:
  * serve.py regenerates it on every request while developing
  * .github/workflows/moments.yml regenerates it on push (phone uploads)
  * `npm run moments` / `python tools/build_moments.py` by hand

No third-party libraries. Dimensions are read straight out of the file headers,
because knowing width/height up front lets the browser reserve the right box
and stops the photo from jolting the layout as it loads.

Usage:
    python tools/build_moments.py            # write the manifest
    python tools/build_moments.py --check    # print it, write nothing
"""

import json
import struct
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Repo root is one level up from tools/.
ROOT = Path(__file__).resolve().parent.parent
MOMENTS_DIR = ROOT / "assets" / "moments"
MANIFEST = MOMENTS_DIR / "manifest.json"

# The site is pinned to IST everywhere else (see js/config.js), so the date
# stamped on the photo is the date it was in India, not on the build machine.
IST = timezone(timedelta(minutes=330))

# Formats every browser can draw, and the Apple/modern ones Safari shows but
# Chrome and Firefox largely do not. The latter are still listed, but flagged
# so the page and the CI converter can cope.
WEB_SAFE_FORMATS = {"jpeg", "png", "webp", "gif", "avif"}
NEEDS_CONVERT_FORMATS = {"heic"}

# Files that live in the folder but are not photos.
SKIP_NAMES = {"manifest.json", "readme.md", ".gitkeep", ".ds_store", "thumbs.db"}

# Reading this much of each file is enough for every header parsed below.
HEAD_BYTES = 64 * 1024

def sniff_format(head):
    """
    The file's REAL format, from its magic bytes. None if it is not an image.

    Deliberately not driven by the extension. A photo copied off a phone or a
    camera can arrive as IMG_4821 with no extension at all, or as
    photo.jpeg.bak, and it is still a photo - an extension allowlist would
    silently ignore it, which on the one day this matters is the worst
    possible failure. Browsers agree: an <img> sniffs the bytes and renders
    such a file regardless of the Content-Type it was served with.
    """
    if head[:8] == b"\x89PNG\r\n\x1a\n":
        return "png"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if head[:2] == b"\xff\xd8":
        return "jpeg"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "webp"
    # ISO base media: a 'ftyp' box at offset 4, the brand right after it.
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand in (b"avif", b"avis"):
            return "avif"
        if brand in (b"heic", b"heix", b"hevc", b"hevx",
                     b"mif1", b"msf1", b"heim", b"heis"):
            return "heic"
    return None


# ---------------------------------------------------------------------------
# Image dimensions, straight from the file header.
#
# Only enough of each format is parsed to find width and height. Every reader
# returns None rather than raising, because a photo whose header we cannot read
# is still a photo - it just renders without a reserved box.
# ---------------------------------------------------------------------------

def _png_size(data):
    # 8-byte signature, then an IHDR chunk whose payload starts at byte 16.
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", data[16:24])


def _gif_size(data):
    if data[:6] not in (b"GIF87a", b"GIF89a"):
        return None
    return struct.unpack("<HH", data[6:10])


def _jpeg_size(data):
    # Walk the segment chain looking for a Start-Of-Frame marker, the only
    # place the real dimensions live. EXIF thumbnails are skipped by
    # construction, because APPn segments are jumped over wholesale.
    if data[:2] != b"\xff\xd8":
        return None
    i, n = 2, len(data)
    while i < n - 9:
        if data[i] != 0xFF:
            i += 1
            continue
        marker = data[i + 1]
        # Standalone markers: no length field, no payload.
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            i += 2
            continue
        length = struct.unpack(">H", data[i + 2:i + 4])[0]
        # SOF0..SOF15, excluding DHT (C4), JPG (C8) and DAC (CC).
        if 0xC0 <= marker <= 0xCF and marker not in (0xC4, 0xC8, 0xCC):
            height, width = struct.unpack(">HH", data[i + 5:i + 9])
            return width, height
        i += 2 + length
    return None


def _webp_size(data):
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    chunk = data[12:16]
    if chunk == b"VP8 ":
        # Lossy: frame tag + sync code, then two 14-bit dimensions.
        return (
            struct.unpack("<H", data[26:28])[0] & 0x3FFF,
            struct.unpack("<H", data[28:30])[0] & 0x3FFF,
        )
    if chunk == b"VP8L":
        # Lossless: 14 bits each, packed into the 4 bytes after the signature.
        bits = struct.unpack("<I", data[21:25])[0]
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if chunk == b"VP8X":
        # Extended: 24-bit minus-one values.
        w = data[24] | (data[25] << 8) | (data[26] << 16)
        h = data[27] | (data[28] << 8) | (data[29] << 16)
        return w + 1, h + 1
    return None


def _isobmff_size(data):
    """
    HEIC / HEIF / AVIF - all ISO base media files.

    Walking the box tree properly (meta > iprp > ipco > ispe) is a lot of code
    for one number. Scanning for the 'ispe' box directly gets the same answer
    for the single-image files a phone camera produces. Where a file holds
    several images at different sizes, the largest ispe is the primary one in
    every sample encountered, so that is the one taken.
    """
    best = None
    start = 0
    while True:
        at = data.find(b"ispe", start)
        if at == -1 or at + 16 > len(data):
            break
        # ispe payload: 4 bytes version+flags, then width, height as uint32.
        w, h = struct.unpack(">II", data[at + 8:at + 16])
        if 0 < w <= 100000 and 0 < h <= 100000:
            if best is None or w * h > best[0] * best[1]:
                best = (w, h)
        start = at + 4
    return best


# Which reader can answer for which sniffed format.
_SIZE_READERS = {
    "png": _png_size,
    "gif": _gif_size,
    "jpeg": _jpeg_size,
    "webp": _webp_size,
    "avif": _isobmff_size,
    "heic": _isobmff_size,
}


def image_size(head, fmt):
    """Best-effort (width, height). None when the header is unreadable."""
    reader = _SIZE_READERS.get(fmt)
    if not reader:
        return None
    try:
        size = reader(head)
    except (struct.error, IndexError):
        return None
    if size and size[0] > 0 and size[1] > 0:
        return size
    return None


# ---------------------------------------------------------------------------
# When was the photo added?
# ---------------------------------------------------------------------------

def git_commit_iso(path):
    """
    The commit date of this file, ISO-8601, or None if it is not committed yet.

    Deliberately NOT the file's mtime: a CI checkout rewrites mtimes to the
    moment the runner cloned, so mtime inside GitHub Actions is always "now"
    and would date every photo to the build rather than to the day it was
    taken. The commit date is identical everywhere, and is what we actually
    mean by "the day this went up".
    """
    try:
        out = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", str(path)],
            cwd=str(ROOT), capture_output=True, text=True, timeout=15,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    stamp = out.stdout.strip()
    return stamp or None


def taken_at(path):
    """(iso_string, source) - commit date when known, else the file's mtime."""
    iso = git_commit_iso(path)
    if iso:
        return iso, "commit"
    try:
        mtime = datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        return mtime.isoformat(), "mtime"
    except OSError:
        return None, "unknown"


def ist_parts(iso):
    """Split an ISO timestamp into the IST date pieces the badge prints."""
    if not iso:
        return None
    try:
        when = datetime.fromisoformat(iso).astimezone(IST)
    except ValueError:
        return None
    return {
        "iso": when.isoformat(),
        "day": when.day,
        "month": when.month,
        "year": when.year,
        # dd/mm/yyyy - the format the site was asked for.
        "label": "%02d/%02d/%d" % (when.day, when.month, when.year),
    }


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------

def scan():
    """Every photo in the folder, newest first, as manifest entries."""
    if not MOMENTS_DIR.is_dir():
        return []

    # Sniff every file in the folder. Nothing is judged by its name: an image
    # is whatever has an image's magic bytes, so IMG_4821 with no extension
    # counts and notes.txt does not.
    found = []
    for path in sorted(MOMENTS_DIR.iterdir()):
        if not path.is_file() or path.name.lower() in SKIP_NAMES:
            continue
        try:
            with open(path, "rb") as fh:
                head = fh.read(HEAD_BYTES)
        except OSError:
            continue
        fmt = sniff_format(head)
        if fmt is None:
            continue
        found.append((path, head, fmt))

    # Stems already present in a format every browser can draw. The CI job
    # converts IMG_4821.HEIC to IMG_4821.jpg and commits both; without this the
    # manifest would list the pair twice, once as an image nothing can render.
    web_safe_stems = {
        p.stem.lower() for p, _, f in found if f in WEB_SAFE_FORMATS
    }

    entries = []
    for path, head, fmt in found:
        needs_convert = fmt in NEEDS_CONVERT_FORMATS

        # A HEIC whose converted twin is already here has been superseded.
        if needs_convert and path.stem.lower() in web_safe_stems:
            continue

        size = image_size(head, fmt)
        iso, stamp_source = taken_at(path)

        entries.append({
            # Relative to the site root, so it works at any base path.
            "src": "assets/moments/" + path.name,
            "format": fmt,
            "bytes": path.stat().st_size,
            "w": size[0] if size else None,
            "h": size[1] if size else None,
            "takenAt": iso,
            "dateSource": stamp_source,
            "date": ist_parts(iso),
            # Chrome and Firefox cannot draw HEIC. Flagged rather than hidden,
            # so the page can show a clear note instead of a broken frame -
            # and so the CI converter knows what to work on.
            "needsConvert": needs_convert,
        })

    # Newest first: the freshest moment leads the section.
    entries.sort(key=lambda e: e["takenAt"] or "", reverse=True)
    return entries


def build():
    photos = scan()
    return {"generated": True, "count": len(photos), "photos": photos}


def main():
    check_only = "--check" in sys.argv
    manifest = build()
    text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"

    if check_only:
        sys.stdout.write(text)
        return 0

    MOMENTS_DIR.mkdir(parents=True, exist_ok=True)

    # Only touch the file when something actually changed. This is what stops
    # the CI workflow from committing to itself in a loop: the second run
    # produces identical bytes, sees no diff, and commits nothing.
    if MANIFEST.exists() and MANIFEST.read_text(encoding="utf-8") == text:
        print("  moments: no change (%d photo(s))" % manifest["count"])
        return 0

    MANIFEST.write_text(text, encoding="utf-8")
    print("  moments: wrote manifest for %d photo(s)" % manifest["count"])

    for photo in manifest["photos"]:
        flag = "   [HEIC - needs conversion]" if photo["needsConvert"] else ""
        dims = "%sx%s" % (photo["w"], photo["h"]) if photo["w"] else "size unknown"
        stamp = photo["date"]["label"] if photo["date"] else "undated"
        print("     - %s  %s  %s%s" % (photo["src"], dims, stamp, flag))
    return 0


if __name__ == "__main__":
    sys.exit(main())
