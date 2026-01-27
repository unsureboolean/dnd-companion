import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";

interface LevelUpDialogProps {
  characterId: number;
  currentLevel: number;
  onLevelUp: () => void;
}

export function LevelUpDialog({ characterId, currentLevel, onLevelUp }: LevelUpDialogProps) {
  const [open, setOpen] = useState(false);
  const [targetLevel, setTargetLevel] = useState(currentLevel + 1);
  const [selectedSpells, setSelectedSpells] = useState<Set<string>>(new Set());
  const [selectedCantrips, setSelectedCantrips] = useState<Set<string>>(new Set());
  const [selectedSubclass, setSelectedSubclass] = useState<string>("");
  const [selectedASI, setSelectedASI] = useState<{ ability: string; increase: number } | null>(null);

  // Fetch leveling options
  const { data: levelingOptions, isLoading } = trpc.leveling.getLevelingOptions.useQuery(
    { characterId, targetLevel },
    { enabled: open }
  );

  const levelUpMutation = trpc.leveling.levelUp.useMutation({
    onSuccess: () => {
      toast.success(`Character leveled up to level ${targetLevel}!`);
      setOpen(false);
      setSelectedSpells(new Set());
      setSelectedCantrips(new Set());
      setSelectedSubclass("");
      setSelectedASI(null);
      onLevelUp();
    },
    onError: (error) => {
      toast.error(`Failed to level up: ${error.message}`);
    },
  });

  const handleLevelUp = () => {
    levelUpMutation.mutate({
      characterId,
      targetLevel,
      selectedSpells: Array.from(selectedSpells),
      selectedCantrips: Array.from(selectedCantrips),
      selectedSubclass: selectedSubclass || undefined,
      abilityScoreImprovement: selectedASI
        ? {
            ability: selectedASI.ability as any,
            increase: selectedASI.increase,
          }
        : undefined,
    });
  };

  const toggleSpell = (spellIndex: string) => {
    const newSpells = new Set(selectedSpells);
    if (newSpells.has(spellIndex)) {
      newSpells.delete(spellIndex);
    } else {
      newSpells.add(spellIndex);
    }
    setSelectedSpells(newSpells);
  };

  const toggleCantrip = (cantripIndex: string) => {
    const newCantrips = new Set(selectedCantrips);
    if (newCantrips.has(cantripIndex)) {
      newCantrips.delete(cantripIndex);
    } else {
      newCantrips.add(cantripIndex);
    }
    setSelectedCantrips(newCantrips);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Level Up
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Level Up Character</DialogTitle>
          <DialogDescription>
            Choose your character's new abilities, spells, and improvements for level {targetLevel}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : levelingOptions ? (
          <Tabs defaultValue="spells" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="spells">Spells</TabsTrigger>
              <TabsTrigger value="cantrips">Cantrips</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="improvements">Improvements</TabsTrigger>
            </TabsList>

            {/* Spells Tab */}
            <TabsContent value="spells" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Select new spells available at this level
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {levelingOptions.availableSpells.length > 0 ? (
                  levelingOptions.availableSpells.map((spell) => (
                    <div key={spell.index} className="flex items-start space-x-2">
                      <Checkbox
                        id={`spell-${spell.index}`}
                        checked={selectedSpells.has(spell.index)}
                        onCheckedChange={() => toggleSpell(spell.index)}
                      />
                      <Label htmlFor={`spell-${spell.index}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{spell.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {spell.school} • {spell.castingTime} • Range: {spell.range}
                        </div>
                        <div className="text-xs mt-1">{spell.description}</div>
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No new spells available at this level</p>
                )}
              </div>
            </TabsContent>

            {/* Cantrips Tab */}
            <TabsContent value="cantrips" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Select new cantrips available at this level
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {levelingOptions.availableCantrips.length > 0 ? (
                  levelingOptions.availableCantrips.map((cantrip) => (
                    <div key={cantrip.index} className="flex items-start space-x-2">
                      <Checkbox
                        id={`cantrip-${cantrip.index}`}
                        checked={selectedCantrips.has(cantrip.index)}
                        onCheckedChange={() => toggleCantrip(cantrip.index)}
                      />
                      <Label htmlFor={`cantrip-${cantrip.index}`} className="flex-1 cursor-pointer">
                        <div className="font-medium">{cantrip.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {cantrip.school} • {cantrip.castingTime}
                        </div>
                        <div className="text-xs mt-1">{cantrip.description}</div>
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No new cantrips available at this level</p>
                )}
              </div>
            </TabsContent>

            {/* Features Tab */}
            <TabsContent value="features" className="space-y-4">
              <div className="text-sm text-muted-foreground">
                New class features gained at this level
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {levelingOptions.newClassFeatures.length > 0 ? (
                  levelingOptions.newClassFeatures.map((feature) => (
                    <Card key={feature.index}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">{feature.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-muted-foreground">
                        {feature.description}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No new features at this level</p>
                )}
              </div>
            </TabsContent>

            {/* Improvements Tab */}
            <TabsContent value="improvements" className="space-y-4">
              <div className="space-y-4">
                {/* Subclass Selection */}
                {levelingOptions.grantedSubclass && (
                  <div>
                    <Label className="text-base font-semibold mb-2 block">Choose Your Subclass</Label>
                    <Select value={selectedSubclass} onValueChange={setSelectedSubclass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subclass" />
                      </SelectTrigger>
                      <SelectContent>
                        {levelingOptions.subclasses.map((subclass) => (
                          <SelectItem key={subclass.name} value={subclass.name}>
                            {subclass.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Ability Score Improvement */}
                {levelingOptions.grantedASI && (
                  <div>
                    <Label className="text-base font-semibold mb-2 block">Ability Score Improvement</Label>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"].map(
                          (ability) => (
                            <Button
                              key={ability}
                              variant={
                                selectedASI?.ability === ability ? "default" : "outline"
                              }
                              onClick={() =>
                                setSelectedASI({
                                  ability,
                                  increase: 2,
                                })
                              }
                              className="text-xs"
                            >
                              {ability.substring(0, 3).toUpperCase()} +2
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* HP Gain Info */}
                <Card className="bg-muted">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Hit Points</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>
                      You will gain <strong>{levelingOptions.hitPointsGain} HP</strong> from leveling up.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleLevelUp}
            disabled={levelUpMutation.isPending || isLoading}
            className="gap-2"
          >
            {levelUpMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Leveling Up...
              </>
            ) : (
              "Confirm Level Up"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
