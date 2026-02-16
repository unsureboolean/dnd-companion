import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import NavHeader from "@/components/NavHeader";
import { Link, useLocation } from "wouter";
import { Plus, Swords, Map, Sparkles, Calendar, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Campaigns() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCharacterId, setSelectedCharacterId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: characters } = trpc.characters.list.useQuery(undefined, {
    enabled: !!user,
  });

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      toast.success("Campaign created!");
      utils.campaigns.list.invalidate();
      setDialogOpen(false);
      setName("");
      setDescription("");
      navigate(`/campaigns/${data.id}`);
    },
    onError: (error) => {
      toast.error(`Failed to create campaign: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!selectedCharacterId) {
      toast.error("Please select a character to play");
      return;
    }
    createMutation.mutate({ name, description, playerCharacterId: selectedCharacterId });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
        <NavHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-amber-600 animate-pulse mx-auto mb-4" />
            <p className="text-amber-800 dark:text-amber-200 font-serif">Loading your adventures...</p>
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
              <CardDescription>Please log in to view your campaigns</CardDescription>
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
              Your Campaigns
            </h1>
            <p className="text-amber-700 dark:text-amber-300">Manage your epic adventures</p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-amber-700 to-red-700 hover:from-amber-800 hover:to-red-800 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="border-2 border-amber-800/20 bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
              <DialogHeader>
                <DialogTitle className="font-serif text-xl text-amber-900 dark:text-amber-100">Create New Campaign</DialogTitle>
                <DialogDescription className="text-amber-700 dark:text-amber-300">Start a new adventure in the realms</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name" className="text-amber-800 dark:text-amber-200">Campaign Name</Label>
                  <Input
                    id="campaign-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="The Lost Mines of Phandelver"
                    className="bg-white/50 border-amber-800/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign-description" className="text-amber-800 dark:text-amber-200">Description (optional)</Label>
                  <Textarea
                    id="campaign-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your campaign setting, themes, and goals..."
                    rows={4}
                    className="bg-white/50 border-amber-800/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="player-character" className="text-amber-800 dark:text-amber-200">Your Character *</Label>
                  {characters && characters.length > 0 ? (
                    <select
                      id="player-character"
                      value={selectedCharacterId || ""}
                      onChange={(e) => setSelectedCharacterId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 bg-white/50 border border-amber-800/30 rounded-md text-amber-900 dark:text-amber-100 dark:bg-amber-950/50"
                    >
                      <option value="">Select a character...</option>
                      {characters.map((char) => (
                        <option key={char.id} value={char.id}>
                          {char.name} - Level {char.level} {char.characterClass}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-amber-600/40 bg-amber-100/50 dark:bg-amber-900/30 p-4 text-center">
                      <Users className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">No characters yet</p>
                      <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">You need to create a character before starting a campaign</p>
                      <Link href="/characters/create">
                        <Button size="sm" className="bg-amber-700 hover:bg-amber-800 text-white">
                          <Plus className="mr-1 h-3 w-3" />
                          Create Character
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-amber-800/30">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={createMutation.isPending || !characters || characters.length === 0}
                  className="bg-amber-700 hover:bg-amber-800"
                >
                  {createMutation.isPending ? "Creating..." : "Create Campaign"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!campaigns || campaigns.length === 0 ? (
          <Card className="border-2 border-amber-800/20 bg-gradient-to-br from-white/80 to-amber-50/80 dark:from-amber-950/80 dark:to-orange-950/80">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-20 w-20 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center mb-4">
                <Map className="h-10 w-10 text-amber-600" />
              </div>
              <h3 className="text-xl font-serif font-semibold text-amber-900 dark:text-amber-100 mb-2">No campaigns yet</h3>
              <p className="text-amber-700 dark:text-amber-300 mb-6 text-center max-w-md">
                Create your first campaign to start tracking your adventures
              </p>
              <Button 
                onClick={() => setDialogOpen(true)}
                className="bg-gradient-to-r from-amber-700 to-red-700 hover:from-amber-800 hover:to-red-800 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Campaign
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {campaigns.map((campaign: any) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="cursor-pointer hover:shadow-xl transition-all h-full border-2 border-amber-800/20 bg-gradient-to-br from-white/90 to-amber-50/90 dark:from-amber-950/90 dark:to-orange-950/90 hover:border-amber-600/50">
                  <CardHeader>
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow">
                        <Swords className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="font-serif text-lg text-amber-900 dark:text-amber-100">
                          {campaign.name}
                        </CardTitle>
                        <CardDescription className="text-amber-700 dark:text-amber-300 line-clamp-2">
                          {campaign.description || "No description"}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-amber-600 dark:text-amber-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
