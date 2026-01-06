import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { Loader2, Plus, Sword, Heart, Shield } from "lucide-react";
import { calculateModifier } from "../../../shared/dnd5eData";

export default function Characters() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { data: characters, isLoading } = trpc.characters.list.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view your characters</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Your Characters</h1>
            <p className="text-muted-foreground">Manage your adventurers</p>
          </div>
          <Button onClick={() => navigate("/characters/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Character
          </Button>
        </div>

        {!characters || characters.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Sword className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No characters yet</h3>
              <p className="text-muted-foreground mb-6">Create your first character to begin your adventure</p>
              <Button onClick={() => navigate("/characters/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Character
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {characters.map(character => {
              const strMod = calculateModifier(character.strength);
              const dexMod = calculateModifier(character.dexterity);
              const conMod = calculateModifier(character.constitution);
              const intMod = calculateModifier(character.intelligence);
              const wisMod = calculateModifier(character.wisdom);
              const chaMod = calculateModifier(character.charisma);

              return (
                <Link key={character.id} href={`/characters/${character.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{character.name}</CardTitle>
                          <CardDescription>
                            Level {character.level} {character.race} {character.characterClass}
                          </CardDescription>
                        </div>
                        {character.isAiControlled && (
                          <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded">
                            AI
                          </span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Heart className="h-4 w-4 text-destructive" />
                            <span className="font-medium">HP</span>
                          </div>
                          <span>{character.currentHitPoints}/{character.maxHitPoints}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            <span className="font-medium">AC</span>
                          </div>
                          <span>{character.armorClass}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">STR</div>
                            <div className="font-semibold">{strMod >= 0 ? '+' : ''}{strMod}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">DEX</div>
                            <div className="font-semibold">{dexMod >= 0 ? '+' : ''}{dexMod}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">CON</div>
                            <div className="font-semibold">{conMod >= 0 ? '+' : ''}{conMod}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">INT</div>
                            <div className="font-semibold">{intMod >= 0 ? '+' : ''}{intMod}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">WIS</div>
                            <div className="font-semibold">{wisMod >= 0 ? '+' : ''}{wisMod}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-xs text-muted-foreground">CHA</div>
                            <div className="font-semibold">{chaMod >= 0 ? '+' : ''}{chaMod}</div>
                          </div>
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
