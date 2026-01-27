import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import NavHeader from "@/components/NavHeader";
import { useLocation, useParams } from "wouter";
import { Loader2, Heart, Shield, Sword, Edit2, Save, X, Sparkles, ArrowLeft, Bot, Wand2, RefreshCw, ImagePlus, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { calculateModifier, calculateProficiencyBonus, SKILL_ABILITY_MAP } from "../../../shared/dnd5eData";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LevelUpDialog } from "@/components/LevelUpDialog";

export default function CharacterSheet() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [editMode, setEditMode] = useState(false);
  const [editedHp, setEditedHp] = useState<number | null>(null);
  const [editedPersonality, setEditedPersonality] = useState("");
  const [editedBackstory, setEditedBackstory] = useState("");

  const utils = trpc.useUtils();
  const { data: character, isLoading } = trpc.characters.get.useQuery(
    { id: parseInt(id || "0") },
    { enabled: !!user && !!id }
  );

  const { data: campaigns } = trpc.campaigns.list.useQuery(undefined, {
    enabled: !!user,
  });

  const updateMutation = trpc.characters.update.useMutation({
    onSuccess: () => {
      toast.success("Character updated!");
      utils.characters.get.invalidate({ id: parseInt(id || "0") });
      setEditMode(false);
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const toggleAiMutation = trpc.multiCharacter.toggleAiControl.useMutation({
    onSuccess: () => {
      toast.success("AI control updated");
      utils.characters.get.invalidate({ id: parseInt(id || "0") });
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const assignCampaignMutation = trpc.multiCharacter.assignToCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign assignment updated");
      utils.characters.get.invalidate({ id: parseInt(id || "0") });
    },
    onError: (error) => {
      toast.error(`Failed to assign: ${error.message}`);
    },
  });

  const deleteMutation = trpc.characters.delete.useMutation({
    onSuccess: () => {
      toast.success("Character deleted");
      navigate("/characters");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const generatePortraitMutation = trpc.characterGenerator.generatePortrait.useMutation({
    onSuccess: () => {
      toast.success("Portrait generated!");
      utils.characters.get.invalidate({ id: parseInt(id || "0") });
    },
    onError: (error) => {
      toast.error(`Failed to generate portrait: ${error.message}`);
    },
  });

  const generateBackstoryMutation = trpc.characterGenerator.generateBackstory.useMutation({
    onSuccess: (data) => {
      // Update character with new backstory
      updateMutation.mutate({
        id: character!.id,
        personality: data.personality,
        backstory: data.backstory,
        ideals: data.ideals,
        bonds: data.bonds,
        flaws: data.flaws,
      });
      toast.success("Backstory generated!");
    },
    onError: (error) => {
      toast.error(`Failed to generate backstory: ${error.message}`);
    },
  });

  const handleGenerateBackstory = () => {
    if (!character) return;
    generateBackstoryMutation.mutate({
      name: character.name,
      race: character.race,
      characterClass: character.characterClass,
      background: character.background,
      alignment: character.alignment || "True Neutral",
      existingBackstory: character.backstory || undefined,
      personality: character.personality || undefined,
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
        <NavHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-amber-600 animate-pulse mx-auto mb-4" />
            <p className="text-amber-800 dark:text-amber-200 font-serif">Loading character...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !character) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
        <NavHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card className="max-w-md border-2 border-amber-800/20">
            <CardHeader>
              <CardTitle className="font-serif text-amber-900 dark:text-amber-100">Character Not Found</CardTitle>
              <CardDescription>This character does not exist or you don't have access</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/characters")} className="bg-amber-700 hover:bg-amber-800">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Characters
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const profBonus = calculateProficiencyBonus(character.level);
  const skills = (character.skills as Record<string, boolean>) || {};

  const abilityScores = {
    strength: character.strength,
    dexterity: character.dexterity,
    constitution: character.constitution,
    intelligence: character.intelligence,
    wisdom: character.wisdom,
    charisma: character.charisma,
  };

  const modifiers = {
    strength: calculateModifier(character.strength),
    dexterity: calculateModifier(character.dexterity),
    constitution: calculateModifier(character.constitution),
    intelligence: calculateModifier(character.intelligence),
    wisdom: calculateModifier(character.wisdom),
    charisma: calculateModifier(character.charisma),
  };

  const handleSaveEdits = () => {
    updateMutation.mutate({
      id: character.id,
      currentHitPoints: editedHp ?? character.currentHitPoints,
      personality: editedPersonality || character.personality || undefined,
      backstory: editedBackstory || character.backstory || undefined,
    });
  };

  const handleStartEdit = () => {
    setEditMode(true);
    setEditedHp(character.currentHitPoints);
    setEditedPersonality(character.personality || "");
    setEditedBackstory(character.backstory || "");
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditedHp(null);
    setEditedPersonality("");
    setEditedBackstory("");
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${character.name}?`)) {
      deleteMutation.mutate({ id: character.id });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50 dark:from-amber-950 dark:via-orange-950 dark:to-red-950">
      <NavHeader />
      <div className="container max-w-6xl py-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex gap-6">
            {/* Portrait Section */}
            <div className="relative group">
              {character.portraitUrl ? (
                <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-amber-600 shadow-lg">
                  <img
                    src={character.portraitUrl}
                    alt={`${character.name} portrait`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-32 h-32 rounded-lg border-2 border-dashed border-amber-400 bg-amber-100/50 dark:bg-amber-900/50 flex items-center justify-center">
                  <User className="h-12 w-12 text-amber-400" />
                </div>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => generatePortraitMutation.mutate({ characterId: character.id })}
                disabled={generatePortraitMutation.isPending}
              >
                {generatePortraitMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImagePlus className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold text-foreground">{character.name}</h1>
                {character.isAiControlled && (
                  <Badge variant="secondary">AI Controlled</Badge>
                )}
              </div>
              <p className="text-lg text-muted-foreground">
                Level {character.level} {character.race} {character.characterClass}
              </p>
              <p className="text-sm text-muted-foreground">{character.background} • {character.alignment}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editMode ? (
              <>
                {character.level < 20 && (
                  <LevelUpDialog
                    characterId={character.id}
                    currentLevel={character.level}
                    onLevelUp={() => utils.characters.get.invalidate({ id: parseInt(id || "0") })}
                  />
                )}
                <Button variant="outline" onClick={handleStartEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCancelEdit}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSaveEdits} disabled={updateMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </>
            )}
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Character Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="ai-control">AI Controlled</Label>
                <p className="text-sm text-muted-foreground">Allow AI to roleplay this character</p>
              </div>
              <Switch
                id="ai-control"
                checked={character.isAiControlled}
                onCheckedChange={(checked) => toggleAiMutation.mutate({ characterId: character.id, isAiControlled: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-assignment">Assigned Campaign</Label>
              <Select
                value={character.campaignId?.toString() || "none"}
                onValueChange={(value) => assignCampaignMutation.mutate({ characterId: character.id, campaignId: value === "none" ? null : parseInt(value) })}
              >
                <SelectTrigger id="campaign-assignment">
                  <SelectValue placeholder="No campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No campaign</SelectItem>
                  {campaigns?.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id.toString()}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4 text-destructive" />
                Hit Points
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editMode ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editedHp ?? character.currentHitPoints}
                    onChange={(e) => setEditedHp(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">/ {character.maxHitPoints}</span>
                </div>
              ) : (
                <div className="text-3xl font-bold">
                  {character.currentHitPoints} <span className="text-xl text-muted-foreground">/ {character.maxHitPoints}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Armor Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{character.armorClass}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sword className="h-4 w-4 text-accent" />
                Proficiency Bonus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">+{profBonus}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="stats" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="stats">Stats & Skills</TabsTrigger>
            <TabsTrigger value="personality">Personality</TabsTrigger>
            <TabsTrigger value="equipment">Equipment</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="stats" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Ability Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {Object.entries(abilityScores).map(([ability, score]) => {
                    const mod = modifiers[ability as keyof typeof modifiers];
                    return (
                      <div key={ability} className="text-center p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground uppercase mb-1">{ability.slice(0, 3)}</div>
                        <div className="text-3xl font-bold mb-1">{mod >= 0 ? '+' : ''}{mod}</div>
                        <div className="text-sm text-muted-foreground">({score})</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
                <CardDescription>Proficient skills include your proficiency bonus</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(SKILL_ABILITY_MAP).map(([skill, ability]) => {
                    const isProficient = skills[skill] || false;
                    const abilityMod = modifiers[ability];
                    const skillBonus = abilityMod + (isProficient ? profBonus : 0);
                    
                    return (
                      <div key={skill} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isProficient ? 'bg-primary' : 'bg-muted'}`} />
                          <span className="capitalize">{skill.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-xs text-muted-foreground">({ability.slice(0, 3).toUpperCase()})</span>
                        </div>
                        <span className="font-semibold">{skillBonus >= 0 ? '+' : ''}{skillBonus}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="personality" className="space-y-6">
            {/* AI Backstory Generation */}
            <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                  <Wand2 className="h-5 w-5 text-amber-600" />
                  AI Backstory Generator
                </CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  {character.backstory 
                    ? "Expand and enrich your character's existing backstory with AI" 
                    : "Generate a rich, detailed backstory for your character"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleGenerateBackstory}
                  disabled={generateBackstoryMutation.isPending}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
                >
                  {generateBackstoryMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : character.backstory ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Expand Backstory
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Backstory
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Personality Traits</CardTitle>
                <CardDescription>Used by AI to roleplay this character</CardDescription>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <Textarea
                    value={editedPersonality}
                    onChange={(e) => setEditedPersonality(e.target.value)}
                    rows={4}
                    placeholder="Describe personality traits..."
                  />
                ) : (
                  <p className="text-foreground whitespace-pre-wrap">{character.personality || "No personality defined yet"}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backstory</CardTitle>
              </CardHeader>
              <CardContent>
                {editMode ? (
                  <Textarea
                    value={editedBackstory}
                    onChange={(e) => setEditedBackstory(e.target.value)}
                    rows={6}
                    placeholder="Tell your character's story..."
                  />
                ) : (
                  <p className="text-foreground whitespace-pre-wrap">{character.backstory || "No backstory written yet"}</p>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ideals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{character.ideals || "None"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Bonds</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{character.bonds || "None"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Flaws</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{character.flaws || "None"}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="equipment">
            <Card>
              <CardHeader>
                <CardTitle>Equipment & Inventory</CardTitle>
              </CardHeader>
              <CardContent>
                {character.equipment && (character.equipment as string[]).length > 0 ? (
                  <ul className="space-y-2">
                    {(character.equipment as string[]).map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No equipment listed</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle>Features & Traits</CardTitle>
                <CardDescription>Racial and class features</CardDescription>
              </CardHeader>
              <CardContent>
                {character.features && (character.features as string[]).length > 0 ? (
                  <ul className="space-y-2">
                    {(character.features as string[]).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-accent" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No features listed</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
