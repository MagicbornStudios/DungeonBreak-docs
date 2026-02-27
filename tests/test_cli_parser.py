from __future__ import annotations

from dungeonbreak_narrative.escape_the_dungeon.cli import build_parser


def test_cli_parser_defaults() -> None:
    parser = build_parser()
    args = parser.parse_args([])
    assert args.player == "Kael"
    assert args.embeddings is False


def test_cli_parser_custom_values() -> None:
    parser = build_parser()
    args = parser.parse_args(["--player", "Rin", "--embeddings"])
    assert args.player == "Rin"
    assert args.embeddings is True
