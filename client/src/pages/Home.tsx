import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import NavHeader from "@/components/NavHeader";
import DiceRoller from "@/components/DiceRoller";
import { 
  Users, 
  Scroll, 
  Swords, 
  BookOpen, 
  Plus, 
  Bot, 
  User,
  Shield,
  Heart,
  Sparkles,
  Map,
  ChevronRight
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Fetch user's characters
  const { data: characters, refetch: refetchCharacters } = trpc.characters.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Toggle AI control mutation
  const toggleAiControl = trpc.characters.update.useMutation({
    onSuccess: () => {
      refetchCharacters();
      toast.success("AI control updated");
    },
    onError: () => {
      toast.error("Failed to update AI control");
    },
  });

  const handleToggleAi = (characterId: number, currentValue: boolean) => {
    toggleAiControl.mutate({
      id: characterId,
      isAiControlled: !currentValue,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-100 dark:from-amber-950 dark:to-orange-950">
        <NavHeader />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-amber-600 animate-pulse mx-auto mb-4" />
            <p className="text-amber-800 dark:text-amber-200 font-serif">Loading your adventure...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50 dark:from-amber-950 dark:via-orange-950 dark:to-red-950">
        <NavHeader />
        
        {/* Hero Section */}
        <div className="relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjOTI0MDBFIiBzdHJva2Utb3BhY2l0eT0iLjEiLz48L2c+PC9zdmc+')] opacity-30" />
          
          <div className="container py-20 relative">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-amber-800/10 px-4 py-2 rounded-full mb-6">
                <Scroll className="h-5 w-5 text-amber-700" />
                <span className="text-amber-800 dark:text-amber-200 text-sm font-medium">Your Digital Game Master</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-6 tracking-tight">
                D&D Companion
              </h1>
              
              <p className="text-xl text-amber-800/80 dark:text-amber-200/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                Your AI-powered assistant for Dungeons & Dragons adventures. Create characters, 
                manage campaigns, and let AI bring your game to life with intelligent roleplay.
              </p>
              
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-amber-700 to-red-700 hover:from-amber-800 hover:to-red-800 text-white font-serif text-lg px-8 py-6 shadow-lg"
                asChild
              >
                <a href={getLoginUrl()}>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Begin Your Adventure
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="container py-16">
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <Card className="border-2 border-amber-800/20 bg-gradient-to-br from-white/80 to-amber-50/80 dark:from-amber-950/80 dark:to-orange-950/80 backdrop-blur">
              <CardHeader>
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4 shadow-lg">
                  <Users className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="font-serif text-xl text-amber-900 dark:text-amber-100">Character Creation</CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  Build detailed D&D 5e characters with full rule support, including expanded races, subclasses, and equipment
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-amber-800/20 bg-gradient-to-br from-white/80 to-amber-50/80 dark:from-amber-950/80 dark:to-orange-950/80 backdrop-blur">
              <CardHeader>
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 shadow-lg">
                  <Bot className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="font-serif text-xl text-amber-900 dark:text-amber-100">AI Roleplay</CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  Characters respond in-character using their personality, backstory, and campaign context
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-amber-800/20 bg-gradient-to-br from-white/80 to-amber-50/80 dark:from-amber-950/80 dark:to-orange-950/80 backdrop-blur">
              <CardHeader>
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mb-4 shadow-lg">
                  <Swords className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="font-serif text-xl text-amber-900 dark:text-amber-100">Campaign Management</CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  Track sessions, NPCs, locations, plot points, and important context for your adventures
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 border-amber-800/20 bg-gradient-to-br from-white/80 to-amber-50/80 dark:from-amber-950/80 dark:to-orange-950/80 backdrop-blur">
              <CardHeader>
                <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mb-4 shadow-lg">
                  <BookOpen className="h-7 w-7 text-white" />
                </div>
                <CardTitle className="font-serif text-xl text-amber-900 dark:text-amber-100">DM Mode</CardTitle>
                <CardDescription className="text-amber-700 dark:text-amber-300">
                  Let AI act as dungeon master, narrate scenarios, and control multiple companion characters
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user view
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-red-50 dark:from-amber-950 dark:via-orange-950 dark:to-red-950">
      <NavHeader />
      
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-amber-900 dark:text-amber-100 mb-2">
              Welcome back, {user.name || "Adventurer"}!
            </h1>
            <p className="text-amber-700 dark:text-amber-300">
              What quest shall you embark on today?
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all border-2 border-amber-800/20 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 hover:border-blue-500/50"
                  onClick={() => navigate("/characters/create")}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-blue-600 flex items-center justify-center shadow">
                      <Plus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-serif font-semibold text-blue-900 dark:text-blue-100">Create Character</h3>
                      <p className="text-sm text-blue-700 dark:text-blue-300">Build a new hero</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-blue-600 ml-auto" />
                  </CardContent>
                </Card>

                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all border-2 border-amber-800/20 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50 hover:border-emerald-500/50"
                  onClick={() => navigate("/campaigns")}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-emerald-600 flex items-center justify-center shadow">
                      <Map className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-serif font-semibold text-emerald-900 dark:text-emerald-100">Campaigns</h3>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">Manage adventures</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-emerald-600 ml-auto" />
                  </CardContent>
                </Card>
              </div>

              {/* Character List with AI Toggles */}
              <Card className="border-2 border-amber-800/20 bg-gradient-to-br from-white/80 to-amber-50/80 dark:from-amber-950/80 dark:to-orange-950/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif text-xl text-amber-900 dark:text-amber-100 flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Your Characters
                    </CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-amber-800/30"
                      onClick={() => navigate("/characters")}
                    >
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!characters || characters.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="h-12 w-12 text-amber-400 mx-auto mb-3" />
                      <p className="text-amber-700 dark:text-amber-300 mb-4">No characters yet</p>
                      <Button onClick={() => navigate("/characters/create")} className="bg-amber-700 hover:bg-amber-800">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Character
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {characters.slice(0, 5).map((character: any) => (
                        <div
                          key={character.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-white/50 dark:bg-black/20 border border-amber-800/20 hover:border-amber-600/40 transition-colors"
                        >
                          <div 
                            className="flex items-center gap-4 flex-1 cursor-pointer"
                            onClick={() => navigate(`/characters/${character.id}`)}
                          >
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-amber-600 to-red-600 flex items-center justify-center text-white font-serif font-bold text-lg shadow">
                              {character.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-serif font-semibold text-amber-900 dark:text-amber-100 truncate">
                                  {character.name}
                                </h3>
                                {character.isAiControlled && (
                                  <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                                    <Bot className="h-3 w-3 mr-1" />
                                    AI
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-amber-700 dark:text-amber-300">
                                Level {character.level} {character.race} {character.class}
                              </p>
                            </div>
                            <div className="hidden sm:flex items-center gap-4 text-sm text-amber-600 dark:text-amber-400">
                              <span className="flex items-center gap-1">
                                <Heart className="h-4 w-4 text-red-500" />
                                {character.currentHp}/{character.maxHp}
                              </span>
                              <span className="flex items-center gap-1">
                                <Shield className="h-4 w-4 text-blue-500" />
                                {character.armorClass}
                              </span>
                            </div>
                          </div>
                          
                          {/* AI Control Toggle */}
                          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-amber-800/20">
                            <span className="text-xs text-amber-600 dark:text-amber-400 hidden sm:block">
                              AI Control
                            </span>
                            <Switch
                              checked={character.isAiControlled}
                              onCheckedChange={() => handleToggleAi(character.id, character.isAiControlled)}
                              disabled={toggleAiControl.isPending}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <DiceRoller />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
