"""
run_chain against a fake tyger CLI (conftest.FakeTyger): the buffer and run
calls it makes, what it refuses to read, and what it cleans up.
"""
import io
import subprocess
from datetime import datetime, timedelta, timezone

import pytest

from app.tyger.runner import StageFailed, run_chain

TWO_STAGES = [
    {"id": "shift"},
    {"id": "recon", "params": {"peaks": [{"name": "pyr", "modifiers": "s",
                                          "ppm": 9.7}]}},
]


def _flag_values(cmd, flag):
    return [cmd[i + 1] for i, arg in enumerate(cmd) if arg == flag]


def _deleted(tyger):
    return [buffer_id for cmd in tyger.calls_to("buffer", "delete") for buffer_id in cmd[3:]]


def test_a_chain_writes_the_source_and_returns_the_last_buffer(fake_tyger):
    with run_chain(TWO_STAGES, io.BytesIO(b"raw scan"), tags={"job": "j1"}) as result:
        assert result.read() == b"reconstructed"

    assert fake_tyger.written == {"buf1": b"raw scan"}
    assert [cmd[3] for cmd in fake_tyger.calls_to("buffer", "read")] == ["buf3"]
    for cmd in fake_tyger.calls_to("buffer", "create"):
        assert set(_flag_values(cmd, "--tag")) == {"app=hpmri", "job=j1"}


def test_stage_one_output_is_stage_two_input(fake_tyger):
    run_chain(TWO_STAGES, io.BytesIO(b"raw"), tags={"job": "j1"}).close()

    first, second = fake_tyger.calls_to("run", "create")
    assert _flag_values(first, "-b") == ["input=buf1", "output=buf2"]
    assert _flag_values(second, "-b") == ["input=buf2", "output=buf3"]
    assert set(_flag_values(first, "--tag")) == {"app=hpmri", "job=j1", "stage=shift"}
    assert set(_flag_values(second, "--tag")) == {"app=hpmri", "job=j1", "stage=recon"}


def test_buffers_are_deleted_after_success(fake_tyger):
    run_chain(TWO_STAGES, io.BytesIO(b"raw")).close()

    assert sorted(_deleted(fake_tyger)) == ["buf1", "buf2", "buf3"]


def test_a_failed_run_raises_and_never_reads_its_output(fake_tyger, caplog):
    fake_tyger.statuses["shift"] = "Failed"
    fake_tyger.logs = "secret cluster detail"

    with pytest.raises(StageFailed) as raised:
        run_chain(TWO_STAGES, io.BytesIO(b"raw"))

    assert raised.value.message == "The shift stage failed."
    assert not fake_tyger.calls_to("buffer", "read")
    assert len(fake_tyger.calls_to("run", "create")) == 1
    assert sorted(_deleted(fake_tyger)) == ["buf1", "buf2"]
    assert "secret cluster detail" in caplog.text


def test_a_failing_tyger_command_is_logged_not_returned(fake_tyger, caplog):
    fake_tyger.errors[("run", "create")] = b"error on cluster tep-centralus-1"

    with pytest.raises(StageFailed) as raised:
        run_chain(TWO_STAGES, io.BytesIO(b"raw"))

    assert raised.value.message == "The shift stage failed."
    assert "tep-centralus-1" in caplog.text
    assert sorted(_deleted(fake_tyger)) == ["buf1", "buf2"]


def test_a_buffer_delete_failure_does_not_fail_the_chain(fake_tyger):
    fake_tyger.errors[("buffer", "delete")] = b"nope"

    with run_chain(TWO_STAGES, io.BytesIO(b"raw")) as result:
        assert result.read() == b"reconstructed"


def test_a_timed_out_run_is_cancelled(fake_tyger):
    fake_tyger.watch_times_out = True

    with pytest.raises(StageFailed) as raised:
        run_chain(TWO_STAGES, io.BytesIO(b"raw"))

    assert raised.value.message == "The shift stage timed out."
    assert [cmd[3] for cmd in fake_tyger.calls_to("run", "cancel")] == ["run1"]
    assert not fake_tyger.calls_to("run", "show")
    assert sorted(_deleted(fake_tyger)) == ["buf1", "buf2"]


def test_a_missing_cli_is_reported_as_unavailable(fake_tyger):
    fake_tyger.errors[("buffer", "create")] = FileNotFoundError("tyger")

    with pytest.raises(StageFailed) as raised:
        run_chain(TWO_STAGES, io.BytesIO(b"raw"))

    assert raised.value.message == "The processing service is unavailable."


def test_the_stage_context_wraps_each_stage(fake_tyger):
    entered = []

    class Recorder:
        def __init__(self, stage_id):
            self.stage_id = stage_id

        def __enter__(self):
            entered.append(self.stage_id)

        def __exit__(self, *exc):
            return False

    run_chain(TWO_STAGES, io.BytesIO(b"raw"), stage_context=Recorder).close()

    assert entered == ["shift", "recon"]


def _listed(buffer_id, age):
    created = datetime.now(timezone.utc) - age
    return {"id": buffer_id, "createdAt": created.strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "tags": {"app": "hpmri"}}


def test_the_sweep_deletes_only_buffers_older_than_three_days(fake_tyger):
    fake_tyger.listed = [
        _listed("old", timedelta(days=3, minutes=1)),
        _listed("older", timedelta(days=30)),
        _listed("recent", timedelta(days=2, hours=23)),
    ]

    run_chain([{"id": "shift"}], io.BytesIO(b"raw")).close()

    listing = fake_tyger.calls_to("buffer", "list")[0]
    assert _flag_values(listing, "--tag") == ["app=hpmri"]
    assert sorted(_deleted(fake_tyger)) == ["buf1", "buf2", "old", "older"]


@pytest.mark.parametrize("error", [b"server error", subprocess.TimeoutExpired("tyger", 1)])
def test_a_sweep_failure_does_not_fail_the_chain(fake_tyger, error):
    fake_tyger.errors[("buffer", "list")] = error

    with run_chain([{"id": "shift"}], io.BytesIO(b"raw")) as result:
        assert result.read() == b"reconstructed"


def test_an_unparseable_listing_does_not_fail_the_chain(fake_tyger):
    fake_tyger.listed = [{"id": "x"}]

    run_chain([{"id": "shift"}], io.BytesIO(b"raw")).close()

    assert sorted(_deleted(fake_tyger)) == ["buf1", "buf2"]


def test_ttl_is_not_passed_by_default(fake_tyger):
    run_chain([{"id": "shift"}], io.BytesIO(b"raw")).close()

    assert all("--ttl" not in cmd for cmd in fake_tyger.calls_to("buffer", "create"))


def test_ttl_is_passed_when_configured(fake_tyger, monkeypatch):
    monkeypatch.setattr("app.tyger.runner.Config.TYGER_BUFFER_TTL", "3.00:00:00")

    run_chain([{"id": "shift"}], io.BytesIO(b"raw")).close()

    for cmd in fake_tyger.calls_to("buffer", "create"):
        assert _flag_values(cmd, "--ttl") == ["3.00:00:00"]
