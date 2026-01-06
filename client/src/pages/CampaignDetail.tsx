import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Loader2, Send, Plus, Trash2 } from "lucide-react";
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Campaign Not Found</CardTitle>
            <CardDescription>This campaign does not exist or you don't have access</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/campaigns")}>Back to Campaigns</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-6xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">{campaign.name}</h1>
            <p className="text-muted-foreground">{campaign.description || "No description"}</p>
          </div>
          <Button variant="destructive" onClick={handleDeleteCampaign}>
            Delete Campaign
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="play">DM Mode</TabsTrigger>
            <TabsTrigger value="characters">Characters</TabsTrigger>
            <TabsTrigger value="context">Context</TabsTrigger>
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
        </Tabs>
      </div>
    </div>
  );
}
