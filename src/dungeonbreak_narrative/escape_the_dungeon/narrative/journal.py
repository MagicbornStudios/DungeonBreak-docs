"""Act/Chapter/Page narrative logging model."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Iterable


@dataclass
class Page:
    page_id: str
    title: str
    entries: list[str] = field(default_factory=list)

    def write(self, turn_index: int, message: str) -> None:
        self.entries.append(f"[turn {turn_index:03d}] {message}")


@dataclass
class Chapter:
    chapter_number: int
    act_number: int
    depth: int
    title: str
    pages: dict[str, Page] = field(default_factory=dict)
    is_complete: bool = False


@dataclass
class Act:
    act_number: int
    chapter_numbers: tuple[int, ...]
    title: str


@dataclass
class StoryJournal:
    chapters_per_act: int
    total_levels: int
    acts: dict[int, Act] = field(default_factory=dict)
    chapters: dict[int, Chapter] = field(default_factory=dict)
    completed_chapters: set[int] = field(default_factory=set)

    def chapter_for_depth(self, depth: int) -> int:
        return self.total_levels - depth + 1

    def depth_for_chapter(self, chapter: int) -> int:
        return self.total_levels - chapter + 1

    def act_for_chapter(self, chapter: int) -> int:
        return ((chapter - 1) // self.chapters_per_act) + 1

    def _ensure_act(self, chapter: int) -> Act:
        act_number = self.act_for_chapter(chapter)
        if act_number in self.acts:
            return self.acts[act_number]
        start = (act_number - 1) * self.chapters_per_act + 1
        chapter_numbers = tuple(range(start, start + self.chapters_per_act))
        act = Act(
            act_number=act_number,
            chapter_numbers=chapter_numbers,
            title=f"Act {act_number}",
        )
        self.acts[act_number] = act
        return act

    def ensure_chapter_pages(self, chapter: int, entity_ids: Iterable[str]) -> None:
        act = self._ensure_act(chapter)
        if chapter not in self.chapters:
            depth = self.depth_for_chapter(chapter)
            self.chapters[chapter] = Chapter(
                chapter_number=chapter,
                act_number=act.act_number,
                depth=depth,
                title=f"Act {act.act_number}, Chapter {chapter}",
                pages={
                    "chapter": Page(
                        page_id="chapter",
                        title=f"Act {act.act_number}, Chapter {chapter}: Level Chronicle",
                    )
                },
            )

        chapter_obj = self.chapters[chapter]
        for entity_id in entity_ids:
            if entity_id in chapter_obj.pages:
                continue
            chapter_obj.pages[entity_id] = Page(
                page_id=entity_id,
                title=f"Act {chapter_obj.act_number}, Chapter {chapter}: {entity_id} personal page",
            )

    def write(self, chapter: int, entity_id: str, turn_index: int, message: str) -> None:
        if chapter not in self.chapters:
            self.ensure_chapter_pages(chapter=chapter, entity_ids=[entity_id])
        chapter_obj = self.chapters[chapter]
        if entity_id not in chapter_obj.pages:
            chapter_obj.pages[entity_id] = Page(
                page_id=entity_id,
                title=f"Act {chapter_obj.act_number}, Chapter {chapter}: {entity_id} personal page",
            )

        chapter_obj.pages[entity_id].write(turn_index=turn_index, message=message)
        chapter_obj.pages["chapter"].write(turn_index=turn_index, message=f"{entity_id}: {message}")

    def complete_chapter(self, chapter: int) -> bool:
        if chapter in self.completed_chapters:
            return False
        self.completed_chapters.add(chapter)
        if chapter in self.chapters:
            self.chapters[chapter].is_complete = True
        return True

    def act_complete(self, act_number: int) -> bool:
        act = self.acts.get(act_number)
        if act is None:
            return False
        return set(act.chapter_numbers).issubset(self.completed_chapters)

    def chapter_pages(self, chapter: int) -> list[Page]:
        chapter_obj = self.chapters.get(chapter)
        if chapter_obj is None:
            return []
        rows = list(chapter_obj.pages.values())
        rows.sort(key=lambda page: page.page_id)
        return rows
