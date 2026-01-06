import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dices, RotateCcw } from "lucide-react";

interface RollResult {
  id: string;
  notation: string;
  rolls: number[];
  modifier: number;
  total: number;
  timestamp: Date;
  type?: "normal" | "advantage" | "disadvantage";
}

function rollDice(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

function rollMultipleDice(count: number, sides: number): number[] {
  return Array.from({ length: count }, () => rollDice(sides));
}

export default function DiceRoller() {
  const [customNotation, setCustomNotation] = useState("1d20");
  const [modifier, setModifier] = useState(0);
  const [rollHistory, setRollHistory] = useState<RollResult[]>([]);

  const addRoll = (result: Omit<RollResult, "id" | "timestamp">) => {
    const newRoll: RollResult = {
      ...result,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setRollHistory(prev => [newRoll, ...prev.slice(0, 19)]); // Keep last 20 rolls
  };

  const handleQuickRoll = (sides: number) => {
    const rolls = [rollDice(sides)];
    addRoll({
      notation: `1d${sides}`,
      rolls,
      modifier: 0,
      total: rolls[0],
    });
  };

  const handleAdvantageRoll = () => {
    const rolls = rollMultipleDice(2, 20);
    const result = Math.max(...rolls);
    addRoll({
      notation: "1d20 (Advantage)",
      rolls,
      modifier,
      total: result + modifier,
      type: "advantage",
    });
  };

  const handleDisadvantageRoll = () => {
    const rolls = rollMultipleDice(2, 20);
    const result = Math.min(...rolls);
    addRoll({
      notation: "1d20 (Disadvantage)",
      rolls,
      modifier,
      total: result + modifier,
      type: "disadvantage",
    });
  };

  const handleCustomRoll = () => {
    const match = customNotation.toLowerCase().match(/^(\d*)d(\d+)$/);
    if (!match) return;

    const count = match[1] ? parseInt(match[1]) : 1;
    const sides = parseInt(match[2]);

    if (count < 1 || count > 100 || sides < 2 || sides > 100) return;

    const rolls = rollMultipleDice(count, sides);
    const sum = rolls.reduce((a, b) => a + b, 0);

    addRoll({
      notation: `${count}d${sides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ""}`,
      rolls,
      modifier,
      total: sum + modifier,
    });
  };

  const clearHistory = () => setRollHistory([]);

  const diceButtons = [
    { sides: 4, color: "bg-red-600 hover:bg-red-700" },
    { sides: 6, color: "bg-orange-600 hover:bg-orange-700" },
    { sides: 8, color: "bg-yellow-600 hover:bg-yellow-700" },
    { sides: 10, color: "bg-green-600 hover:bg-green-700" },
    { sides: 12, color: "bg-blue-600 hover:bg-blue-700" },
    { sides: 20, color: "bg-purple-600 hover:bg-purple-700" },
    { sides: 100, color: "bg-pink-600 hover:bg-pink-700" },
  ];

  return (
    <Card className="border-2 border-amber-800/30 bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-amber-900 dark:text-amber-100">
          <Dices className="h-5 w-5" />
          Dice Roller
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Roll Buttons */}
        <div className="grid grid-cols-7 gap-2">
          {diceButtons.map(({ sides, color }) => (
            <Button
              key={sides}
              onClick={() => handleQuickRoll(sides)}
              className={`${color} text-white font-bold h-12 text-sm`}
            >
              d{sides}
            </Button>
          ))}
        </div>

        {/* Advantage/Disadvantage */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleAdvantageRoll}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Advantage
          </Button>
          <Button
            onClick={handleDisadvantageRoll}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            Disadvantage
          </Button>
        </div>

        {/* Custom Roll */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="notation" className="text-xs text-amber-800 dark:text-amber-200">Dice Notation</Label>
            <Input
              id="notation"
              value={customNotation}
              onChange={(e) => setCustomNotation(e.target.value)}
              placeholder="2d6"
              className="bg-white/50 border-amber-800/30"
            />
          </div>
          <div className="w-20">
            <Label htmlFor="modifier" className="text-xs text-amber-800 dark:text-amber-200">Modifier</Label>
            <Input
              id="modifier"
              type="number"
              value={modifier}
              onChange={(e) => setModifier(parseInt(e.target.value) || 0)}
              className="bg-white/50 border-amber-800/30"
            />
          </div>
          <Button onClick={handleCustomRoll} className="bg-amber-700 hover:bg-amber-800 text-white">
            Roll
          </Button>
        </div>

        {/* Roll History */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-amber-800 dark:text-amber-200">Roll History</Label>
            <Button variant="ghost" size="sm" onClick={clearHistory} className="h-6 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />
              Clear
            </Button>
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1 bg-white/30 rounded-lg p-2">
            {rollHistory.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">No rolls yet</p>
            ) : (
              rollHistory.map((roll) => (
                <div
                  key={roll.id}
                  className="flex items-center justify-between p-2 bg-white/50 dark:bg-black/20 rounded border border-amber-800/20"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs border-amber-800/30">
                      {roll.notation}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      [{roll.rolls.join(", ")}]
                      {roll.modifier !== 0 && (
                        <span className="ml-1">
                          {roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier}
                        </span>
                      )}
                    </span>
                  </div>
                  <span className={`font-bold text-lg font-serif ${
                    roll.type === "advantage" ? "text-emerald-600" :
                    roll.type === "disadvantage" ? "text-rose-600" :
                    roll.total === 20 && roll.rolls.includes(20) ? "text-yellow-500" :
                    roll.total === 1 && roll.rolls.includes(1) ? "text-red-500" :
                    "text-amber-900 dark:text-amber-100"
                  }`}>
                    {roll.total}
                    {roll.rolls.includes(20) && roll.notation.includes("d20") && (
                      <span className="ml-1 text-xs">NAT 20!</span>
                    )}
                    {roll.rolls.includes(1) && roll.notation.includes("d20") && roll.rolls.length === 1 && (
                      <span className="ml-1 text-xs">NAT 1!</span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
