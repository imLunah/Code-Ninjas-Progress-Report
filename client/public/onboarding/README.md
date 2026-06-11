# Onboarding media

Drop animation assets here. The Getting Started carousel (`src/pages/GettingStartedPage.jsx`)
looks for these by filename and falls back to an icon if a file is missing — so the flow
works before any assets exist, and you can add them incrementally.

## Screen clips (looping, muted) — `.webm` preferred (smaller), `.mp4` ok
- `checkin.webm`  — checking a ninja in on Today's Board
- `log.webm`      — logging a session / progress
- `progress.webm` — a ninja profile / progress history
- `clubs.webm`    — starting a club session
- `roster.webm`   — Center Director: roster search / add student
- `reports.webm`  — Center Director: reports
- `staff.webm`    — Center Director: staff management

Keep each a few seconds and under ~2–3 MB. Make them with macOS screen recording /
QuickTime (or a phone capture of the mobile UI), then compress with Handbrake or ffmpeg, e.g.:
`ffmpeg -i in.mov -an -vf "scale=720:-2" -c:v libvpx-vp9 -b:v 0 -crf 34 checkin.webm`

## Lottie animations — `.json`
- `welcome.json`   — welcome screen
- `celebrate.json` — final "you're all set" screen

Get free ones at https://lottiefiles.com, or author in After Effects (Bodymovin),
Rive, or Figma export plugins.
