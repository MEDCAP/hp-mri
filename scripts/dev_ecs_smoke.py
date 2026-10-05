#!/usr/bin/env python3
"""
Exercise a deployed API end to end and print one JSON result on stdout.

    dev_ecs_smoke.py --base-url https://api-dev.medcap.ai [--token T] [--recon-file ID]

The token is a Cognito ID token for the test account (dev-ecs.sh token); it
may also come from DEV_ECS_TOKEN. Without one only the guest steps run.

The stack serves production data, so the only writes are a private fixture the
run uploads itself and, with --recon-file, the reconstruction it produces. Both
are deleted at the end, and the script never deletes an id it did not create.

Exit status: 0 when every step passed, 1 otherwise.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / "server"), str(ROOT / "server" / "tests")]

DETAIL_LIMIT = 500


class Smoke:
    """One run against one base URL: the steps it recorded and the files it made."""
    def __init__(self, base_url, token, mode):
        self.base_url = base_url.rstrip("/")
        self.token = token
        self.mode = mode
        self.steps = []
        self.created = []  # file ids this run made; the only ones it may delete

    def request(self, method, path, *, body=None, auth=True, url=None, data=None, headers=None):
        headers = dict(headers or {})
        if body is not None:
            data = json.dumps(body).encode()
            headers["Content-Type"] = "application/json"
        if auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        req = urllib.request.Request(url or self.base_url + path, data=data, method=method, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                status, raw = resp.status, resp.read()
        except urllib.error.HTTPError as err:
            status, raw = err.code, err.read()
        try:
            payload = json.loads(raw) if raw else None
        except ValueError:
            payload = raw.decode(errors="replace")
        return status, payload

    def step(self, name, fn):
        """Run fn() -> (ok, status, payload); record it; return payload when ok."""
        started = time.monotonic()
        try:
            ok, status, payload = fn()
        except Exception as err:  # pylint: disable=broad-except
            ok, status, payload = False, None, f"{type(err).__name__}: {err}"
        detail = payload if isinstance(payload, str) else json.dumps(payload)
        self.steps.append({
            "name": name,
            "ok": ok,
            "status": status,
            "ms": round((time.monotonic() - started) * 1000),
            "detail": detail[:DETAIL_LIMIT] if detail else detail,
        })
        print(f"{'PASS' if ok else 'FAIL'} {name} ({status})", file=sys.stderr)
        return payload if ok else None

    def expect(self, method, path, status=200, check=None, **kw):
        def run():
            got, payload = self.request(method, path, **kw)
            ok = got == status and (check is None or check(payload))
            return ok, got, payload
        return run

    # --- the run ------------------------------------------------------------

    def run(self, recon_file):
        self.step("health", self.expect(
            "GET", "/api/health", auth=False,
            check=lambda p: p.get("mode") == self.mode))
        self.step("guest list hides ownerId", self.expect(
            "GET", "/api/mrd-files?limit=20", auth=False,
            check=lambda p: isinstance(p, list) and all("ownerId" not in f for f in p)))

        if not self.token:
            return
        self.step("list files", self.expect("GET", "/api/mrd-files?limit=20"))
        self.step("list groups", self.expect("GET", "/api/groups"))
        self.step("list jobs", self.expect("GET", "/api/jobs"))

        try:
            file_id = self.upload_fixture()
            if file_id:
                self.view(file_id)
            if recon_file:
                self.recon(recon_file)
        finally:
            self.cleanup()

    def upload_fixture(self):
        from mrd_fixtures import build_mrd_bytes  # pylint: disable=import-outside-toplevel,import-error
        payload = build_mrd_bytes()
        name = f"dev-ecs-smoke-{int(time.time())}.mrd"

        init = self.step("upload init", self.expect(
            "POST", "/api/uploads/init",
            body={"filename": name, "fileSize": len(payload), "groupName": None, "kind": "mrd"}))
        if not init:
            return None
        if not self.step("upload PUT to S3", self.expect(
                "PUT", "", url=init["uploadUrl"], auth=False, data=payload,
                headers={"Content-Type": "application/octet-stream"})):
            return None
        done = self.step("upload complete", self.expect(
            "POST", f"/api/uploads/{init['uploadId']}/complete", status=201,
            body={"filename": name, "groupName": None}))
        if not done:
            return None
        self.created.append(done["fileId"])
        return done["fileId"]

    def view(self, file_id):
        self.step("get file is private and mine", self.expect(
            "GET", f"/api/mrd-files/{file_id}", check=lambda p: p.get("groupName") is None))
        listing = self.step("viewer arrays", self.expect(
            "GET", f"/api/viewer/{file_id}/arrays", check=lambda p: len(p.get("arrays", [])) > 0))
        if listing:
            key = listing["arrays"][0]["key"]
            self.step("viewer array data", self.expect(
                "GET", f"/api/viewer/{file_id}/arrays/{key}", check=lambda p: "data" in p))
        self.step("viewer waveforms", self.expect("GET", f"/api/viewer/{file_id}/waveforms"))

    def recon(self, file_id, timeout_s=900):
        started = self.step("recon start", self.expect(
            "POST", "/api/recon", status=202, body={"fileId": file_id, "stages": [{"id": "shift"}]}))
        if not started:
            return

        def poll():
            deadline = time.monotonic() + timeout_s
            while True:
                status, job = self.request("GET", f"/api/jobs/{started['jobId']}")
                if status != 200:
                    return False, status, job
                if job.get("output_file_id"):
                    self.created.append(job["output_file_id"])
                if job["status"] in ("succeeded", "failed"):
                    return job["status"] == "succeeded", status, job
                if time.monotonic() > deadline:
                    return False, status, {"timeout_s": timeout_s, "job": job}
                time.sleep(10)
        self.step("recon job succeeds", poll)

    def cleanup(self):
        if not self.created:
            return
        ids = list(dict.fromkeys(self.created))
        self.step("delete created files", self.expect(
            "DELETE", "/api/mrd-file", body={"ids": ids},
            check=lambda p: p.get("deleted_count") == len(ids)))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--token", default=os.environ.get("DEV_ECS_TOKEN"))
    parser.add_argument("--expect-mode", default="production", help="FLASK_ENV /api/health should report")
    parser.add_argument("--recon-file", help="a visible file id to run a shift recon on")
    args = parser.parse_args()

    smoke = Smoke(args.base_url, args.token, args.expect_mode)
    smoke.run(args.recon_file)
    ok = all(s["ok"] for s in smoke.steps)
    json.dump({
        "ok": ok,
        "base_url": smoke.base_url,
        "signed_in": bool(args.token),
        "passed": sum(s["ok"] for s in smoke.steps),
        "failed": [s["name"] for s in smoke.steps if not s["ok"]],
        "steps": smoke.steps,
    }, sys.stdout, indent=2)
    print()
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
