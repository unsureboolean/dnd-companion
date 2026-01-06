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
import NavHeader from "@/components/NavHeader";
import { 
  RACES, 
  CLASSES, 
  BACKGROUNDS, 
  ALIGNMENTS, 
  STANDARD_ARRAY,
  calculateModifier,
  type AbilityScore,
  ABILITY_SCORES,
} from "../../../shared/dnd5eData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles, Wand2, RefreshCw, User, Dices, BookOpen, Scroll } from "lucide-react";
import { Streamdown } from "streamdown";

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

interface GeneratedCharacter {
  name: string;
  race: string;
  characterClass: string;
  background: string;
  alignment: string;
  level: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  maxHitPoints: number;
  currentHitPoints: number;
  armorClass: number;
  skills: Record<string, boolean>;
  equipment: string[];
  personality: string;
  backstory: string;
  ideals: string;
  bonds: string;
  flaws: string;
  raceFeatures: string[];
  classFeatures: string[];
}

export default function CharacterCreate() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<"manual" | "quick">("quick");
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

  // Quick generate state
  const [quickName, setQuickName] = useState("");
  const [quickRace, setQuickRace] = useState("");
  const [quickClass, setQuickClass] = useState("");
  const [quickBackground, setQuickBackground] = useState("");
  const [quickAlignment, setQuickAlignment] = useState("");
  const [generatedCharacter, setGeneratedCharacter] = useState<GeneratedCharacter | null>(null);

  const [abilityScores, setAbilityScores] = useState<number[]>([...STANDARD_ARRAY]);
  const [assignedScores, setAssignedScores] = useState<Partial<Record<AbilityScore, number>>>({});

  const generateCharacterMutation = trpc.characterGenerator.generateCharacter.useMutation({
    onSuccess: (data) => {
      setGeneratedCharacter(data);
      toast.success("Character generated! Review and save when ready.");
    },
    onError: (error) => {
      toast.error(`Failed to generate character: ${error.message}`);
    },
  });

  const generateBackstoryMutation = trpc.characterGenerator.generateBackstory.useMutation({
    onSuccess: (data) => {
      if (generatedCharacter) {
        setGeneratedCharacter({
          ...generatedCharacter,
          personality: data.personality,
          backstory: data.backstory,
          ideals: data.ideals,
          bonds: data.bonds,
          flaws: data.flaws,
        });
        toast.success("Backstory regenerated!");
      }
    },
    onError: (error) => {
      toast.error(`Failed to regenerate backstory: ${error.message}`);
    },
  });

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
    
    const oldScore = assignedScores[ability];
    if (oldScore !== undefined) {
      setAbilityScores(prev => [...prev, oldScore].sort((a, b) => b - a));
    }
    
    newAssigned[ability] = score;
    setAssignedScores(newAssigned);
    setAbilityScores(prev => prev.filter(s => s !== score));
    
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

  const handleQuickGenerate = () => {
    generateCharacterMutation.mutate({
      name: quickName || undefined,
      race: quickRace || undefined,
      characterClass: quickClass || undefined,
      background: quickBackground || undefined,
      alignment: quickAlignment || undefined,
      generateBackstory: true,
    });
  };

  const handleRegenerateBackstory = () => {
    if (!generatedCharacter) return;
    generateBackstoryMutation.mutate({
      name: generatedCharacter.name,
      race: generatedCharacter.race,
      characterClass: generatedCharacter.characterClass,
      background: generatedCharacter.background,
      alignment: generatedCharacter.alignment,
      existingBackstory: generatedCharacter.backstory,
      personality: generatedCharacter.personality,
    });
  };

  const handleSaveGeneratedCharacter = () => {
    if (!generatedCharacter) return;
    
    createCharacterMutation.mutate({
      name: generatedCharacter.name,
      race: generatedCharacter.race,
      characterClass: generatedCharacter.characterClass,
      background: generatedCharacter.background,
      alignment: generatedCharacter.alignment,
      strength: generatedCharacter.strength,
      dexterity: generatedCharacter.dexterity,
      constitution: generatedCharacter.constitution,
      intelligence: generatedCharacter.intelligence,
      wisdom: generatedCharacter.wisdom,
      charisma: generatedCharacter.charisma,
      personality: generatedCharacter.personality,
      backstory: generatedCharacter.backstory,
      ideals: generatedCharacter.ideals,
      bonds: generatedCharacter.bonds,
      flaws: generatedCharacter.flaws,
      skills: generatedCharacter.skills,
      savingThrows: {},
      equipment: generatedCharacter.equipment,
      spells: [],
      features: [...generatedCharacter.raceFeatures, ...generatedCharacter.classFeatures],
      maxHitPoints: generatedCharacter.maxHitPoints,
      currentHitPoints: generatedCharacter.currentHitPoints,
      armorClass: generatedCharacter.armorClass,
      level: 1,
    });
  };

  const handleManualSubmit = () => {
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50 dark:from-amber-950 dark:via-orange-950 dark:to-red-950">
      <NavHeader />
      <div className="container max-w-4xl py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-2">Create Your Character</h1>
          <p className="text-amber-700 dark:text-amber-300">Forge a new hero for your adventures</p>
        </div>

        {/* Mode Selection */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "manual" | "quick")} className="mb-6">
          <TabsList className="grid w-full grid-cols-2 bg-amber-100/50 dark:bg-amber-900/50">
            <TabsTrigger value="quick" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
              <Wand2 className="h-4 w-4 mr-2" />
              Quick Generate
            </TabsTrigger>
            <TabsTrigger value="manual" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">
              <User className="h-4 w-4 mr-2" />
              Manual Creation
            </TabsTrigger>
          </TabsList>

          {/* Quick Generate Mode */}
          <TabsContent value="quick" className="space-y-6 mt-6">
            <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <Sparkles className="h-5 w-5 text-amber-600" />
                  AI Character Generator
                </CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  Fill in as much or as little as you want. The AI will generate the rest, including a unique backstory!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quick-name">Character Name (optional)</Label>
                    <Input
                      id="quick-name"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      placeholder="Leave blank for random name"
                      className="bg-white dark:bg-amber-950"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-race">Race (optional)</Label>
                    <Select value={quickRace} onValueChange={setQuickRace}>
                      <SelectTrigger id="quick-race" className="bg-white dark:bg-amber-950">
                        <SelectValue placeholder="Any race" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any race</SelectItem>
                        {RACES.map(race => (
                          <SelectItem key={race.name} value={race.name}>{race.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-class">Class (optional)</Label>
                    <Select value={quickClass} onValueChange={setQuickClass}>
                      <SelectTrigger id="quick-class" className="bg-white dark:bg-amber-950">
                        <SelectValue placeholder="Any class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any class</SelectItem>
                        {CLASSES.map(cls => (
                          <SelectItem key={cls.name} value={cls.name}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quick-background">Background (optional)</Label>
                    <Select value={quickBackground} onValueChange={setQuickBackground}>
                      <SelectTrigger id="quick-background" className="bg-white dark:bg-amber-950">
                        <SelectValue placeholder="Any background" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any background</SelectItem>
                        {BACKGROUNDS.map(bg => (
                          <SelectItem key={bg.name} value={bg.name}>{bg.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="quick-alignment">Alignment (optional)</Label>
                    <Select value={quickAlignment} onValueChange={setQuickAlignment}>
                      <SelectTrigger id="quick-alignment" className="bg-white dark:bg-amber-950">
                        <SelectValue placeholder="Any alignment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any alignment</SelectItem>
                        {ALIGNMENTS.map(align => (
                          <SelectItem key={align} value={align}>{align}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  onClick={handleQuickGenerate}
                  disabled={generateCharacterMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                  size="lg"
                >
                  {generateCharacterMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Generating Character...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Character
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Character Preview */}
            {generatedCharacter && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900">
                  <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
                    <Scroll className="h-5 w-5" />
                    {generatedCharacter.name}
                  </CardTitle>
                  <CardDescription className="text-amber-700 dark:text-amber-300">
                    Level {generatedCharacter.level} {generatedCharacter.race} {generatedCharacter.characterClass} • {generatedCharacter.background} • {generatedCharacter.alignment}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {[
                      { name: "STR", value: generatedCharacter.strength },
                      { name: "DEX", value: generatedCharacter.dexterity },
                      { name: "CON", value: generatedCharacter.constitution },
                      { name: "INT", value: generatedCharacter.intelligence },
                      { name: "WIS", value: generatedCharacter.wisdom },
                      { name: "CHA", value: generatedCharacter.charisma },
                    ].map(stat => (
                      <div key={stat.name} className="text-center p-3 bg-amber-50 dark:bg-amber-900/50 rounded-lg border border-amber-200 dark:border-amber-700">
                        <div className="text-xs font-medium text-amber-600 dark:text-amber-400">{stat.name}</div>
                        <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{stat.value}</div>
                        <div className="text-sm text-amber-700 dark:text-amber-300">
                          {calculateModifier(stat.value) >= 0 ? "+" : ""}{calculateModifier(stat.value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Combat Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="text-xs font-medium text-red-600 dark:text-red-400">HP</div>
                      <div className="text-2xl font-bold text-red-700 dark:text-red-300">{generatedCharacter.maxHitPoints}</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">AC</div>
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{generatedCharacter.armorClass}</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-xs font-medium text-green-600 dark:text-green-400">Skills</div>
                      <div className="text-2xl font-bold text-green-700 dark:text-green-300">{Object.keys(generatedCharacter.skills).length}</div>
                    </div>
                  </div>

                  {/* Personality */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2">
                        <BookOpen className="h-5 w-5" />
                        Character Details
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerateBackstory}
                        disabled={generateBackstoryMutation.isPending}
                        className="border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        {generateBackstoryMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-1" />
                            Regenerate
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Personality</h4>
                        <p className="text-amber-700 dark:text-amber-300 text-sm">{generatedCharacter.personality}</p>
                      </div>

                      <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                        <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">Backstory</h4>
                        <div className="text-amber-700 dark:text-amber-300 text-sm prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{generatedCharacter.backstory}</Streamdown>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1 text-sm">Ideals</h4>
                          <p className="text-amber-700 dark:text-amber-300 text-xs">{generatedCharacter.ideals}</p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1 text-sm">Bonds</h4>
                          <p className="text-amber-700 dark:text-amber-300 text-xs">{generatedCharacter.bonds}</p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1 text-sm">Flaws</h4>
                          <p className="text-amber-700 dark:text-amber-300 text-xs">{generatedCharacter.flaws}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Equipment */}
                  <div>
                    <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-3">Equipment</h3>
                    <div className="flex flex-wrap gap-2">
                      {generatedCharacter.equipment.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-amber-100 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-sm">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setGeneratedCharacter(null)}
                      className="flex-1 border-amber-300"
                    >
                      Start Over
                    </Button>
                    <Button
                      onClick={handleSaveGeneratedCharacter}
                      disabled={createCharacterMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      {createCharacterMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save Character"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Manual Creation Mode */}
          <TabsContent value="manual" className="space-y-6 mt-6">
            <div className="mb-4">
              <p className="text-amber-700 dark:text-amber-300">Step {step} of 4</p>
            </div>

            {step === 1 && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="text-amber-900 dark:text-amber-100">Basic Information</CardTitle>
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
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="text-amber-900 dark:text-amber-100">Ability Scores</CardTitle>
                  <CardDescription>Assign the standard array to your abilities: {STANDARD_ARRAY.join(", ")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">Available scores:</span>
                    {abilityScores.map((score, idx) => (
                      <span key={idx} className="px-3 py-1 bg-amber-100 dark:bg-amber-800 rounded-full text-sm font-medium">
                        {score}
                      </span>
                    ))}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {ABILITY_SCORES.map(ability => (
                      <div key={ability} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="font-medium capitalize">{ability}</div>
                          {selectedRace?.abilityBonuses[ability] && (
                            <div className="text-xs text-green-600">+{selectedRace.abilityBonuses[ability]} racial bonus</div>
                          )}
                        </div>
                        <Select
                          value={assignedScores[ability]?.toString() || ""}
                          onValueChange={(value) => handleAssignScore(ability, parseInt(value))}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue placeholder="--" />
                          </SelectTrigger>
                          <SelectContent>
                            {assignedScores[ability] && (
                              <SelectItem value={assignedScores[ability]!.toString()}>
                                {assignedScores[ability]}
                              </SelectItem>
                            )}
                            {abilityScores.map(score => (
                              <SelectItem key={score} value={score.toString()}>{score}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {step === 3 && selectedClass && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="text-amber-900 dark:text-amber-100">Skills</CardTitle>
                  <CardDescription>
                    Choose {selectedClass.skillChoices} skills from your class list.
                    Background skills ({selectedBackground?.skillProficiencies.join(", ")}) are automatically added.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-3">
                    {selectedClass.availableSkills.map(skill => {
                      const isBackgroundSkill = selectedBackground?.skillProficiencies.includes(skill);
                      return (
                        <div
                          key={skill}
                          className={`flex items-center space-x-2 p-3 border rounded-lg ${
                            isBackgroundSkill ? "bg-green-50 dark:bg-green-900/20 border-green-200" : ""
                          }`}
                        >
                          <Checkbox
                            id={skill}
                            checked={character.selectedSkills.has(skill) || isBackgroundSkill}
                            onCheckedChange={() => !isBackgroundSkill && toggleSkill(skill)}
                            disabled={isBackgroundSkill}
                          />
                          <Label htmlFor={skill} className="capitalize cursor-pointer">
                            {skill.replace(/([A-Z])/g, " $1").trim()}
                            {isBackgroundSkill && <span className="text-xs text-green-600 ml-2">(Background)</span>}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Selected: {character.selectedSkills.size} / {selectedClass.skillChoices}
                  </p>
                </CardContent>
              </Card>
            )}

            {step === 4 && (
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="text-amber-900 dark:text-amber-100">Personality & Backstory</CardTitle>
                  <CardDescription>Define who your character is</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="personality">Personality Traits</Label>
                    <Textarea
                      id="personality"
                      value={character.personality}
                      onChange={(e) => setCharacter(prev => ({ ...prev, personality: e.target.value }))}
                      placeholder="Describe your character's personality..."
                      rows={2}
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
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ideals">Ideals</Label>
                      <Textarea
                        id="ideals"
                        value={character.ideals}
                        onChange={(e) => setCharacter(prev => ({ ...prev, ideals: e.target.value }))}
                        placeholder="What do you believe in?"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bonds">Bonds</Label>
                      <Textarea
                        id="bonds"
                        value={character.bonds}
                        onChange={(e) => setCharacter(prev => ({ ...prev, bonds: e.target.value }))}
                        placeholder="What connects you to the world?"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="flaws">Flaws</Label>
                      <Textarea
                        id="flaws"
                        value={character.flaws}
                        onChange={(e) => setCharacter(prev => ({ ...prev, flaws: e.target.value }))}
                        placeholder="What are your weaknesses?"
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="border-amber-300"
              >
                Previous
              </Button>
              {step < 4 ? (
                <Button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canProceed()}
                  className="bg-amber-700 hover:bg-amber-800 text-white"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleManualSubmit}
                  disabled={createCharacterMutation.isPending}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  {createCharacterMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Create Character"
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
