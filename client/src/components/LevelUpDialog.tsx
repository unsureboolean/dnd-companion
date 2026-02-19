import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Heart,
  Shield,
  Sword,
  BookOpen,
  Wand2,
  Star,
  ChevronRight,
  ChevronLeft,
  Dices,
  Check,
} from "lucide-react";

interface LevelUpDialogProps {
  characterId: number;
  currentLevel: number;
  onLevelUp: () => void;
}

type Step = "overview" | "hp" | "spells" | "cantrips" | "subclass" | "asi" | "confirm";

export function LevelUpDialog({
  characterId,
  currentLevel,
  onLevelUp,
}: LevelUpDialogProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>("overview");

  // Selections
  const [selectedSpells, setSelectedSpells] = useState<Set<string>>(new Set());
  const [selectedCantrips, setSelectedCantrips] = useState<Set<string>>(new Set());
  const [selectedSubclass, setSelectedSubclass] = useState("");
  const [asiSelections, setAsiSelections] = useState<
    Array<{ ability: string; increase: number }>
  >([]);
  const [asiMode, setAsiMode] = useState<"plus2" | "plus1x2">("plus2");
  const [hpMethod, setHpMethod] = useState<"average" | "roll">("average");
  const [hpRollValue, setHpRollValue] = useState<number | null>(null);
  const [hasRolled, setHasRolled] = useState(false);

  const targetLevel = currentLevel + 1;

  const { data: options, isLoading } =
    trpc.leveling.getLevelingOptions.useQuery(
      { characterId, targetLevel },
      { enabled: open && targetLevel <= 20 }
    );

  const levelUpMutation = trpc.leveling.levelUp.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setOpen(false);
      resetSelections();
      onLevelUp();
    },
    onError: (error) => {
      toast.error(`Failed to level up: ${error.message}`);
    },
  });

  function resetSelections() {
    setCurrentStep("overview");
    setSelectedSpells(new Set());
    setSelectedCantrips(new Set());
    setSelectedSubclass("");
    setAsiSelections([]);
    setAsiMode("plus2");
    setHpMethod("average");
    setHpRollValue(null);
    setHasRolled(false);
  }

  useEffect(() => {
    if (open) resetSelections();
  }, [open]);

  // Build the list of applicable steps
  const steps = useMemo<Step[]>(() => {
    if (!options) return ["overview"];
    const s: Step[] = ["overview", "hp"];
    if (options.grantedSubclass) s.push("subclass");
    if (options.isCaster && options.newCantripsCount > 0) s.push("cantrips");
    if (options.isCaster && (options.newSpellsKnownCount > 0 || options.isPreparedCaster))
      s.push("spells");
    if (options.grantedASI) s.push("asi");
    s.push("confirm");
    return s;
  }, [options]);

  const currentStepIndex = steps.indexOf(currentStep);
  const canGoNext = currentStepIndex < steps.length - 1;
  const canGoBack = currentStepIndex > 0;

  function goNext() {
    if (canGoNext) setCurrentStep(steps[currentStepIndex + 1]);
  }
  function goBack() {
    if (canGoBack) setCurrentStep(steps[currentStepIndex - 1]);
  }

  function rollHitDie() {
    if (!options) return;
    const roll = Math.floor(Math.random() * options.hitDie) + 1;
    setHpRollValue(roll);
    setHasRolled(true);
  }

  const toggleSpell = (index: string) => {
    const next = new Set(selectedSpells);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedSpells(next);
  };

  const toggleCantrip = (index: string) => {
    const next = new Set(selectedCantrips);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedCantrips(next);
  };

  const handleASIAbility = (ability: string) => {
    if (asiMode === "plus2") {
      setAsiSelections([{ ability, increase: 2 }]);
    } else {
      // +1 to two different abilities
      const existing = asiSelections.filter((a) => a.ability !== ability);
      if (asiSelections.find((a) => a.ability === ability)) {
        // Remove it
        setAsiSelections(existing);
      } else if (existing.length < 2) {
        setAsiSelections([...existing, { ability, increase: 1 }]);
      } else {
        // Replace the oldest
        setAsiSelections([existing[1], { ability, increase: 1 }]);
      }
    }
  };

  const computedHpGain = useMemo(() => {
    if (!options) return 0;
    if (hpMethod === "roll" && hpRollValue !== null) {
      return Math.max(1, hpRollValue + options.conMod);
    }
    return options.averageHpGain;
  }, [options, hpMethod, hpRollValue]);

  const handleConfirm = () => {
    levelUpMutation.mutate({
      characterId,
      targetLevel,
      selectedSpells: Array.from(selectedSpells),
      selectedCantrips: Array.from(selectedCantrips),
      selectedSubclass: selectedSubclass || undefined,
      abilityScoreImprovements:
        asiSelections.length > 0
          ? asiSelections.map((a) => ({
              ability: a.ability as any,
              increase: a.increase,
            }))
          : undefined,
      hpMethod,
      hpRollValue: hpMethod === "roll" && hpRollValue ? hpRollValue : undefined,
    });
  };

  // Validation checks
  const spellsValid = !options?.isCaster || options.newSpellsKnownCount === 0 || options.isPreparedCaster || selectedSpells.size === options.newSpellsKnownCount;
  const cantripsValid = !options?.isCaster || options.newCantripsCount === 0 || selectedCantrips.size === options.newCantripsCount;
  const subclassValid = !options?.grantedSubclass || selectedSubclass !== "";
  const asiValid = !options?.grantedASI || asiSelections.reduce((s, a) => s + a.increase, 0) === 2;
  const hpValid = hpMethod === "average" || (hpMethod === "roll" && hasRolled);
  const allValid = spellsValid && cantripsValid && subclassValid && asiValid && hpValid;

  const ABILITY_NAMES = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
  const ABILITY_SHORT: Record<string, string> = {
    strength: "STR", dexterity: "DEX", constitution: "CON",
    intelligence: "INT", wisdom: "WIS", charisma: "CHA",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" className="gap-2" disabled={currentLevel >= 20}>
          <Sparkles className="h-4 w-4" />
          Level Up to {targetLevel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Level Up: {currentLevel} → {targetLevel}
          </DialogTitle>
          <DialogDescription>
            {options
              ? `${options.className} — Choose your new abilities and improvements`
              : "Loading level-up options..."}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        {options && (
          <div className="flex items-center gap-1 py-2 overflow-x-auto">
            {steps.map((step, i) => (
              <div key={step} className="flex items-center">
                <button
                  onClick={() => setCurrentStep(step)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap ${
                    step === currentStep
                      ? "bg-primary text-primary-foreground"
                      : i < currentStepIndex
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step === "overview" && "Overview"}
                  {step === "hp" && "Hit Points"}
                  {step === "spells" && "Spells"}
                  {step === "cantrips" && "Cantrips"}
                  {step === "subclass" && "Subclass"}
                  {step === "asi" && "Ability Scores"}
                  {step === "confirm" && "Confirm"}
                </button>
                {i < steps.length - 1 && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5 shrink-0" />
                )}
              </div>
            ))}
          </div>
        )}

        <Separator />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Loading class data from D&D 5e API...
            </p>
          </div>
        ) : options ? (
          <div className="min-h-[300px]">
            {/* ==================== OVERVIEW ==================== */}
            {currentStep === "overview" && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Level {targetLevel} Summary
                </h3>

                {/* Proficiency Bonus */}
                {options.proficiencyBonusIncreased && (
                  <Card className="border-yellow-500/50 bg-yellow-500/5">
                    <CardContent className="py-3 flex items-center gap-3">
                      <Shield className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-sm">Proficiency Bonus Increases</p>
                        <p className="text-xs text-muted-foreground">
                          Your proficiency bonus is now +{options.newProficiencyBonus}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Class Features */}
                {options.classFeatures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" /> New Class Features
                    </h4>
                    <div className="space-y-2">
                      {options.classFeatures.map((f) => (
                        <Card key={f.index}>
                          <CardHeader className="py-2 px-3">
                            <CardTitle className="text-sm">{f.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="px-3 pb-2 text-xs text-muted-foreground whitespace-pre-line">
                            {f.description.length > 300
                              ? f.description.substring(0, 300) + "..."
                              : f.description}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Spell Slot Changes */}
                {options.isCaster && Object.keys(options.newSpellSlots).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                      <Wand2 className="h-3.5 w-3.5" /> Spell Slots at Level {targetLevel}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(options.newSpellSlots).map(([lvl, count]) => {
                        const prev = options.prevSpellSlots[Number(lvl)] || 0;
                        const changed = count !== prev;
                        return (
                          <Badge
                            key={lvl}
                            variant={changed ? "default" : "secondary"}
                            className="text-xs"
                          >
                            Level {lvl}: {count} slot{count !== 1 ? "s" : ""}
                            {changed && prev > 0 && (
                              <span className="ml-1 text-green-300">(+{count - prev})</span>
                            )}
                            {changed && prev === 0 && (
                              <span className="ml-1 text-green-300">(new!)</span>
                            )}
                          </Badge>
                        );
                      })}
                    </div>
                    {options.unlockedNewSpellLevel && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        You've unlocked level {options.maxSpellLevel} spells!
                      </p>
                    )}
                  </div>
                )}

                {/* What's ahead summary */}
                <div className="bg-muted rounded-lg p-3 space-y-1.5">
                  <p className="text-sm font-medium">Choices to make:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-1.5">
                      <Heart className="h-3 w-3" /> Hit Points (d{options.hitDie} + {options.conMod >= 0 ? "+" : ""}{options.conMod} CON)
                    </li>
                    {options.grantedSubclass && (
                      <li className="flex items-center gap-1.5">
                        <Shield className="h-3 w-3 text-purple-500" /> Choose your subclass
                      </li>
                    )}
                    {options.isCaster && options.newCantripsCount > 0 && (
                      <li className="flex items-center gap-1.5">
                        <Wand2 className="h-3 w-3 text-blue-500" /> Learn {options.newCantripsCount} new cantrip{options.newCantripsCount > 1 ? "s" : ""}
                      </li>
                    )}
                    {options.isCaster && options.newSpellsKnownCount > 0 && (
                      <li className="flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 text-indigo-500" /> Learn {options.newSpellsKnownCount} new spell{options.newSpellsKnownCount > 1 ? "s" : ""}
                      </li>
                    )}
                    {options.isCaster && options.isPreparedCaster && (
                      <li className="flex items-center gap-1.5">
                        <BookOpen className="h-3 w-3 text-indigo-500" /> Prepared caster: can prepare up to {options.preparedSpellCount} spells ({options.preparedFormula})
                      </li>
                    )}
                    {options.grantedASI && (
                      <li className="flex items-center gap-1.5">
                        <Sword className="h-3 w-3 text-red-500" /> Ability Score Improvement (+2 to one or +1 to two)
                      </li>
                    )}
                  </ul>
                </div>

                {options.classFeatures.length === 0 && !options.proficiencyBonusIncreased && (
                  <p className="text-sm text-muted-foreground">
                    No new class features at this level. Proceed to make your choices.
                  </p>
                )}
              </div>
            )}

            {/* ==================== HIT POINTS ==================== */}
            {currentStep === "hp" && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" /> Hit Points
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your hit die is a <strong>d{options.hitDie}</strong> and your Constitution modifier is{" "}
                  <strong>{options.conMod >= 0 ? "+" : ""}{options.conMod}</strong>.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Average option */}
                  <Card
                    className={`cursor-pointer transition-all ${
                      hpMethod === "average"
                        ? "ring-2 ring-primary border-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setHpMethod("average")}
                  >
                    <CardContent className="py-4 text-center">
                      <p className="text-2xl font-bold text-primary">
                        +{options.averageHpGain}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Take Average
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ({Math.floor(options.hitDie / 2) + 1} + {options.conMod >= 0 ? "+" : ""}{options.conMod} CON)
                      </p>
                    </CardContent>
                  </Card>

                  {/* Roll option */}
                  <Card
                    className={`cursor-pointer transition-all ${
                      hpMethod === "roll"
                        ? "ring-2 ring-primary border-primary"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => setHpMethod("roll")}
                  >
                    <CardContent className="py-4 text-center">
                      {hasRolled && hpMethod === "roll" ? (
                        <>
                          <p className="text-2xl font-bold text-primary">
                            +{Math.max(1, (hpRollValue || 0) + options.conMod)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Rolled: {hpRollValue} + {options.conMod >= 0 ? "+" : ""}{options.conMod} CON
                          </p>
                        </>
                      ) : (
                        <>
                          <Dices className="h-8 w-8 mx-auto text-muted-foreground" />
                          <p className="text-xs text-muted-foreground mt-1">
                            Roll d{options.hitDie}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {hpMethod === "roll" && (
                  <div className="flex justify-center">
                    <Button onClick={rollHitDie} variant="outline" className="gap-2">
                      <Dices className="h-4 w-4" />
                      {hasRolled ? "Re-roll" : "Roll"} d{options.hitDie}
                    </Button>
                  </div>
                )}

                <div className="bg-muted rounded-lg p-3 text-sm">
                  <p>
                    HP gain: <strong>+{computedHpGain}</strong> → New max HP:{" "}
                    <strong>{(options.currentAbilityScores as any)?.maxHitPoints ?? "?"}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Range: {options.minHpGain} (min) to {options.maxHpGain} (max)
                  </p>
                </div>
              </div>
            )}

            {/* ==================== SUBCLASS ==================== */}
            {currentStep === "subclass" && options.grantedSubclass && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-500" /> Choose Your Subclass
                </h3>
                <p className="text-sm text-muted-foreground">
                  At level {targetLevel}, you choose a specialization for your {options.className}.
                </p>

                <div className="space-y-2">
                  {options.subclasses.map((sc) => (
                    <Card
                      key={sc.name}
                      className={`cursor-pointer transition-all ${
                        selectedSubclass === sc.name
                          ? "ring-2 ring-primary border-primary"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedSubclass(sc.name)}
                    >
                      <CardContent className="py-3 flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedSubclass === sc.name
                              ? "border-primary bg-primary"
                              : "border-muted-foreground"
                          }`}
                        >
                          {selectedSubclass === sc.name && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{sc.name}</p>
                          {sc.features && sc.features.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              Features: {sc.features.join(", ")}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {!subclassValid && (
                  <p className="text-xs text-destructive">
                    You must choose a subclass to continue.
                  </p>
                )}
              </div>
            )}

            {/* ==================== CANTRIPS ==================== */}
            {currentStep === "cantrips" && options.isCaster && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-blue-500" /> Learn New Cantrips
                </h3>
                <p className="text-sm text-muted-foreground">
                  Select <strong>{options.newCantripsCount}</strong> new cantrip
                  {options.newCantripsCount > 1 ? "s" : ""} to learn.
                  <span className="ml-1">
                    ({selectedCantrips.size}/{options.newCantripsCount} selected)
                  </span>
                </p>

                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                  {options.availableCantrips.length > 0 ? (
                    options.availableCantrips.map((cantrip) => (
                      <div
                        key={cantrip.index}
                        className={`flex items-start space-x-2 p-2 rounded-md border transition-colors ${
                          selectedCantrips.has(cantrip.index)
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:bg-muted"
                        }`}
                      >
                        <Checkbox
                          id={`cantrip-${cantrip.index}`}
                          checked={selectedCantrips.has(cantrip.index)}
                          disabled={
                            !selectedCantrips.has(cantrip.index) &&
                            selectedCantrips.size >= options.newCantripsCount
                          }
                          onCheckedChange={() => toggleCantrip(cantrip.index)}
                        />
                        <Label
                          htmlFor={`cantrip-${cantrip.index}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium text-sm">{cantrip.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {cantrip.school} · {cantrip.castingTime} · {cantrip.range}
                          </div>
                          {cantrip.description && (
                            <div className="text-xs mt-1 text-muted-foreground/80">
                              {cantrip.description}
                            </div>
                          )}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No cantrips available from the D&D 5e API. You can add them manually later.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ==================== SPELLS ==================== */}
            {currentStep === "spells" && options.isCaster && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-500" />
                  {options.isPreparedCaster ? "Available Spells" : "Learn New Spells"}
                </h3>

                {options.isPreparedCaster ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      As a prepared caster, you can prepare up to{" "}
                      <strong>{options.preparedSpellCount}</strong> spells each day (
                      {options.preparedFormula}). You have access to all {options.className}{" "}
                      spells up to level {options.maxSpellLevel}.
                    </p>
                    {options.unlockedNewSpellLevel && (
                      <Badge variant="default" className="text-xs">
                        New: Level {options.maxSpellLevel} spells unlocked!
                      </Badge>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Browse the spells below for reference. No selection needed — you choose
                      your prepared spells each long rest.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select <strong>{options.newSpellsKnownCount}</strong> new spell
                    {options.newSpellsKnownCount > 1 ? "s" : ""} to learn (up to level{" "}
                    {options.maxSpellLevel}).
                    <span className="ml-1">
                      ({selectedSpells.size}/{options.newSpellsKnownCount} selected)
                    </span>
                  </p>
                )}

                {/* Group spells by level */}
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {Array.from(
                    { length: options.maxSpellLevel },
                    (_, i) => i + 1
                  ).map((spellLevel) => {
                    const spellsAtLevel = options.availableSpells.filter(
                      (s) => s.level === spellLevel
                    );
                    if (spellsAtLevel.length === 0) return null;
                    return (
                      <div key={spellLevel}>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                          Level {spellLevel} Spells
                        </h4>
                        <div className="space-y-1">
                          {spellsAtLevel.map((spell) => (
                            <div
                              key={spell.index}
                              className={`flex items-start space-x-2 p-2 rounded-md border transition-colors ${
                                selectedSpells.has(spell.index)
                                  ? "border-primary bg-primary/5"
                                  : "border-transparent hover:bg-muted"
                              }`}
                            >
                              {!options.isPreparedCaster && (
                                <Checkbox
                                  id={`spell-${spell.index}`}
                                  checked={selectedSpells.has(spell.index)}
                                  disabled={
                                    !selectedSpells.has(spell.index) &&
                                    selectedSpells.size >= options.newSpellsKnownCount
                                  }
                                  onCheckedChange={() => toggleSpell(spell.index)}
                                />
                              )}
                              <Label
                                htmlFor={`spell-${spell.index}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {spell.name}
                                  </span>
                                  <div className="flex gap-1">
                                    {spell.concentration && (
                                      <Badge variant="outline" className="text-[10px] py-0">
                                        C
                                      </Badge>
                                    )}
                                    {spell.ritual && (
                                      <Badge variant="outline" className="text-[10px] py-0">
                                        R
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {spell.school} · {spell.castingTime} · {spell.range}
                                  {spell.duration !== "Instantaneous" &&
                                    ` · ${spell.duration}`}
                                </div>
                                {spell.description && (
                                  <div className="text-xs mt-1 text-muted-foreground/80">
                                    {spell.description}
                                  </div>
                                )}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {options.availableSpells.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No spells available from the D&D 5e API. You can add them manually later.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ==================== ASI ==================== */}
            {currentStep === "asi" && options.grantedASI && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sword className="h-4 w-4 text-red-500" /> Ability Score Improvement
                </h3>
                <p className="text-sm text-muted-foreground">
                  Increase your ability scores by a total of 2 points. No ability can exceed 20.
                </p>

                {/* Mode selector */}
                <div className="flex gap-2">
                  <Button
                    variant={asiMode === "plus2" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setAsiMode("plus2");
                      setAsiSelections([]);
                    }}
                  >
                    +2 to One Ability
                  </Button>
                  <Button
                    variant={asiMode === "plus1x2" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setAsiMode("plus1x2");
                      setAsiSelections([]);
                    }}
                  >
                    +1 to Two Abilities
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ABILITY_NAMES.map((ability) => {
                    const currentScore =
                      options.currentAbilityScores[
                        ability as keyof typeof options.currentAbilityScores
                      ];
                    const isSelected = asiSelections.some(
                      (a) => a.ability === ability
                    );
                    const increase =
                      asiSelections.find((a) => a.ability === ability)
                        ?.increase || 0;
                    const newScore = currentScore + increase;
                    const atCap = currentScore >= 20;
                    const wouldExceedCap =
                      asiMode === "plus2"
                        ? currentScore + 2 > 20
                        : currentScore + 1 > 20;

                    return (
                      <Card
                        key={ability}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? "ring-2 ring-primary border-primary"
                            : atCap
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:border-primary/50"
                        }`}
                        onClick={() => !atCap && handleASIAbility(ability)}
                      >
                        <CardContent className="py-3 text-center">
                          <p className="text-xs font-medium text-muted-foreground">
                            {ABILITY_SHORT[ability]}
                          </p>
                          <p className="text-lg font-bold">
                            {currentScore}
                            {increase > 0 && (
                              <span className="text-green-500 text-sm ml-1">
                                →{newScore}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            mod: {Math.floor((currentScore - 10) / 2) >= 0 ? "+" : ""}
                            {Math.floor((currentScore - 10) / 2)}
                            {increase > 0 && (
                              <span className="text-green-500 ml-1">
                                →{Math.floor((newScore - 10) / 2) >= 0 ? "+" : ""}
                                {Math.floor((newScore - 10) / 2)}
                              </span>
                            )}
                          </p>
                          {atCap && (
                            <p className="text-[10px] text-muted-foreground">
                              (max 20)
                            </p>
                          )}
                          {!atCap && wouldExceedCap && asiMode === "plus2" && (
                            <p className="text-[10px] text-yellow-600">
                              Would exceed 20
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {asiMode === "plus1x2" && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {asiSelections.length}/2 abilities
                  </p>
                )}

                {!asiValid && asiSelections.length > 0 && (
                  <p className="text-xs text-destructive">
                    {asiMode === "plus1x2"
                      ? "Select exactly 2 different abilities for +1 each."
                      : "Select one ability for +2."}
                  </p>
                )}
              </div>
            )}

            {/* ==================== CONFIRM ==================== */}
            {currentStep === "confirm" && (
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" /> Confirm Level Up
                </h3>
                <p className="text-sm text-muted-foreground">
                  Review your choices before leveling up to {targetLevel}.
                </p>

                <div className="space-y-3">
                  {/* HP */}
                  <div className="flex items-center justify-between bg-muted rounded p-2">
                    <span className="text-sm flex items-center gap-1.5">
                      <Heart className="h-3.5 w-3.5 text-red-500" /> Hit Points
                    </span>
                    <Badge variant={hpValid ? "default" : "destructive"}>
                      +{computedHpGain} HP ({hpMethod})
                    </Badge>
                  </div>

                  {/* Subclass */}
                  {options.grantedSubclass && (
                    <div className="flex items-center justify-between bg-muted rounded p-2">
                      <span className="text-sm flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-purple-500" /> Subclass
                      </span>
                      <Badge variant={subclassValid ? "default" : "destructive"}>
                        {selectedSubclass || "Not selected"}
                      </Badge>
                    </div>
                  )}

                  {/* Cantrips */}
                  {options.isCaster && options.newCantripsCount > 0 && (
                    <div className="bg-muted rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-1.5">
                          <Wand2 className="h-3.5 w-3.5 text-blue-500" /> New Cantrips
                        </span>
                        <Badge variant={cantripsValid ? "default" : "destructive"}>
                          {selectedCantrips.size}/{options.newCantripsCount}
                        </Badge>
                      </div>
                      {selectedCantrips.size > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.from(selectedCantrips).map((idx) => {
                            const c = options.availableCantrips.find(
                              (x) => x.index === idx
                            );
                            return (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {c?.name || idx}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spells */}
                  {options.isCaster && options.newSpellsKnownCount > 0 && !options.isPreparedCaster && (
                    <div className="bg-muted rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-indigo-500" /> New Spells
                        </span>
                        <Badge variant={spellsValid ? "default" : "destructive"}>
                          {selectedSpells.size}/{options.newSpellsKnownCount}
                        </Badge>
                      </div>
                      {selectedSpells.size > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Array.from(selectedSpells).map((idx) => {
                            const s = options.availableSpells.find(
                              (x) => x.index === idx
                            );
                            return (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {s?.name || idx}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ASI */}
                  {options.grantedASI && (
                    <div className="bg-muted rounded p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm flex items-center gap-1.5">
                          <Sword className="h-3.5 w-3.5 text-red-500" /> Ability Score Improvement
                        </span>
                        <Badge variant={asiValid ? "default" : "destructive"}>
                          {asiValid ? "Ready" : "Incomplete"}
                        </Badge>
                      </div>
                      {asiSelections.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {asiSelections.map((a) => (
                            <Badge key={a.ability} variant="secondary" className="text-xs">
                              {ABILITY_SHORT[a.ability]} +{a.increase}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Spell Slots */}
                  {options.isCaster && Object.keys(options.newSpellSlots).length > 0 && (
                    <div className="bg-muted rounded p-2">
                      <span className="text-sm flex items-center gap-1.5">
                        <Wand2 className="h-3.5 w-3.5" /> Updated Spell Slots
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(options.newSpellSlots).map(([lvl, count]) => (
                          <Badge key={lvl} variant="secondary" className="text-xs">
                            Lvl {lvl}: {count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {!allValid && (
                  <p className="text-sm text-destructive">
                    Please complete all required selections before confirming.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : null}

        <Separator />

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <Button
            variant="outline"
            onClick={canGoBack ? goBack : () => setOpen(false)}
            className="gap-1"
          >
            {canGoBack ? (
              <>
                <ChevronLeft className="h-4 w-4" /> Back
              </>
            ) : (
              "Cancel"
            )}
          </Button>

          {currentStep === "confirm" ? (
            <Button
              onClick={handleConfirm}
              disabled={!allValid || levelUpMutation.isPending}
              className="gap-2"
            >
              {levelUpMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Leveling Up...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Confirm Level Up to {targetLevel}
                </>
              )}
            </Button>
          ) : (
            <Button onClick={goNext} className="gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
