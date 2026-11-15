# Tyger integration

`stages.py` declares the pipeline stages and renders a codespec for each run.
`runner.py` chains them: `tyger buffer write` the source, `tyger run create` each
stage, check the run's status, `tyger buffer read` the last output, delete the
buffers. The tags it sets are listed in the repo's `CLAUDE.md` under "Tyger tags".

## Known Tyger bug: `--ttl` fails outside UTC

**Symptom.** `tyger buffer create --ttl 3.00:00:00` and
`tyger buffer set ID --ttl 3.00:00:00` get HTTP 500 from the server (after about
60 s of CLI retries) when the machine running the CLI is not in UTC. The same
commands without `--ttl` succeed.

**Cause.** `--ttl` is a duration, but the CLI converts it to an absolute
`expiresAt` before sending it, using local time:

| CLI timezone | `expiresAt` sent in the request body | Server |
|---|---|---|
| UTC-5 | `2026-11-17T14:05:35.337694-05:00` | 500 |
| UTC | `2026-11-18T16:51:48.453249Z` | 200 |

The server binds the value to a `timestamptz` column without converting it, and
Npgsql refuses a `DateTimeOffset` whose offset is not zero. Nothing maps that
exception to a 400, so it surfaces as a 500. The server-side exception is read
from the source, not from the server's logs.

**Workaround here.** `runner.py` runs every `tyger` command with `TZ=UTC`
(`_ENV`). By hand: `TZ=UTC tyger buffer create --ttl 3.00:00:00`. The expiry is
the same instant either way; only its notation changes.

**Reproduce.**

```bash
tyger buffer create --ttl 3.00:00:00 --log-level trace 2>&1 | grep -o 'expiresAt[^}]*'
TZ=UTC tyger buffer create --ttl 3.00:00:00 --log-level trace 2>&1 | grep -o 'expiresAt[^}]*'
```

**Fix upstream** (`microsoft/tyger`; present in v0.10.0 through v0.14.6 and on
`main` at `0f249d2`, no issue filed as of 2026-11-14). Either side is enough:

- CLI: `cli/internal/cmd/buffer.go`, where `buffer create` and `buffer set`
  compute `time.Now().Add(ttl)`; use `time.Now().UTC().Add(ttl)`.
- Server: `server/ControlPlane/Database/Repository.cs`, `CreateBuffer` and
  `UpdateBufferExpiresAt`; call `.ToUniversalTime()` before binding
  `NpgsqlDbType.TimestampTz`.

Upstream's own tests (`TestCreateBufferWithTtl`, `TestBufferSetTtl` in
`cli/integrationtest/controlplane_test.go`) pass, most likely because CI runs in
UTC.

Once it is fixed and the pinned CLI (`TYGER_VERSION` in `server/Dockerfile`) or
the server is upgraded, `_ENV` in `runner.py` can go.
