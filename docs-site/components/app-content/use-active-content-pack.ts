"use client";

import { useEffect, useState } from "react";
import {
  ACTIVE_CONTENT_PACK_STORAGE_KEY,
  ACTIVE_CONTENT_PACK_UPDATED_EVENT,
  readActiveContentPackSnapshot,
  type ActiveContentPackSnapshot,
} from "@/lib/active-content-pack";

export function useActiveContentPack(): ActiveContentPackSnapshot | null {
  const [snapshot, setSnapshot] = useState<ActiveContentPackSnapshot | null>(() => readActiveContentPackSnapshot());

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVE_CONTENT_PACK_STORAGE_KEY) return;
      setSnapshot(readActiveContentPackSnapshot());
    };
    const onUpdated = () => {
      setSnapshot(readActiveContentPackSnapshot());
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener(ACTIVE_CONTENT_PACK_UPDATED_EVENT, onUpdated);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(ACTIVE_CONTENT_PACK_UPDATED_EVENT, onUpdated);
    };
  }, []);

  return snapshot;
}

