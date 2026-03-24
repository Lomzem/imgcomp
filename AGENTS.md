- ALWAYS use `bun` instead of `npm`/`node`!
- `git commit` messages should follow **conventional commit standards**.
- ALWAYS try to use _Tailwind_ rather than _standard CSS_
- After every significant change, make sure your changes do not violate linting checks from `bun run check`
- This app is designed to be **highly cacheable**, **performant**, **static**, and **client-side**. We will **NOT** have a server or use a frontend framework like React.
- This app priotizes UX effectiveness, efficiency, and satisfaction.

# Project's Philosophy

- Primary user is the maintainer, using the app mostly on mobile for quick single-image compression.
- Support both single-image and batch compression, but optimize the UX for the fastest single-image path.
- Clipboard support is important, especially where browsers allow it, but file picking must remain the most reliable path.
- Prioritize client-side privacy, small outputs, responsiveness, and low-friction UX over feature breadth.
- Default behavior should be sensible: minimal steps, mobile-first layouts, EXIF stripped by default, advanced controls hidden unless needed.
- We care more about practical utility, performance, and static-hosting reliability on GitHub Pages than visual flourish or trendy architecture.
- Do not introduce a server, React, or unnecessary complexity; keep the app simple, static, and easy to reason about.
