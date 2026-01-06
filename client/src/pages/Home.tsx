import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Users, Scroll, Swords, BookOpen } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold text-foreground mb-6">
              D&D Companion
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Your AI-powered assistant for Dungeons & Dragons adventures. Create characters, 
              manage campaigns, and let AI bring your game to life.
            </p>
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>Get Started</a>
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-16 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Character Creation</CardTitle>
                <CardDescription>
                  Build detailed D&D 5e characters with full rule support
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Scroll className="h-10 w-10 text-primary mb-2" />
                <CardTitle>AI Roleplay</CardTitle>
                <CardDescription>
                  Characters respond in-character using personality and context
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Swords className="h-10 w-10 text-primary mb-2" />
                <CardTitle>Campaign Management</CardTitle>
                <CardDescription>
                  Track sessions, NPCs, locations, and plot points
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BookOpen className="h-10 w-10 text-primary mb-2" />
                <CardTitle>DM Mode</CardTitle>
                <CardDescription>
                  Let AI act as dungeon master and narrate scenarios
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-16">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Welcome back, {user.name || "Adventurer"}!
          </h1>
          <p className="text-muted-foreground mb-12">
            What would you like to do today?
          </p>

          <div className="grid gap-6">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/characters")}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Users className="h-10 w-10 text-primary flex-shrink-0" />
                  <div>
                    <CardTitle>My Characters</CardTitle>
                    <CardDescription>
                      View and manage your character roster
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/campaigns")}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Swords className="h-10 w-10 text-primary flex-shrink-0" />
                  <div>
                    <CardTitle>My Campaigns</CardTitle>
                    <CardDescription>
                      Manage your adventures and sessions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate("/characters/create")}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Scroll className="h-10 w-10 text-primary flex-shrink-0" />
                  <div>
                    <CardTitle>Create Character</CardTitle>
                    <CardDescription>
                      Build a new D&D 5e character
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
