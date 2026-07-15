from __future__ import annotations

import pytest

from app import cli


def test_read_password_requires_matching_confirmation(monkeypatch: pytest.MonkeyPatch) -> None:
    values = iter(("a-secure-password", "a-different-password"))
    monkeypatch.setattr(cli.getpass, "getpass", lambda _: next(values))

    with pytest.raises(SystemExit, match="do not match"):
        cli.read_password(None, confirm=True)


def test_read_password_accepts_matching_confirmation(monkeypatch: pytest.MonkeyPatch) -> None:
    values = iter(("a-secure-password", "a-secure-password"))
    monkeypatch.setattr(cli.getpass, "getpass", lambda _: next(values))

    assert cli.read_password(None, confirm=True) == "a-secure-password"


def test_read_password_uses_environment_without_prompt(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_TEST_PASSWORD", "a-secure-password")
    monkeypatch.setattr(
        cli.getpass,
        "getpass",
        lambda _: pytest.fail("getpass should not be called"),
    )

    assert cli.read_password("ADMIN_TEST_PASSWORD", confirm=True) == "a-secure-password"
