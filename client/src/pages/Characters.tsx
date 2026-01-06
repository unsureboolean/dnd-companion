import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import NavHeader from "@/components/NavHeader";
import { Link, useLocation } from "wouter";
import { Loader2, Plus, Sword, Heart, Shield, Bot, Sparkles, User } from "lucide-react";
import { calculateModifier } from "../../../shared/dnd5eData";

export default function Characters() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: characters, isLoading, refetch } = trpc.characters.list.useQuery(undefined, {
    enabled: !!user,
  });

  const toggleAiControl = trpc.characters.update.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("AI control updated");
    },
    onError: () => {
      toast.error("Failed to update AI control");
    },
  });

  const handleToggleAi = (e: React.MouseEvent, characterId: number, currentValue: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    toggleAiControl.mutate({
      id: characterId,
      isAiControlled: !currentValue,
    });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
        <NavHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-amber-600 animate-pulse mx-auto mb-4" />
            <p className="text-amber-800 dark:text-amber-200 font-serif">Loading your heroes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
        <NavHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card className="max-w-md border-2 border-amber-800/20">
            <CardHeader>
              <CardTitle className="font-serif text-amber-900 dark:text-amber-100">Authentication Required</CardTitle>
              <CardDescription>Please log in to view your characters</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50 dark:from-amber-950 dark:via-orange-950 dark:to-red-950">
      <NavHeader />
      
      <div className="container py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-2">
              Your Characters
            </h1>
            <p className="text-amber-700 dark:text-amber-300">Manage your roster of adventurers</p>
          </div>
          <Button 
            onClick={() => navigate("/characters/create")}
            className="bg-gradient-to-r from-amber-700 to-red-700 hover:from-amber-800 hover:to-red-800 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Character
          </Button>
        </div>

        {!characters || characters.length === 0 ? (
          <Card className="border-2 border-amber-800/20 bg-gradient-to-br from-white/80 to-amber-50/80 dark:from-amber-950/80 dark:to-orange-950/80">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4">
                <User className="h-10 w-10 text-amber-600" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-amber-900 dark:text-amber-100 mb-2">No characters yet</h3>
              <p className="text-amber-700 dark:text-amber-300 mb-6 text-center max-w-md">
                Create your first character to begin your adventure in the realms
              </p>
              <Button 
                onClick={() => navigate("/characters/create")}
                className="bg-gradient-to-r from-amber-700 to-red-700 hover:from-amber-800 hover:to-red-800 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Character
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((character: any) => {
              const strMod = calculateModifier(character.strength);
              const dexMod = calculateModifier(character.dexterity);
              const conMod = calculateModifier(character.constitution);
              const intMod = calculateModifier(character.intelligence);
              const wisMod = calculateModifier(character.wisdom);
              const chaMod = calculateModifier(character.charisma);

              return (
                <Link key={character.id} href={`/characters/${character.id}`}>
                  <Card className="cursor-pointer hover:shadow-xl transition-all h-full border-2 border-amber-800/20 bg-gradient-to-br from-white/90 to-amber-50/90 dark:from-amber-950/90 dark:to-orange-950/90 hover:border-amber-600/50">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-600 to-red-600 flex items-center justify-center text-white font-serif font-bold text-lg shadow">
                            {character.name.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-lg font-serif text-amber-900 dark:text-amber-100">
                              {character.name}
                            </CardTitle>
                            <CardDescription className="text-amber-700 dark:text-amber-300">
                              Level {character.level} {character.race} {character.characterClass}
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* HP and AC */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <Heart className="h-4 w-4 text-red-500" />
                              <span className="font-mono text-sm text-amber-900 dark:text-amber-100">
                                {character.currentHitPoints}/{character.maxHitPoints}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Shield className="h-4 w-4 text-blue-500" />
                              <span className="font-mono text-sm text-amber-900 dark:text-amber-100">
                                {character.armorClass}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Ability Scores */}
                        <div className="grid grid-cols-6 gap-1 pt-2 border-t border-amber-800/20">
                          {[
                            { label: "STR", mod: strMod },
                            { label: "DEX", mod: dexMod },
                            { label: "CON", mod: conMod },
                            { label: "INT", mod: intMod },
                            { label: "WIS", mod: wisMod },
                            { label: "CHA", mod: chaMod },
                          ].map(({ label, mod }) => (
                            <div key={label} className="text-center">
                              <div className="text-[10px] text-amber-600 dark:text-amber-400">{label}</div>
                              <div className="font-mono font-semibold text-sm text-amber-900 dark:text-amber-100">
                                {mod >= 0 ? '+' : ''}{mod}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* AI Control Toggle */}
                        <div className="flex items-center justify-between pt-2 border-t border-amber-800/20">
                          <div className="flex items-center gap-2">
                            <Bot className={`h-4 w-4 ${character.isAiControlled ? 'text-purple-600' : 'text-amber-400'}`} />
                            <span className="text-xs text-amber-700 dark:text-amber-300">AI Control</span>
                          </div>
                          <Switch
                            checked={character.isAiControlled}
                            onCheckedChange={() => {}}
                            onClick={(e) => handleToggleAi(e, character.id, character.isAiControlled)}
                            disabled={toggleAiControl.isPending}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
