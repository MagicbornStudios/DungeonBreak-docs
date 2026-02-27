"""CLI entry point for Escape the Dungeon."""

from __future__ import annotations

import argparse

from .engine.bootstrap import create_session


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run Escape the Dungeon CLI.")
    parser.add_argument("--player", default="Kael", help="Player name (default: Kael)")
    parser.add_argument(
        "--embeddings",
        action="store_true",
        help="Use sentence-transformers provider when available.",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    session = create_session(
        player_name=args.player,
        prefer_sentence_transformer=bool(args.embeddings),
    )
    print(session.game.look())
    print(
        "Type commands like: look, status, actions, options, options all, choose <id>, "
        "go north, train, rest, talk, search, say <text>, stream, steal, skills, deeds, cutscenes, pages, quit"
    )
    session.shell.start()


if __name__ == "__main__":
    main()
