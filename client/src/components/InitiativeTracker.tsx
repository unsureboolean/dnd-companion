import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronUp, ChevronDown, Swords, SkipForward, RotateCcw, Heart, Shield } from "lucide-react";
import { CONDITIONS } from "../../../shared/dnd5eData";

interface Combatant {
  id: string;
  name: string;
  initiative: number;
  currentHp: number;
  maxHp: number;
  armorClass: number;
  conditions: string[];
  isPlayer: boolean;
  isActive: boolean;
}

interface InitiativeTrackerProps {
  onCombatUpdate?: (combatants: Combatant[], currentTurn: number) => void;
}

export default function InitiativeTracker({ onCombatUpdate }: InitiativeTrackerProps) {
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [round, setRound] = useState(1);
  const [combatStarted, setCombatStarted] = useState(false);

  // New combatant form
  const [newName, setNewName] = useState("");
  const [newInitiative, setNewInitiative] = useState("");
  const [newHp, setNewHp] = useState("");
  const [newAc, setNewAc] = useState("");
  const [newIsPlayer, setNewIsPlayer] = useState(true);

  const sortedCombatants = [...combatants].sort((a, b) => b.initiative - a.initiative);

  const addCombatant = () => {
    if (!newName.trim()) return;

    const combatant: Combatant = {
      id: crypto.randomUUID(),
      name: newName,
      initiative: parseInt(newInitiative) || Math.floor(Math.random() * 20) + 1,
      currentHp: parseInt(newHp) || 10,
      maxHp: parseInt(newHp) || 10,
      armorClass: parseInt(newAc) || 10,
      conditions: [],
      isPlayer: newIsPlayer,
      isActive: false,
    };

    setCombatants(prev => [...prev, combatant]);
    setNewName("");
    setNewInitiative("");
    setNewHp("");
    setNewAc("");
  };

  const removeCombatant = (id: string) => {
    setCombatants(prev => prev.filter(c => c.id !== id));
  };

  const updateCombatantHp = (id: string, delta: number) => {
    setCombatants(prev =>
      prev.map(c =>
        c.id === id
          ? { ...c, currentHp: Math.max(0, Math.min(c.maxHp, c.currentHp + delta)) }
          : c
      )
    );
  };

  const toggleCondition = (id: string, condition: string) => {
    setCombatants(prev =>
      prev.map(c =>
        c.id === id
          ? {
              ...c,
              conditions: c.conditions.includes(condition)
                ? c.conditions.filter(cond => cond !== condition)
                : [...c.conditions, condition],
            }
          : c
      )
    );
  };

  const startCombat = () => {
    if (combatants.length === 0) return;
    setCombatStarted(true);
    setCurrentTurn(0);
    setRound(1);
    
    // Mark first combatant as active
    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    setCombatants(prev =>
      prev.map(c => ({ ...c, isActive: c.id === sorted[0]?.id }))
    );

    onCombatUpdate?.(sorted, 0);
  };

  const nextTurn = () => {
    const sorted = [...combatants].sort((a, b) => b.initiative - a.initiative);
    let nextIndex = currentTurn + 1;
    
    if (nextIndex >= sorted.length) {
      nextIndex = 0;
      setRound(prev => prev + 1);
    }
    
    setCurrentTurn(nextIndex);
    setCombatants(prev =>
      prev.map(c => ({ ...c, isActive: c.id === sorted[nextIndex]?.id }))
    );

    onCombatUpdate?.(sorted, nextIndex);
  };

  const resetCombat = () => {
    setCombatStarted(false);
    setCurrentTurn(0);
    setRound(1);
    setCombatants(prev => prev.map(c => ({ ...c, isActive: false, currentHp: c.maxHp, conditions: [] })));
  };

  const rollInitiativeForAll = () => {
    setCombatants(prev =>
      prev.map(c => ({
        ...c,
        initiative: Math.floor(Math.random() * 20) + 1,
      }))
    );
  };

  return (
    <Card className="border-2 border-red-800/30 bg-gradient-to-b from-red-50 to-orange-50 dark:from-red-950/50 dark:to-orange-950/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between font-serif text-red-900 dark:text-red-100">
          <span className="flex items-center gap-2">
            <Swords className="h-5 w-5" />
            Initiative Tracker
          </span>
          {combatStarted && (
            <Badge variant="destructive" className="font-mono">
              Round {round}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Combatant Form */}
        {!combatStarted && (
          <div className="space-y-3 p-3 bg-white/30 dark:bg-black/20 rounded-lg border border-red-800/20">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Goblin 1"
                  className="bg-white/50"
                />
              </div>
              <div>
                <Label className="text-xs">Initiative</Label>
                <Input
                  type="number"
                  value={newInitiative}
                  onChange={(e) => setNewInitiative(e.target.value)}
                  placeholder="Auto"
                  className="bg-white/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">HP</Label>
                <Input
                  type="number"
                  value={newHp}
                  onChange={(e) => setNewHp(e.target.value)}
                  placeholder="10"
                  className="bg-white/50"
                />
              </div>
              <div>
                <Label className="text-xs">AC</Label>
                <Input
                  type="number"
                  value={newAc}
                  onChange={(e) => setNewAc(e.target.value)}
                  placeholder="10"
                  className="bg-white/50"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={newIsPlayer ? "player" : "enemy"} onValueChange={(v) => setNewIsPlayer(v === "player")}>
                  <SelectTrigger className="bg-white/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="player">Player</SelectItem>
                    <SelectItem value="enemy">Enemy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addCombatant} className="flex-1 bg-red-700 hover:bg-red-800 text-white">
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
              <Button onClick={rollInitiativeForAll} variant="outline" className="border-red-800/30">
                Roll All
              </Button>
            </div>
          </div>
        )}

        {/* Combat Controls */}
        {combatants.length > 0 && (
          <div className="flex gap-2">
            {!combatStarted ? (
              <Button onClick={startCombat} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                <Swords className="h-4 w-4 mr-1" />
                Start Combat
              </Button>
            ) : (
              <>
                <Button onClick={nextTurn} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                  <SkipForward className="h-4 w-4 mr-1" />
                  Next Turn
                </Button>
                <Button onClick={resetCombat} variant="outline" className="border-red-800/30">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        )}

        {/* Combatant List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedCombatants.map((combatant, index) => (
            <div
              key={combatant.id}
              className={`p-3 rounded-lg border-2 transition-all ${
                combatant.isActive
                  ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 shadow-lg"
                  : combatant.isPlayer
                  ? "border-blue-300 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-red-300 bg-red-50/50 dark:bg-red-950/20"
              } ${combatant.currentHp === 0 ? "opacity-50" : ""}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono font-bold">
                    {combatant.initiative}
                  </Badge>
                  <span className={`font-semibold ${combatant.isPlayer ? "text-blue-800 dark:text-blue-200" : "text-red-800 dark:text-red-200"}`}>
                    {combatant.name}
                  </span>
                  {combatant.isActive && (
                    <Badge className="bg-yellow-500 text-black">ACTIVE</Badge>
                  )}
                </div>
                {!combatStarted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCombatant(combatant.id)}
                    className="h-6 w-6 p-0 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Heart className={`h-4 w-4 ${combatant.currentHp <= combatant.maxHp / 4 ? "text-red-600" : "text-pink-500"}`} />
                  <span className="font-mono">
                    {combatant.currentHp}/{combatant.maxHp}
                  </span>
                  <div className="flex gap-1 ml-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => updateCombatantHp(combatant.id, -1)}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => updateCombatantHp(combatant.id, 1)}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4 text-slate-500" />
                  <span className="font-mono">{combatant.armorClass}</span>
                </div>
              </div>

              {/* Conditions */}
              {combatStarted && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <Select onValueChange={(v) => toggleCondition(combatant.id, v)}>
                    <SelectTrigger className="h-6 w-24 text-xs">
                      <SelectValue placeholder="+Cond" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITIONS.map(cond => (
                        <SelectItem key={cond.name} value={cond.name} className="text-xs">
                          {cond.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {combatant.conditions.map(cond => (
                    <Badge
                      key={cond}
                      variant="secondary"
                      className="cursor-pointer text-xs"
                      onClick={() => toggleCondition(combatant.id, cond)}
                    >
                      {cond} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {combatants.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Add combatants to begin tracking initiative
          </p>
        )}
      </CardContent>
    </Card>
  );
}
