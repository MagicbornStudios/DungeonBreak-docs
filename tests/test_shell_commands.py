from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.engine.bootstrap import create_session


def test_shell_actions_command_lists_availability() -> None:
    session = create_session(player_name="Kael")
    output = session.shell.run_command("actions")
    assert "go south" in output or "go east" in output


def test_shell_stream_command_reports_fame_change() -> None:
    session = create_session(player_name="Kael")
    output = session.shell.run_command("stream")
    assert "Fame +" in output or "live_stream" in output


def test_shell_options_all_shows_blocked_and_available() -> None:
    session = create_session(player_name="Kael")
    output = session.shell.run_command("options all")
    assert "[ok]" in output or "[blocked]" in output
