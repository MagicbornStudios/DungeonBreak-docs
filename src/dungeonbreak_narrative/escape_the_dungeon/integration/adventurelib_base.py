"""Adapter for vendored adventurelib.

The repository keeps an upstream clone in `vendor/adventurelib`.
This module loads the vendored source directly so the game can extend it
without requiring a separate pip install.
"""

from __future__ import annotations

import importlib
import importlib.util
from functools import lru_cache
from pathlib import Path
from types import ModuleType
from typing import Any


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[4]


def _adventurelib_path() -> Path:
    return _repo_root() / "vendor" / "adventurelib" / "adventurelib.py"


@lru_cache(maxsize=1)
def get_adventurelib() -> ModuleType:
    module_path = _adventurelib_path()
    if module_path.exists():
        spec = importlib.util.spec_from_file_location("dungeonbreak_vendor_adventurelib", module_path)
        if spec is None or spec.loader is None:
            raise ImportError(f"Could not load adventurelib module from {module_path}")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)  # type: ignore[union-attr]
        return module

    # CI and packaged distributions may not include the vendored checkout;
    # fall back to installed package.
    try:
        return importlib.import_module("adventurelib")
    except ModuleNotFoundError as exc:
        raise FileNotFoundError(
            f"Vendored adventurelib not found at {module_path}, and installed package "
            "'adventurelib' is unavailable. Run: pip install adventurelib "
            "or clone https://github.com/lordmauve/adventurelib.git to vendor/adventurelib"
        ) from exc


def reset_command_registry() -> None:
    """Clear command registry so command bindings can be safely rebuilt."""
    adventurelib = get_adventurelib()
    adventurelib.commands[:] = [(adventurelib.Pattern("quit"), adventurelib.sys.exit, {})]


def ensure_vertical_directions() -> None:
    """Ensure `up/down` directions exist on adventurelib.Room."""
    adventurelib = get_adventurelib()
    room_cls = adventurelib.Room
    directions = getattr(room_cls, "_directions", {})
    if "up" in directions and "down" in directions:
        return
    try:
        room_cls.add_direction("up", "down")
    except (KeyError, AttributeError):
        # In case a previous runtime already added one side of the pair.
        pass


def room_class() -> Any:
    return get_adventurelib().Room
