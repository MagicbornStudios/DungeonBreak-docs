import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MigrationsPage() {
  return (
    <div className="space-y-4">
      <Card className="bg-card/70">
        <CardHeader><CardTitle>Content Migrations</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Versioned transformations for feature schemas, model schemas, and content packs to keep runtime compatibility.
        </CardContent>
      </Card>
      <Card className="bg-card/60">
        <CardHeader><CardTitle className="text-base">Migration contract (draft)</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          <p>`fromVersion`, `toVersion`, deterministic transform, validation report, and backfill strategy.</p>
          <p>Track id remaps for `featureId`, `modelId`, and references in authored content entities/items/rooms/levels/effects.</p>
        </CardContent>
      </Card>
    </div>
  );
}
