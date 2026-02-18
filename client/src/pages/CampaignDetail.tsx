import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import NavHeader from "@/components/NavHeader";
import DiceRoller from "@/components/DiceRoller";
import MemoryBrowser from "@/components/MemoryBrowser";
import { useParams, useLocation } from "wouter";
import {
  Loader2, Send, Plus, Trash2, Sparkles, ArrowLeft, Swords,
  Shield, Heart, MapPin, Users, Scroll, Dices, Clock, Eye,
  ChevronDown, ChevronUp, Skull, Star, Brain
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ============================================================
// MECHANICS RESULT DISPLAY COMPONENT
// Shows dice rolls, checks, and combat results in a structured way
// ============================================================

interface MechanicsResultDisplay {
  type: string;
  success: boolean;
  summary: string;
  details: Record<string, unknown>;
  isHidden: boolean;
}

function MechanicsResultCard({ result }: { result: MechanicsResultDisplay }) {
  const [expanded, setExpanded] = useState(false);

  const getIcon = () => {
    switch (result.type) {
      case "skill_check":
      case "saving_throw":
        return <Dices className="h-4 w-4" />;
      case "attack":
        return <Swords className="h-4 w-4" />;
      case "spell_cast":
        return <Sparkles className="h-4 w-4" />;
      case "hp_change":
        return <Heart className="h-4 w-4" />;
      case "initiative_roll":
        return <Clock className="h-4 w-4" />;
      case "passive_check":
        return <Eye className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getBgColor = () => {
    if (result.type === "error") return "bg-red-100 dark:bg-red-900/30 border-red-300";
    if (result.success) return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700";
    return "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700";
  };

  return (
    <div className={`rounded-lg border p-2 text-sm ${getBgColor()}`}>
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        {getIcon()}
        <span className="flex-1 font-medium text-amber-900 dark:text-amber-100">{result.summary}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </div>
      {expanded && result.details && (
        <div className="mt-2 pl-6 text-xs text-muted-foreground space-y-1">
          {Object.entries(result.details).map(([key, value]) => (
            <div key={key}>
              <span className="font-semibold">{key}:</span> {JSON.stringify(value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// GAME STATE SIDEBAR COMPONENT
// Shows current HP, location, NPCs, encounter status from DB
// ============================================================

function GameStateSidebar({ campaignId }: { campaignId: number }) {
  const { data: gameState } = trpc.dmEngine.getGameState.useQuery(
    { campaignId },
    { refetchInterval: 5000 }
  );

  if (!gameState) return null;

  const modeColors: Record<string, string> = {
    exploration: "bg-emerald-600",
    combat: "bg-red-600",
    social: "bg-blue-600",
    rest: "bg-purple-600",
  };

  return (
    <div className="space-y-4">
      {/* Game Mode & Time */}
      <Card className="border-2 border-amber-800/20 bg-amber-50/50 dark:bg-amber-950/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-serif flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            Game State
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge className={`${modeColors[gameState.gameState.mode] || "bg-gray-600"} text-white text-xs`}>
              {gameState.gameState.mode.toUpperCase()}
            </Badge>
            <span className="text-xs text-muted-foreground">Turn {gameState.gameState.turnNumber}</span>
          </div>
          {gameState.gameState.inGameTime && (
            <p className="text-xs text-amber-700 dark:text-amber-300">{gameState.gameState.inGameTime}</p>
          )}
        </CardContent>
      </Card>

      {/* Party Status */}
      {gameState.partyCharacters.length > 0 && (
        <Card className="border-2 border-amber-800/20 bg-amber-50/50 dark:bg-amber-950/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-serif flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-600" />
              Party
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gameState.partyCharacters.map((char) => {
              const hpPercent = (char.currentHitPoints / char.maxHitPoints) * 100;
              const hpColor = hpPercent > 50 ? "bg-emerald-500" : hpPercent > 25 ? "bg-yellow-500" : "bg-red-500";
              return (
                <div key={char.id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-amber-900 dark:text-amber-100">{char.name}</span>
                    <span className="text-xs text-muted-foreground">AC {char.armorClass}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className="h-3 w-3 text-red-500" />
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${hpColor} rounded-full transition-all`} style={{ width: `${hpPercent}%` }} />
                    </div>
                    <span className="text-xs font-mono">{char.currentHitPoints}/{char.maxHitPoints}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Lv{char.level} {char.race} {char.characterClass}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Current Location */}
      {gameState.currentLocation && (
        <Card className="border-2 border-amber-800/20 bg-amber-50/50 dark:bg-amber-950/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-serif flex items-center gap-2">
              <MapPin className="h-4 w-4 text-amber-600" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{gameState.currentLocation.name}</p>
            {gameState.currentLocation.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{gameState.currentLocation.description}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* NPCs at Location */}
      {gameState.npcsAtLocation.length > 0 && (
        <Card className="border-2 border-amber-800/20 bg-amber-50/50 dark:bg-amber-950/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-serif flex items-center gap-2">
              <Skull className="h-4 w-4 text-amber-600" />
              NPCs Present
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {gameState.npcsAtLocation.map((npc: any) => (
              <div key={npc.id} className="text-xs">
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px] px-1">{npc.npcType}</Badge>
                  <span className="font-semibold text-amber-900 dark:text-amber-100">{npc.name}</span>
                </div>
                {npc.description && <p className="text-muted-foreground mt-0.5 line-clamp-2">{npc.description}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Active Encounter */}
      {gameState.activeEncounter && (
        <Card className="border-2 border-red-500/30 bg-red-50/50 dark:bg-red-950/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-serif flex items-center gap-2 text-red-700 dark:text-red-300">
              <Swords className="h-4 w-4" />
              Active Combat
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-xs font-semibold">Round {gameState.activeEncounter.currentRound}</p>
            {(gameState.activeEncounter.initiativeOrder as any[])?.map((entry: any, i: number) => (
              <div
                key={i}
                className={`text-xs flex justify-between items-center p-1 rounded ${
                  i === gameState.activeEncounter?.currentTurnIndex ? "bg-yellow-200 dark:bg-yellow-800/30 font-bold" : ""
                }`}
              >
                <span>{entry.name}</span>
                <span className="font-mono">{entry.hp}/{entry.maxHp}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Dice Roller */}
      <DiceRoller />
    </div>
  );
}

// ============================================================
// MAIN CAMPAIGN DETAIL PAGE
// ============================================================

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const campaignId = parseInt(id || "0");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // State
  const [activeTab, setActiveTab] = useState("play");
  const [dmPrompt, setDmPrompt] = useState("");
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  const [mechanicsResults, setMechanicsResults] = useState<MechanicsResultDisplay[]>([]);
  const [showMechanics, setShowMechanics] = useState(true);

  // Context entry state
  const [contextType, setContextType] = useState<"event" | "npc" | "location" | "plot" | "item" | "other">("event");
  const [contextTitle, setContextTitle] = useState("");
  const [contextContent, setContextContent] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: campaign, isLoading: campaignLoading } = trpc.campaigns.get.useQuery(
    { id: campaignId },
    { enabled: !!user && !!id }
  );

  const { data: characters } = trpc.characters.listByCampaign.useQuery(
    { campaignId },
    { enabled: !!user && !!id }
  );

  const { data: contextEntries } = trpc.context.list.useQuery(
    { campaignId },
    { enabled: !!user && !!id }
  );

  const { data: dmConversations } = trpc.ai.getConversationHistory.useQuery(
    { campaignId },
    { enabled: !!user && !!id && activeTab === "play" }
  );

  const { data: characterConversations } = trpc.ai.getConversationHistory.useQuery(
    { campaignId, characterId: selectedCharacterId || undefined },
    { enabled: !!user && !!id && !!selectedCharacterId && activeTab === "characters" }
  );

  // DM Engine mutation - uses the new mechanics-separated loop
  const dmEngineMutation = trpc.dmEngine.interact.useMutation({
    onSuccess: (result) => {
      utils.ai.getConversationHistory.invalidate({ campaignId });
      utils.dmEngine.getGameState.invalidate({ campaignId });
      setDmPrompt("");
      // Collect mechanics results for display
      if (result.mechanicsResults && result.mechanicsResults.length > 0) {
        setMechanicsResults((prev) => [...prev, ...result.mechanicsResults]);
      }
    },
    onError: (error) => {
      toast.error(`DM Engine error: ${error.message}`);
    },
  });

  // Legacy character response mutation (still useful for direct character chat)
  const characterResponseMutation = trpc.ai.getCharacterResponse.useMutation({
    onSuccess: () => {
      utils.ai.getConversationHistory.invalidate({ campaignId, characterId: selectedCharacterId || undefined });
      setCharacterPrompt("");
    },
    onError: (error) => {
      toast.error(`Character error: ${error.message}`);
    },
  });

  const createContextMutation = trpc.context.create.useMutation({
    onSuccess: () => {
      toast.success("Context entry added!");
      utils.context.list.invalidate({ campaignId });
      setContextTitle("");
      setContextContent("");
    },
    onError: (error) => {
      toast.error(`Failed to add context: ${error.message}`);
    },
  });

  const deleteContextMutation = trpc.context.delete.useMutation({
    onSuccess: () => {
      toast.success("Context entry deleted");
      utils.context.list.invalidate({ campaignId });
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  const deleteCampaignMutation = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      navigate("/campaigns");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });

  // Initialize game state on mount
  const initGameState = trpc.dmEngine.initializeGameState.useMutation();
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (user && campaignId && !initialized) {
      initGameState.mutate({ campaignId }, {
        onSuccess: () => setInitialized(true),
        onError: () => setInitialized(true), // Don't block on failure
      });
    }
  }, [user, campaignId, initialized]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [dmConversations]);

  // Handlers
  const handleDmPrompt = () => {
    if (!dmPrompt.trim()) return;
    dmEngineMutation.mutate({
      campaignId,
      playerInput: dmPrompt,
    });
  };

  const handleCharacterPrompt = () => {
    if (!characterPrompt.trim() || !selectedCharacterId) return;
    characterResponseMutation.mutate({
      campaignId,
      characterId: selectedCharacterId,
      prompt: characterPrompt,
      includeContext: true,
    });
  };

  const handleAddContext = () => {
    if (!contextTitle.trim() || !contextContent.trim()) {
      toast.error("Title and content are required");
      return;
    }
    createContextMutation.mutate({
      campaignId,
      entryType: contextType,
      title: contextTitle,
      content: contextContent,
    });
  };

  const handleDeleteCampaign = () => {
    if (confirm(`Are you sure you want to delete "${campaign?.name}"? This cannot be undone.`)) {
      deleteCampaignMutation.mutate({ id: campaignId });
    }
  };

  // Filter DM-only conversations
  const dmOnlyConversations = useMemo(() => {
    return dmConversations?.filter((c) => !c.characterId) || [];
  }, [dmConversations]);

  if (authLoading || campaignLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
        <NavHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-amber-600 animate-pulse mx-auto mb-4" />
            <p className="text-amber-800 dark:text-amber-200 font-serif">Loading campaign...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !campaign) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
        <NavHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Card className="max-w-md border-2 border-amber-800/20">
            <CardHeader>
              <CardTitle className="font-serif text-amber-900 dark:text-amber-100">Campaign Not Found</CardTitle>
              <CardDescription>This campaign does not exist or you don't have access</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigate("/campaigns")} className="bg-amber-700 hover:bg-amber-800">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50 dark:from-amber-950 dark:via-orange-950 dark:to-red-950">
      <NavHeader />
      <div className="container max-w-[1400px] py-6">
        {/* Campaign Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
              <Swords className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-amber-900 dark:text-amber-100">{campaign.name}</h1>
              <p className="text-sm text-amber-700 dark:text-amber-300">{campaign.description || "No description"}</p>
            </div>
          </div>
          <Button variant="destructive" size="sm" onClick={handleDeleteCampaign} className="bg-red-700 hover:bg-red-800">
            Delete Campaign
          </Button>
        </div>

        {/* Main Layout: Content + Sidebar */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-6">
          {/* Main Content */}
          <div>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5 bg-amber-100/50 dark:bg-amber-900/50">
                <TabsTrigger value="play" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white font-serif">
                  <Scroll className="h-4 w-4 mr-1" /> DM Mode
                </TabsTrigger>
                <TabsTrigger value="characters" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white font-serif">
                  <Users className="h-4 w-4 mr-1" /> Characters
                </TabsTrigger>
                <TabsTrigger value="context" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white font-serif">
                  <MapPin className="h-4 w-4 mr-1" /> Context
                </TabsTrigger>
                <TabsTrigger value="memory" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white font-serif">
                  <Brain className="h-4 w-4 mr-1" /> Memory
                </TabsTrigger>
                <TabsTrigger value="mechanics" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white font-serif">
                  <Dices className="h-4 w-4 mr-1" /> Mechanics
                </TabsTrigger>
              </TabsList>

              {/* ============ DM MODE TAB ============ */}
              <TabsContent value="play" className="space-y-4">
                <Card className="border-2 border-amber-800/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="font-serif text-amber-900 dark:text-amber-100 flex items-center gap-2">
                          <Scroll className="h-5 w-5" />
                          Dungeon Master Engine
                        </CardTitle>
                        <CardDescription>
                          AI DM with real dice rolls, skill checks, and persistent world state
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Mechanics-Separated
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Chat Area */}
                    <ScrollArea className="h-[500px] border rounded-lg p-4 bg-amber-25 dark:bg-amber-950/30">
                      <div className="space-y-4">
                        {dmOnlyConversations.length > 0 ? (
                          dmOnlyConversations.map((conv, idx) => (
                            <div key={idx}>
                              <div className={`p-3 rounded-lg ${
                                conv.role === "user"
                                  ? "bg-blue-50 dark:bg-blue-900/20 ml-12 border border-blue-200 dark:border-blue-800"
                                  : "bg-amber-50 dark:bg-amber-900/20 mr-4 border border-amber-200 dark:border-amber-800"
                              }`}>
                                <div className="text-xs font-semibold mb-1 flex items-center gap-1">
                                  {conv.role === "user" ? (
                                    <><Shield className="h-3 w-3" /> Player</>
                                  ) : (
                                    <><Scroll className="h-3 w-3 text-amber-600" /> Dungeon Master</>
                                  )}
                                </div>
                                <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                                  <Streamdown>{conv.content}</Streamdown>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                            <Scroll className="h-16 w-16 text-amber-300 mb-4" />
                            <p className="font-serif text-lg text-amber-700 dark:text-amber-300">Your adventure awaits...</p>
                            <p className="text-sm mt-2">Tell the DM what you do, and the engine will handle dice rolls and mechanics.</p>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    </ScrollArea>

                    {/* Inline Mechanics Results */}
                    {mechanicsResults.length > 0 && (
                      <Collapsible open={showMechanics} onOpenChange={setShowMechanics}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full flex items-center gap-2 text-xs">
                            <Dices className="h-3 w-3" />
                            {mechanicsResults.length} Mechanics Result{mechanicsResults.length !== 1 ? "s" : ""}
                            {showMechanics ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="space-y-1 max-h-40 overflow-y-auto">
                            {mechanicsResults.slice(-10).map((r, i) => (
                              <MechanicsResultCard key={i} result={r} />
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Input Area */}
                    <div className="flex gap-2">
                      <Textarea
                        value={dmPrompt}
                        onChange={(e) => setDmPrompt(e.target.value)}
                        placeholder="Describe what you do... (e.g., 'I search the room for traps' or 'I attack the goblin with my sword')"
                        rows={2}
                        className="resize-none border-amber-300 dark:border-amber-700 focus:border-amber-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleDmPrompt();
                          }
                        }}
                      />
                      <Button
                        onClick={handleDmPrompt}
                        disabled={dmEngineMutation.isPending || !dmPrompt.trim()}
                        className="self-end bg-amber-700 hover:bg-amber-800 text-white"
                      >
                        {dmEngineMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {dmEngineMutation.isPending && (
                      <div className="flex items-center gap-2 text-xs text-amber-600">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        The DM is resolving mechanics and crafting narration...
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ CHARACTERS TAB ============ */}
              <TabsContent value="characters" className="space-y-4">
                <Card className="border-2 border-amber-800/20">
                  <CardHeader>
                    <CardTitle className="font-serif text-amber-900 dark:text-amber-100">Character Roleplay</CardTitle>
                    <CardDescription>Interact directly with your characters</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Character</Label>
                      <Select
                        value={selectedCharacterId?.toString() || ""}
                        onValueChange={(value) => setSelectedCharacterId(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a character" />
                        </SelectTrigger>
                        <SelectContent>
                          {characters && characters.length > 0 ? (
                            characters.map((char) => (
                              <SelectItem key={char.id} value={char.id.toString()}>
                                {char.name} ({char.characterClass}) - HP {char.currentHitPoints}/{char.maxHitPoints}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>
                              No characters in this campaign
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCharacterId && (
                      <>
                        <ScrollArea className="h-96 border rounded-lg p-4 bg-muted/20">
                          <div className="space-y-4">
                            {characterConversations && characterConversations.length > 0 ? (
                              characterConversations.map((conv, idx) => (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-lg ${
                                    conv.role === "user" ? "bg-primary/10 ml-8" : "bg-card mr-8"
                                  }`}
                                >
                                  <div className="text-xs text-muted-foreground mb-1">
                                    {conv.role === "user"
                                      ? "You"
                                      : characters?.find((c) => c.id === selectedCharacterId)?.name}
                                  </div>
                                  <Streamdown>{conv.content}</Streamdown>
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                Start a conversation with this character...
                              </div>
                            )}
                          </div>
                        </ScrollArea>

                        <div className="flex gap-2">
                          <Textarea
                            value={characterPrompt}
                            onChange={(e) => setCharacterPrompt(e.target.value)}
                            placeholder="What do you say or ask?"
                            rows={2}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleCharacterPrompt();
                              }
                            }}
                          />
                          <Button
                            onClick={handleCharacterPrompt}
                            disabled={characterResponseMutation.isPending || !characterPrompt.trim()}
                            className="self-end"
                          >
                            {characterResponseMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ CONTEXT TAB ============ */}
              <TabsContent value="context" className="space-y-4">
                <Card className="border-2 border-amber-800/20">
                  <CardHeader>
                    <CardTitle className="font-serif text-amber-900 dark:text-amber-100">Add Context Entry</CardTitle>
                    <CardDescription>Track important game information for AI reference</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Entry Type</Label>
                        <Select value={contextType} onValueChange={(value: any) => setContextType(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="event">Event</SelectItem>
                            <SelectItem value="npc">NPC</SelectItem>
                            <SelectItem value="location">Location</SelectItem>
                            <SelectItem value="plot">Plot Point</SelectItem>
                            <SelectItem value="item">Item</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Title</Label>
                        <Input
                          value={contextTitle}
                          onChange={(e) => setContextTitle(e.target.value)}
                          placeholder="e.g., 'Goblin Ambush' or 'Innkeeper Toblen'"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        value={contextContent}
                        onChange={(e) => setContextContent(e.target.value)}
                        placeholder="Describe the event, NPC, location, etc..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleAddContext} disabled={createContextMutation.isPending} className="bg-amber-700 hover:bg-amber-800 text-white">
                      <Plus className="mr-2 h-4 w-4" />
                      {createContextMutation.isPending ? "Adding..." : "Add Entry"}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-2 border-amber-800/20">
                  <CardHeader>
                    <CardTitle className="font-serif text-amber-900 dark:text-amber-100">Context Entries</CardTitle>
                    <CardDescription>Campaign knowledge base for AI</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {contextEntries && contextEntries.length > 0 ? (
                      <div className="space-y-3">
                        {contextEntries.map((entry) => (
                          <div key={entry.id} className="p-4 border rounded-lg flex justify-between items-start border-amber-200 dark:border-amber-800">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="text-xs">
                                  {entry.entryType}
                                </Badge>
                                <span className="font-semibold text-amber-900 dark:text-amber-100">{entry.title}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{entry.content}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteContextMutation.mutate({ id: entry.id })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No context entries yet. Add important information to help the AI understand your campaign.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ============ MEMORY BROWSER TAB ============ */}
              <TabsContent value="memory" className="space-y-4">
                <MemoryBrowser campaignId={campaignId} />
              </TabsContent>

              {/* ============ MECHANICS LOG TAB ============ */}
              <TabsContent value="mechanics" className="space-y-4">
                <Card className="border-2 border-amber-800/20">
                  <CardHeader>
                    <CardTitle className="font-serif text-amber-900 dark:text-amber-100 flex items-center gap-2">
                      <Dices className="h-5 w-5" />
                      Mechanics Log
                    </CardTitle>
                    <CardDescription>
                      All dice rolls, skill checks, and state changes - the source of truth
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {mechanicsResults.length > 0 ? (
                      <div className="space-y-2">
                        {[...mechanicsResults].reverse().map((r, i) => (
                          <MechanicsResultCard key={i} result={r} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Dices className="h-12 w-12 mx-auto mb-4 text-amber-300" />
                        <p className="font-serif text-lg">No mechanics events yet</p>
                        <p className="text-sm mt-1">Start playing in DM Mode to see dice rolls and checks here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar - Game State */}
          <div className="hidden lg:block">
            <GameStateSidebar campaignId={campaignId} />
          </div>
        </div>
      </div>
    </div>
  );
}
