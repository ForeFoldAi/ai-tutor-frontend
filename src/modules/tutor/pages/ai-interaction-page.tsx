import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TutorAIInteractionPage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">AI Tutor Interaction</h1>
      <Card>
        <CardHeader><CardTitle>Launch AI Tools</CardTitle></CardHeader>
        <CardContent className="flex gap-3">
          <Button asChild><Link href="/ai-tutor">Open AI Tutor</Link></Button>
          <Button asChild variant="outline"><Link href="/ai-voice">Open AI Voice</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
