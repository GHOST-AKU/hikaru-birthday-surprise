"""Regenerate static announcer clips with: python -m pip install edge-tts; python scripts/generate-radio-news.py."""
import asyncio
import os
from pathlib import Path
import edge_tts

DESTINATION = Path(__file__).resolve().parents[1] / 'public' / 'radio'
BROADCASTS = {
    'zh': ('zh-TW-YunJheNeural', '現在插播一條特別消息。今天是 Hikaru 的生日。本台祝 Hikaru 生日快樂，新的一歲，盡興遊戲，安心休息。今天的頭條，留給你。'),
    'en': ('en-US-GuyNeural', 'We interrupt this broadcast with a special announcement. Today is Hikaru’s birthday. Here’s to good games, good rest, and another year of being you. Today, you’re the headline. Happy birthday.'),
}

async def main():
    DESTINATION.mkdir(parents=True, exist_ok=True)
    for language, (voice, text) in BROADCASTS.items():
        await edge_tts.Communicate(text, voice, rate='-5%', proxy=os.environ.get('HTTPS_PROXY')).save(str(DESTINATION / f'news-{language}.mp3'))
        print(f'Generated {language} broadcast')

if __name__ == '__main__':
    asyncio.run(main())
