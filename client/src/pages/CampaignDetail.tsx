import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import NavHeader from "@/components/NavHeader";
import InitiativeTracker from "@/components/InitiativeTracker";
import DiceRoller from "@/components/DiceRoller";
import { useParams, useLocation } from "wouter";
import { Loader2, Send, Plus, Trash2, Sparkles, ArrowLeft, Swords } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Badge } from "@/components/ui/badge";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const campaignId = parseInt(id || "0");

  // State
  const [activeTab, setActiveTab] = useState("play");
  const [dmPrompt, setDmPrompt] = useState("");
  const [characterPrompt, setCharacterPrompt] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);
  
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

  // Mutations
  const dmResponseMutation = trpc.ai.getDmResponse.useMutation({
    onSuccess: () => {
      utils.ai.getConversationHistory.invalidate({ campaignId });
      setDmPrompt("");
    },
    onError: (error) => {
      toast.error(`DM error: ${error.message}`);
    },
  });

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

  // Handlers
  const handleDmPrompt = () => {
    if (!dmPrompt.trim()) return;
    dmResponseMutation.mutate({
      campaignId,
      prompt: dmPrompt,
      includeContext: true,
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
      <div className="container max-w-7xl py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
              <Swords className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-1">{campaign.name}</h1>
              <p className="text-amber-700 dark:text-amber-300">{campaign.description || "No description"}</p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleDeleteCampaign} className="bg-red-700 hover:bg-red-800">
            Delete Campaign
          </Button>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 bg-amber-100/50 dark:bg-amber-900/50">
                <TabsTrigger value="play" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">DM Mode</TabsTrigger>
                <TabsTrigger value="combat" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">Combat</TabsTrigger>
                <TabsTrigger value="characters" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">Characters</TabsTrigger>
                <TabsTrigger value="context" className="data-[state=active]:bg-amber-700 data-[state=active]:text-white">Context</TabsTrigger>
              </TabsList>

          <TabsContent value="play" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Dungeon Master</CardTitle>
                <CardDescription>Let AI narrate your adventure</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/20">
                  {dmConversations && dmConversations.length > 0 ? (
                    dmConversations.filter(c => !c.characterId).map((conv, idx) => (
                      <div key={idx} className={`p-3 rounded-lg ${conv.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-card mr-8'}`}>
                        <div className="text-xs text-muted-foreground mb-1">
                          {conv.role === 'user' ? 'You' : 'Dungeon Master'}
                        </div>
                        <Streamdown>{conv.content}</Streamdown>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Start your adventure by asking the DM something...
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={dmPrompt}
                    onChange={(e) => setDmPrompt(e.target.value)}
                    placeholder="Describe what you do or ask the DM..."
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleDmPrompt();
                      }
                    }}
                  />
                  <Button
                    onClick={handleDmPrompt}
                    disabled={dmResponseMutation.isPending || !dmPrompt.trim()}
                    className="self-end"
                  >
                    {dmResponseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="characters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Character Roleplay</CardTitle>
                <CardDescription>Interact with your characters</CardDescription>
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
                        characters.map(char => (
                          <SelectItem key={char.id} value={char.id.toString()}>
                            {char.name} ({char.characterClass})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No characters in this campaign</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCharacterId && (
                  <>
                    <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4 bg-muted/20">
                      {characterConversations && characterConversations.length > 0 ? (
                        characterConversations.map((conv, idx) => (
                          <div key={idx} className={`p-3 rounded-lg ${conv.role === 'user' ? 'bg-primary/10 ml-8' : 'bg-card mr-8'}`}>
                            <div className="text-xs text-muted-foreground mb-1">
                              {conv.role === 'user' ? 'You' : characters?.find(c => c.id === selectedCharacterId)?.name}
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

                    <div className="flex gap-2">
                      <Textarea
                        value={characterPrompt}
                        onChange={(e) => setCharacterPrompt(e.target.value)}
                        placeholder="What do you say or ask?"
                        rows={2}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
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
                        {characterResponseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="context" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Add Context Entry</CardTitle>
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

                <Button onClick={handleAddContext} disabled={createContextMutation.isPending}>
                  <Plus className="mr-2 h-4 w-4" />
                  {createContextMutation.isPending ? "Adding..." : "Add Entry"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Context Entries</CardTitle>
                <CardDescription>Campaign knowledge base for AI</CardDescription>
              </CardHeader>
              <CardContent>
                {contextEntries && contextEntries.length > 0 ? (
                  <div className="space-y-3">
                    {contextEntries.map(entry => (
                      <div key={entry.id} className="p-4 border rounded-lg flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="text-xs">
                              {entry.entryType}
                            </Badge>
                            <span className="font-semibold">{entry.title}</span>
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

          {/* Combat Tab with Initiative Tracker */}
          <TabsContent value="combat" className="space-y-6">
            <InitiativeTracker />
          </TabsContent>
        </Tabs>
          </div>

          {/* Sidebar with Dice Roller */}
          <div className="lg:col-span-1">
            <DiceRoller />
          </div>
        </div>
      </div>
    </div>
  );
}
