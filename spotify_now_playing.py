"""
spotify_now_playing.py
Reads the current Spotify track using Windows Media Session API (winsdk).
Extracts album art dominant color for dynamic UI theme matching!
Outputs JSON: {"running": true/false, "track": "...", "artist": "...", "paused": true/false, "position_sec": 12.3, "duration_sec": 220.5, "bgColor": "#9e2d2f", "fgColor": "#ffffff"}
"""
import json
import sys
import asyncio
import io
import subprocess

# Force UTF-8 output so Chinese/Japanese/Korean track names don't crash
sys.stdout.reconfigure(encoding='utf-8', errors='replace')


def spotify_process_running():
    try:
        result = subprocess.run(['tasklist', '/NH'], capture_output=True, text=True, timeout=3)
        return 'spotify.exe' in result.stdout.lower()
    except:
        return False


async def extract_album_color(thumbnail_ref):
    if not thumbnail_ref:
        return "#1e293b", "#ffffff", "#94a3b8" # Default slate, crisp white title, soft silver artist
    try:
        from winsdk.windows.storage.streams import DataReader
        from PIL import Image

        stream = await thumbnail_ref.open_read_async()
        if not stream or stream.size == 0:
            return "#1e293b", "#ffffff", "#94a3b8"

        reader = DataReader(stream)
        await reader.load_async(stream.size)
        buffer = bytearray(stream.size)
        reader.read_bytes(buffer)

        img = Image.open(io.BytesIO(buffer)).convert('RGB')
        img = img.resize((30, 30))

        # Get dominant color
        colors = img.getcolors(900)
        if not colors:
            return "#1e293b", "#ffffff", "#94a3b8"

        # Sort by frequency
        sorted_colors = sorted(colors, key=lambda c: c[0], reverse=True)

        for _, (r, g, b) in sorted_colors:
            # Skip near-black or near-white for background
            brightness = (r * 299 + g * 587 + b * 114) / 1000
            if 30 < brightness < 220:
                # Solid rich album background
                bg_r = max(18, int(r * 0.5))
                bg_g = max(24, int(g * 0.5))
                bg_b = max(38, int(b * 0.5))

                # High contrast text (pure crisp white or bright pastel for maximum legibility)
                fg_title = "#ffffff"
                
                # Vibrant accent color for progress bar & active elements
                accent_r = min(255, max(180, int(r * 1.4)))
                accent_g = min(255, max(180, int(g * 1.4)))
                accent_b = min(255, max(180, int(b * 1.4)))

                bg_hex = f"#{bg_r:02x}{bg_g:02x}{bg_b:02x}"
                accent_hex = f"#{accent_r:02x}{accent_g:02x}{accent_b:02x}"
                return bg_hex, fg_title, accent_hex

        return "#1e293b", "#ffffff", "#38bdf8"
    except Exception:
        return "#1e293b", "#ffffff", "#38bdf8"


async def get_media_async():
    try:
        from winsdk.windows.media.control import GlobalSystemMediaTransportControlsSessionManager as MediaManager

        manager = await MediaManager.request_async()
        sessions = manager.get_sessions()

        for session in sessions:
            source = (session.source_app_user_model_id or '').lower()
            # Match Spotify session by source app ID
            if 'spotify' not in source:
                continue

            try:
                info = await session.try_get_media_properties_async()
                playback = session.get_playback_info()
                timeline = session.get_timeline_properties()

                # MediaPlaybackStatus: 3 = PLAYING, 4 = PAUSED
                status = playback.playback_status
                is_paused = (status != 3)  # 3 is PLAYING

                position_sec = 0.0
                duration_sec = 0.0

                if timeline:
                    if hasattr(timeline, 'position') and timeline.position:
                        position_sec = round(timeline.position.total_seconds(), 1)
                    if hasattr(timeline, 'end_time') and timeline.end_time:
                        duration_sec = round(timeline.end_time.total_seconds(), 1)

                bg_color, fg_title, accent_color = await extract_album_color(info.thumbnail)

                return {
                    "running": True,
                    "track": info.title or '',
                    "artist": info.artist or '',
                    "paused": is_paused,
                    "status": status,
                    "position_sec": position_sec,
                    "duration_sec": duration_sec,
                    "bgColor": bg_color,
                    "fgTitle": fg_title,
                    "accentColor": accent_color
                }
            except Exception as e:
                return {"running": True, "track": "", "artist": "", "paused": True, "error": str(e), "bgColor": "#1e293b", "fgTitle": "#ffffff", "accentColor": "#38bdf8"}

        # No Spotify session in media manager — check if process is running
        if spotify_process_running():
            return {"running": True, "track": "", "artist": "", "paused": True, "position_sec": 0, "duration_sec": 0, "bgColor": "#1e293b", "fgTitle": "#ffffff", "accentColor": "#38bdf8"}

        return {"running": False, "track": "", "artist": "", "paused": False, "position_sec": 0, "duration_sec": 0, "bgColor": "#1e293b", "fgTitle": "#ffffff", "accentColor": "#38bdf8"}

    except ImportError:
        # winsdk not available — fallback
        if spotify_process_running():
            return {"running": True, "track": "", "artist": "", "paused": True, "position_sec": 0, "duration_sec": 0, "bgColor": "#1e293b", "fgTitle": "#ffffff", "accentColor": "#38bdf8"}
        return {"running": False, "track": "", "artist": "", "paused": False, "position_sec": 0, "duration_sec": 0, "bgColor": "#1e293b", "fgTitle": "#ffffff", "accentColor": "#38bdf8"}

    except Exception as e:
        return {"running": False, "track": "", "artist": "", "paused": False, "error": str(e), "position_sec": 0, "duration_sec": 0, "bgColor": "#1e293b", "fgTitle": "#ffffff", "accentColor": "#38bdf8"}


def get_spotify_info():
    return asyncio.run(get_media_async())


if __name__ == "__main__":
    result = get_spotify_info()
    print(json.dumps(result, ensure_ascii=False))
