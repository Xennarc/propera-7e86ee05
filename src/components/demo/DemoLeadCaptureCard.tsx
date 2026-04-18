import { useState } from "react";
import { z } from "zod";
import { CheckCircle2, Send, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LeadSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  resort_name: z.string().trim().max(200).optional().or(z.literal("")),
  role: z.string().trim().max(80).optional().or(z.literal("")),
});

const ROLE_OPTIONS = [
  "Owner / GM",
  "Operations",
  "Front Office",
  "Activities / Watersports",
  "F&B",
  "IT",
  "Other",
];

export function DemoLeadCaptureCard() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [resortName, setResortName] = useState("");
  const [role, setRole] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = LeadSchema.safeParse({ email, name, resort_name: resortName, role });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message ?? "Check your inputs");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("capture-demo-lead", {
        body: {
          email: parsed.data.email,
          name: parsed.data.name || null,
          resort_name: parsed.data.resort_name || null,
          role: parsed.data.role || null,
          source: "book-demo",
        },
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Thanks — we'll be in touch.");
    } catch (err) {
      console.error("Lead capture failed", err);
      toast.error("Couldn't save right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="py-10 md:py-14 relative">
      <div className="container mx-auto px-4">
        <Card className="max-w-3xl mx-auto bg-card/60 backdrop-blur-xl border border-border/30 rounded-3xl">
          <CardContent className="p-6 sm:p-8 md:p-10">
            {submitted ? (
              <div className="text-center py-6">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  Thanks — we'll be in touch.
                </h3>
                <p className="text-sm text-muted-foreground">
                  Meanwhile, feel free to keep exploring the demo above.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground">
                      Want us to follow up?
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Optional — the demo is fully open above. Drop your email if you'd
                      like a tailored walkthrough or pricing for your resort.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <Label htmlFor="lead-email" className="text-xs text-muted-foreground">
                        Email *
                      </Label>
                      <Input
                        id="lead-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@resort.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lead-name" className="text-xs text-muted-foreground">
                        Name
                      </Label>
                      <Input
                        id="lead-name"
                        type="text"
                        autoComplete="name"
                        placeholder="Optional"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lead-resort" className="text-xs text-muted-foreground">
                        Resort
                      </Label>
                      <Input
                        id="lead-resort"
                        type="text"
                        placeholder="Optional"
                        value={resortName}
                        onChange={(e) => setResortName(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="lead-role" className="text-xs text-muted-foreground">
                        Your role
                      </Label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger id="lead-role" className="mt-1">
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <p className="text-xs text-muted-foreground/80">
                      We'll only use this to follow up. No spam.
                    </p>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full font-semibold px-6"
                    >
                      {submitting ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Send
                    </Button>
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
