# Voiceover

Optional. Any provider whose key is in `.env` works; ElevenLabs is the recommended default.

| Provider | `.env` key(s) | Notes |
|---|---|---|
| ElevenLabs (recommended) | `ELEVENLABS_API_KEY` | Most natural; your cloned or library voices; model `eleven_multilingual_v2` (override with `ELEVENLABS_MODEL`) |
| OpenAI | `OPENAI_API_KEY` | `gpt-4o-mini-tts`; tone steerable with `OPENAI_TTS_INSTRUCTIONS` |
| Google Cloud | `GOOGLE_TTS_API_KEY` | API key with Text-to-Speech enabled; `--lang` filters voices |
| Azure AI Speech | `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION` | Neural voices; `--lang` filters voices |
| Local | none | macOS `say` or `espeak-ng`; drafts and timing only, not for delivery |

## 1. Script

Write `vo_script.json`: one line per shot, `t` = the shot's start time in seconds.

```json
[
  { "t": 0.3, "text": "AI can build your website." },
  { "t": 4.2, "text": "But who's bringing the traffic?" }
]
```

- About 2.3 words per second; leave 0.3 s of air before the next line.
- Say what the picture can't: the why, the outcome. Don't read the on-screen text aloud word for word.
- Numbers and names exactly as on the site. Spell out awkward ones phonetically if a voice stumbles.

## 2. Pick the voice

```bash
node voiceover.mjs providers                       # ✓ / ✗ per provider, in recommended order
node voiceover.mjs voices --provider elevenlabs    # id, name, labels
```

Ask the user with 3-4 voices that fit the brief (e.g. "warm, confident narrator", "young, upbeat")
plus "I'll paste a voice ID" as the last option. To audition, write a one-line script with the
hook line and generate it with 2-3 candidate voices into separate folders, then share the files.

## 3. Generate and fit

```bash
node voiceover.mjs say --provider elevenlabs --voice <voice_id> --script vo_script.json --dur <video seconds>
```

Writes `audio/voice.wav` (every line placed at its `t`), `audio/vo/NN.wav`,
`audio/vo_timing.json` and `audio/vo_usage.json` (characters, for the cost report).
Exit code 2 = a line overruns the next one: shorten it or move that shot later, then re-run.
Use the real end times from `vo_timing.json` when timing on-screen beats.

## 4. Mix

```bash
./mix.sh out/silent.mp4 out/final.mp4 audio/music.wav out/sfx.wav --voice audio/voice.wav
```

Music ducks under the voice via sidechain compression; the result is normalized to -14 LUFS.

## 5. Captions

```bash
node captions.mjs --mux out/final_16x9.mp4      # once per format; captions.srt is written each time
```

Writes `out/captions.srt` from the real line times in `vo_timing.json` (at most 2 lines of 42
characters per cue) and adds it to the MP4 as a subtitle track players can switch on. Most
social video plays muted, so deliver the `.srt` too: X, LinkedIn and YouTube take it as an upload.
