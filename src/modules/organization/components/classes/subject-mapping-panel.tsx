import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SubjectMappingOption } from "@/modules/organization/types/classes-admin";

interface SubjectMappingPanelProps {
  curriculum: string;
  subjects: SubjectMappingOption[];
}

export function SubjectMappingPanel({ curriculum, subjects }: SubjectMappingPanelProps) {
  const [mapped, setMapped] = useState(() =>
    Object.fromEntries(subjects.map((s) => [s.id, s.mapped])),
  );

  const toggle = (id: string, checked: boolean) => {
    setMapped((current) => ({ ...current, [id]: checked }));
  };

  return (
    <Card className="max-w-lg border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-blue-900 dark:text-blue-100">
          Map Subjects to {curriculum}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select subjects that are offered under {curriculum} curriculum.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pb-6">
        <div className="space-y-3">
          {subjects.map((subject) => (
            <label
              key={subject.id}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 px-3 py-2 hover:bg-muted/30"
            >
              <Checkbox
                checked={mapped[subject.id]}
                onCheckedChange={(checked) => toggle(subject.id, checked === true)}
              />
              <Label className="cursor-pointer font-normal">{subject.name}</Label>
            </label>
          ))}
        </div>
        <Button className="w-full bg-primary">Save Mapping</Button>
      </CardContent>
    </Card>
  );
}
