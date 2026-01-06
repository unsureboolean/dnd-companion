import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { 
  RACES, 
  CLASSES, 
  BACKGROUNDS, 
  ALIGNMENTS, 
  STANDARD_ARRAY,
  calculateModifier,
  type AbilityScore,
  ABILITY_SCORES,
  type Skill,
} from "../../../shared/dnd5eData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";

interface CharacterData {
  name: string;
  race: string;
  characterClass: string;
  background: string;
  alignment: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  personality: string;
  backstory: string;
  ideals: string;
  bonds: string;
  flaws: string;
  selectedSkills: Set<string>;
}

export default function CharacterCreate() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [character, setCharacter] = useState<CharacterData>({
    name: "",
    race: "",
    characterClass: "",
    background: "",
    alignment: "",
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    personality: "",
    backstory: "",
    ideals: "",
    bonds: "",
    flaws: "",
    selectedSkills: new Set(),
  });

  const [abilityScores, setAbilityScores] = useState<number[]>([...STANDARD_ARRAY]);
  const [assignedScores, setAssignedScores] = useState<Partial<Record<AbilityScore, number>>>({});

  const createCharacterMutation = trpc.characters.create.useMutation({
    onSuccess: () => {
      toast.success("Character created successfully!");
      navigate("/characters");
    },
    onError: (error) => {
      toast.error(`Failed to create character: ${error.message}`);
    },
  });

  const selectedClass = CLASSES.find(c => c.name === character.characterClass);
  const selectedBackground = BACKGROUNDS.find(b => b.name === character.background);
  const selectedRace = RACES.find(r => r.name === character.race);

  const handleAssignScore = (ability: AbilityScore, score: number) => {
    const newAssigned = { ...assignedScores };
    
    // Remove old assignment if exists
    const oldScore = assignedScores[ability];
    if (oldScore !== undefined) {
      setAbilityScores(prev => [...prev, oldScore].sort((a, b) => b - a));
    }
    
    // Assign new score
    newAssigned[ability] = score;
    setAssignedScores(newAssigned);
    setAbilityScores(prev => prev.filter(s => s !== score));
    
    // Update character
    setCharacter(prev => ({ ...prev, [ability]: score }));
  };

  const applyRacialBonuses = () => {
    if (!selectedRace) return;
    
    const finalScores: Partial<Record<AbilityScore, number>> = {};
    ABILITY_SCORES.forEach(ability => {
      const base = assignedScores[ability] || 10;
      const bonus = selectedRace.abilityBonuses[ability] || 0;
      finalScores[ability] = base + bonus;
    });
    
    return finalScores;
  };

  const toggleSkill = (skill: string) => {
    const newSkills = new Set(character.selectedSkills);
    if (newSkills.has(skill)) {
      newSkills.delete(skill);
    } else {
      if (selectedClass && newSkills.size >= selectedClass.skillChoices) {
        toast.error(`You can only select ${selectedClass.skillChoices} skills for ${selectedClass.name}`);
        return;
      }
      newSkills.add(skill);
    }
    setCharacter(prev => ({ ...prev, selectedSkills: newSkills }));
  };

  const handleSubmit = () => {
    const finalScores = applyRacialBonuses();
    if (!finalScores || !finalScores.strength) {
      toast.error("Please assign all ability scores");
      return;
    }

    const hitDie = selectedClass?.hitDie || 8;
    const conMod = calculateModifier(finalScores.constitution || 10);
    const maxHp = hitDie + conMod;

    const skills: Record<string, boolean> = {};
    character.selectedSkills.forEach(skill => {
      skills[skill] = true;
    });

    // Add background skill proficiencies
    selectedBackground?.skillProficiencies.forEach(skill => {
      skills[skill] = true;
    });

    const savingThrows: Record<string, boolean> = {};
    selectedClass?.savingThrows.forEach(save => {
      savingThrows[save] = true;
    });

    createCharacterMutation.mutate({
      name: character.name,
      race: character.race,
      characterClass: character.characterClass,
      background: character.background,
      alignment: character.alignment,
      strength: finalScores.strength || 10,
      dexterity: finalScores.dexterity || 10,
      constitution: finalScores.constitution || 10,
      intelligence: finalScores.intelligence || 10,
      wisdom: finalScores.wisdom || 10,
      charisma: finalScores.charisma || 10,
      personality: character.personality,
      backstory: character.backstory,
      ideals: character.ideals,
      bonds: character.bonds,
      flaws: character.flaws,
      skills,
      savingThrows,
      equipment: [...(selectedClass?.startingEquipment || []), ...(selectedBackground?.equipment || [])],
      spells: [],
      features: selectedRace?.features || [],
      maxHitPoints: maxHp,
      currentHitPoints: maxHp,
      armorClass: 10 + calculateModifier(finalScores.dexterity || 10),
      level: 1,
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return character.name && character.race && character.characterClass && character.background;
      case 2:
        return Object.keys(assignedScores).length === 6;
      case 3:
        return selectedClass ? character.selectedSkills.size === selectedClass.skillChoices : false;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Create Your Character</h1>
          <p className="text-muted-foreground">Step {step} of 4</p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Choose your character's race, class, and background</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Character Name</Label>
                <Input
                  id="name"
                  value={character.name}
                  onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter character name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="race">Race</Label>
                <Select value={character.race} onValueChange={(value) => setCharacter(prev => ({ ...prev, race: value }))}>
                  <SelectTrigger id="race">
                    <SelectValue placeholder="Select a race" />
                  </SelectTrigger>
                  <SelectContent>
                    {RACES.map(race => (
                      <SelectItem key={race.name} value={race.name}>{race.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRace && (
                  <p className="text-sm text-muted-foreground">{selectedRace.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select value={character.characterClass} onValueChange={(value) => setCharacter(prev => ({ ...prev, characterClass: value }))}>
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSES.map(cls => (
                      <SelectItem key={cls.name} value={cls.name}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClass && (
                  <p className="text-sm text-muted-foreground">{selectedClass.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="background">Background</Label>
                <Select value={character.background} onValueChange={(value) => setCharacter(prev => ({ ...prev, background: value }))}>
                  <SelectTrigger id="background">
                    <SelectValue placeholder="Select a background" />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKGROUNDS.map(bg => (
                      <SelectItem key={bg.name} value={bg.name}>{bg.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBackground && (
                  <p className="text-sm text-muted-foreground">{selectedBackground.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="alignment">Alignment</Label>
                <Select value={character.alignment} onValueChange={(value) => setCharacter(prev => ({ ...prev, alignment: value }))}>
                  <SelectTrigger id="alignment">
                    <SelectValue placeholder="Select alignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIGNMENTS.map(align => (
                      <SelectItem key={align} value={align}>{align}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Ability Scores</CardTitle>
              <CardDescription>Assign the standard array to your abilities: {STANDARD_ARRAY.join(", ")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                {ABILITY_SCORES.map(ability => {
                  const assigned = assignedScores[ability];
                  const racial = selectedRace?.abilityBonuses[ability] || 0;
                  const total = (assigned || 0) + racial;
                  
                  return (
                    <div key={ability} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <Label className="text-base capitalize">{ability}</Label>
                        {assigned !== undefined && (
                          <p className="text-sm text-muted-foreground">
                            Base: {assigned} {racial > 0 && `+ ${racial} (racial)`} = {total} (modifier: {calculateModifier(total) >= 0 ? '+' : ''}{calculateModifier(total)})
                          </p>
                        )}
                      </div>
                      <Select
                        value={assigned?.toString() || ""}
                        onValueChange={(value) => handleAssignScore(ability, parseInt(value))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {abilityScores.map(score => (
                            <SelectItem key={score} value={score.toString()}>{score}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
              <CardDescription>
                Select {selectedClass?.skillChoices} skill proficiencies for your {selectedClass?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {selectedClass?.availableSkills.map(skill => (
                  <div key={skill} className="flex items-center space-x-2">
                    <Checkbox
                      id={skill}
                      checked={character.selectedSkills.has(skill)}
                      onCheckedChange={() => toggleSkill(skill)}
                    />
                    <Label htmlFor={skill} className="capitalize cursor-pointer">
                      {skill.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedBackground && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Background Skills (automatically added):</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {selectedBackground.skillProficiencies.map(s => s.replace(/([A-Z])/g, ' $1').trim()).join(", ")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Personality & Backstory</CardTitle>
              <CardDescription>Define your character's personality for better AI roleplay</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="personality">Personality Traits</Label>
                <Textarea
                  id="personality"
                  value={character.personality}
                  onChange={(e) => setCharacter(prev => ({ ...prev, personality: e.target.value }))}
                  placeholder="Describe your character's personality..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backstory">Backstory</Label>
                <Textarea
                  id="backstory"
                  value={character.backstory}
                  onChange={(e) => setCharacter(prev => ({ ...prev, backstory: e.target.value }))}
                  placeholder="Tell your character's story..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ideals">Ideals</Label>
                <Textarea
                  id="ideals"
                  value={character.ideals}
                  onChange={(e) => setCharacter(prev => ({ ...prev, ideals: e.target.value }))}
                  placeholder="What does your character believe in?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bonds">Bonds</Label>
                <Textarea
                  id="bonds"
                  value={character.bonds}
                  onChange={(e) => setCharacter(prev => ({ ...prev, bonds: e.target.value }))}
                  placeholder="What ties your character to the world?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flaws">Flaws</Label>
                <Textarea
                  id="flaws"
                  value={character.flaws}
                  onChange={(e) => setCharacter(prev => ({ ...prev, flaws: e.target.value }))}
                  placeholder="What are your character's weaknesses?"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step > 1 ? setStep(step - 1) : navigate("/")}
          >
            {step === 1 ? "Cancel" : "Previous"}
          </Button>
          
          {step < 4 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createCharacterMutation.isPending}
            >
              {createCharacterMutation.isPending ? "Creating..." : "Create Character"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
