# Security

If you find a vulnerability — command injection, SSRF, path traversal,
arbitrary file reads — please report it privately to **vj07072010@gmail.com**.
Don't open a public issue for it.

Scope notes:

- The download and convert APIs run server-side. They sanitize paths and
  allow only known media extensions.
- `.toolbox-tmp/` is swept after 15 minutes; jobs may still hold file
  handles briefly after completion.
- Tooling in this repo trusts input from the browser less than it looks like
  it does — treat anything crossing the client/server boundary as hostile.

There's no bug bounty, but prompt reports will be acknowledged and credited
in the changelog if you want.
