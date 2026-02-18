/**
 * MEMORY BROWSER COMPONENT
 * ========================
 * Provides a UI for searching, viewing, and managing the AI DM's
 * long-term vector memories (embeddings stored in MySQL).
 *
 * AI-NOTE: This component uses the dmEngine.searchMemories, getMemories,
 * deleteMemory, updateMemoryImportance, and addMemory tRPC endpoints.
 * Memories are auto-embedded during DM turns via the memoryPipeline.
 */

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Brain,
  Trash2,
  Plus,
  Star,
  Swords,
  MapPin,
  Users,
  Scroll,
  Sparkles,
  BookOpen,
  Shield,
  Loader2,
  ChevronDown,
  ChevronUp,
  Filter,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

// ============================================================
// TYPES
// ============================================================

interface Memory {
  id: number;
  memoryType: string;
  content: string;
  summary: string | null;
  sessionNumber: number | null;
  turnNumber: number | null;
  tags: string[] | null;
  importanceBoost: number | null;
  createdAt: Date | string;
}

interface SearchResult extends Memory {
  similarity: number;
}

// ============================================================
// MEMORY TYPE CONFIG - icons, colors, labels
// ============================================================

const MEMORY_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; bgColor: string }
> = {
  session_narration: {
    icon: <Scroll className="h-3 w-3" />,
    label: "Narration",
    color: "text-amber-700 dark:text-amber-300",
    bgColor: "bg-amber-100 dark:bg-amber-900/50 border-amber-300 dark:border-amber-700",
  },
  player_action: {
    icon: <Shield className="h-3 w-3" />,
    label: "Player Action",
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700",
  },
  npc_interaction: {
    icon: <Users className="h-3 w-3" />,
    label: "NPC",
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-900/50 border-purple-300 dark:border-purple-700",
  },
  combat_event: {
    icon: <Swords className="h-3 w-3" />,
    label: "Combat",
    color: "text-red-700 dark:text-red-300",
    bgColor: "bg-red-100 dark:bg-red-900/50 border-red-300 dark:border-red-700",
  },
  location_discovery: {
    icon: <MapPin className="h-3 w-3" />,
    label: "Location",
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-900/50 border-green-300 dark:border-green-700",
  },
  plot_point: {
    icon: <Sparkles className="h-3 w-3" />,
    label: "Plot",
    color: "text-yellow-700 dark:text-yellow-300",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/50 border-yellow-300 dark:border-yellow-700",
  },
  item_event: {
    icon: <BookOpen className="h-3 w-3" />,
    label: "Item",
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-900/50 border-orange-300 dark:border-orange-700",
  },
  lore: {
    icon: <Brain className="h-3 w-3" />,
    label: "Lore",
    color: "text-indigo-700 dark:text-indigo-300",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/50 border-indigo-300 dark:border-indigo-700",
  },
  context_entry: {
    icon: <BookOpen className="h-3 w-3" />,
    label: "Context",
    color: "text-teal-700 dark:text-teal-300",
    bgColor: "bg-teal-100 dark:bg-teal-900/50 border-teal-300 dark:border-teal-700",
  },
  character_moment: {
    icon: <Star className="h-3 w-3" />,
    label: "Character",
    color: "text-pink-700 dark:text-pink-300",
    bgColor: "bg-pink-100 dark:bg-pink-900/50 border-pink-300 dark:border-pink-700",
  },
};

function getMemoryConfig(type: string) {
  return (
    MEMORY_TYPE_CONFIG[type] || {
      icon: <Brain className="h-3 w-3" />,
      label: type,
      color: "text-gray-700 dark:text-gray-300",
      bgColor: "bg-gray-100 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700",
    }
  );
}

// ============================================================
// MEMORY CARD COMPONENT
// ============================================================

function MemoryCard({
  memory,
  campaignId,
  similarity,
  onDelete,
  onImportanceChange,
}: {
  memory: Memory;
  campaignId: number;
  similarity?: number;
  onDelete: (id: number) => void;
  onImportanceChange: (id: number, boost: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = getMemoryConfig(memory.memoryType);
  const importance = memory.importanceBoost ?? 0;
  const createdDate = new Date(memory.createdAt);

  return (
    <Card
      className={`border ${config.bgColor} transition-all hover:shadow-md cursor-pointer`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Type Badge */}
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 shrink-0 ${config.color}`}
            >
              <span className="mr-1">{config.icon}</span>
              {config.label}
            </Badge>

            {/* Similarity score if from search */}
            {similarity !== undefined && (
              <Badge
                variant="secondary"
                className="text-[10px] px-1.5 py-0 shrink-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
              >
                {similarity}% match
              </Badge>
            )}

            {/* Importance stars */}
            {importance > 0 && (
              <div className="flex items-center gap-0.5 shrink-0">
                {Array.from({ length: Math.min(importance, 5) }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3 w-3 fill-yellow-400 text-yellow-400"
                  />
                ))}
                {importance > 5 && (
                  <span className="text-[10px] text-yellow-600 font-bold">
                    +{importance - 5}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Expand/Collapse indicator */}
          <div className="shrink-0">
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Summary / Preview */}
        <p
          className={`text-sm mt-2 text-amber-900 dark:text-amber-100 ${
            expanded ? "" : "line-clamp-2"
          }`}
        >
          {memory.summary || memory.content}
        </p>

        {/* Expanded Content */}
        {expanded && (
          <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
            {/* Full content if different from summary */}
            {memory.summary && memory.content !== memory.summary && (
              <div className="bg-white/50 dark:bg-black/20 rounded-md p-2">
                <p className="text-xs text-muted-foreground font-semibold mb-1">
                  Full Content:
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-200 whitespace-pre-wrap">
                  {memory.content}
                </p>
              </div>
            )}

            {/* Tags */}
            {memory.tags && memory.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {memory.tags.map((tag, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="text-[10px] px-1 py-0 bg-white/50 dark:bg-black/20"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Metadata row */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <div className="flex items-center gap-3">
                {memory.sessionNumber !== null && (
                  <span>Session #{memory.sessionNumber}</span>
                )}
                {memory.turnNumber !== null && (
                  <span>Turn #{memory.turnNumber}</span>
                )}
                <span>{createdDate.toLocaleDateString()}</span>
              </div>
              <span className="font-mono">ID: {memory.id}</span>
            </div>

            {/* Actions Row */}
            <div className="flex items-center gap-2 pt-1 border-t border-amber-200 dark:border-amber-800">
              {/* Importance Slider */}
              <div className="flex-1 flex items-center gap-2">
                <Star className="h-3 w-3 text-yellow-500 shrink-0" />
                <Slider
                  value={[importance]}
                  min={0}
                  max={10}
                  step={1}
                  className="flex-1"
                  onValueChange={(val) => onImportanceChange(memory.id, val[0])}
                />
                <span className="text-xs font-mono w-4 text-center">
                  {importance}
                </span>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-100"
                onClick={() => {
                  if (confirm("Delete this memory? The AI DM will no longer recall it.")) {
                    onDelete(memory.id);
                  }
                }}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                <span className="text-xs">Delete</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// ADD MEMORY DIALOG
// ============================================================

function AddMemoryDialog({
  campaignId,
  onSuccess,
}: {
  campaignId: number;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [memoryType, setMemoryType] = useState("lore");
  const [content, setContent] = useState("");
  const [summary, setSummary] = useState("");
  const [importance, setImportance] = useState(2);
  const [tags, setTags] = useState("");

  const addMemoryMutation = trpc.dmEngine.addMemory.useMutation({
    onSuccess: () => {
      toast.success("Memory added! The AI DM will now recall this information.");
      setOpen(false);
      setContent("");
      setSummary("");
      setTags("");
      setImportance(2);
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to add memory: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    addMemoryMutation.mutate({
      campaignId,
      memoryType: memoryType as any,
      content: content.trim(),
      summary: summary.trim() || undefined,
      importanceBoost: importance,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-amber-700 hover:bg-amber-800 text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Memory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-amber-50 dark:bg-amber-950 border-amber-800/30">
        <DialogHeader>
          <DialogTitle className="font-serif text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <Brain className="h-5 w-5 text-amber-600" />
            Add Memory to AI DM
          </DialogTitle>
          <DialogDescription>
            Add lore, notes, or important information that the AI DM should
            remember. This will be embedded and recalled during gameplay.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Memory Type */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Memory Type
            </Label>
            <Select value={memoryType} onValueChange={setMemoryType}>
              <SelectTrigger className="bg-white dark:bg-amber-900/30 border-amber-300 dark:border-amber-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lore">Lore / World Building</SelectItem>
                <SelectItem value="plot_point">Plot Point</SelectItem>
                <SelectItem value="npc_interaction">NPC Info</SelectItem>
                <SelectItem value="location_discovery">Location</SelectItem>
                <SelectItem value="item_event">Item / Treasure</SelectItem>
                <SelectItem value="combat_event">Combat Note</SelectItem>
                <SelectItem value="character_moment">Character Moment</SelectItem>
                <SelectItem value="context_entry">General Context</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Content *
            </Label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="The ancient dragon Zephyrax sleeps beneath the Ironhold Mountains, guarding a hoard of enchanted weapons..."
              className="bg-white dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 min-h-[100px]"
            />
          </div>

          {/* Summary (optional) */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Summary (optional)
            </Label>
            <Input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief summary for quick reference"
              className="bg-white dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
            />
          </div>

          {/* Tags */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Tags (comma-separated)
            </Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="dragon, ironhold, treasure"
              className="bg-white dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
            />
          </div>

          {/* Importance */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              Importance: {importance}/10
            </Label>
            <Slider
              value={[importance]}
              min={0}
              max={10}
              step={1}
              onValueChange={(val) => setImportance(val[0])}
            />
            <p className="text-[10px] text-muted-foreground">
              Higher importance means the AI DM will recall this more often
            </p>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={addMemoryMutation.isPending || !content.trim()}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white"
          >
            {addMemoryMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Embedding...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Add to DM Memory
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// MAIN MEMORY BROWSER COMPONENT
// ============================================================

export default function MemoryBrowser({ campaignId }: { campaignId: number }) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "importance">("recent");
  const [showStats, setShowStats] = useState(false);

  const utils = trpc.useUtils();

  // Queries
  const { data: memories, isLoading: memoriesLoading } =
    trpc.dmEngine.getMemories.useQuery({ campaignId });

  const { data: memoryCount } = trpc.dmEngine.getMemoryCount.useQuery({
    campaignId,
  });

  // Mutations
  const searchMutation = trpc.dmEngine.searchMemories.useMutation({
    onSuccess: (results) => {
      setSearchResults(results as SearchResult[]);
    },
    onError: (error) => {
      toast.error(`Search failed: ${error.message}`);
    },
  });

  const deleteMutation = trpc.dmEngine.deleteMemory.useMutation({
    onSuccess: () => {
      toast.success("Memory deleted");
      utils.dmEngine.getMemories.invalidate({ campaignId });
      utils.dmEngine.getMemoryCount.invalidate({ campaignId });
      // Also clear from search results if present
      if (searchResults) {
        setSearchResults((prev) =>
          prev ? prev.filter((r) => r.id !== deleteMutation.variables?.memoryId) : null
        );
      }
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const importanceMutation = trpc.dmEngine.updateMemoryImportance.useMutation({
    onSuccess: () => {
      utils.dmEngine.getMemories.invalidate({ campaignId });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const initMemoriesMutation = trpc.dmEngine.initializeMemories.useMutation({
    onSuccess: (result) => {
      toast.success(`Embedded ${result.embedded} context entries into memory`);
      utils.dmEngine.getMemories.invalidate({ campaignId });
      utils.dmEngine.getMemoryCount.invalidate({ campaignId });
    },
    onError: (error) => {
      toast.error(`Initialization failed: ${error.message}`);
    },
  });

  // Handlers
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    searchMutation.mutate({
      campaignId,
      query: searchQuery.trim(),
      topK: 10,
    });
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults(null);
  };

  const handleDelete = (memoryId: number) => {
    deleteMutation.mutate({ memoryId, campaignId });
  };

  const handleImportanceChange = (memoryId: number, boost: number) => {
    importanceMutation.mutate({ memoryId, campaignId, importanceBoost: boost });
  };

  // Filtered and sorted memories for browse mode
  const displayMemories = useMemo(() => {
    if (!memories) return [];
    let filtered = [...memories];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((m) => m.memoryType === filterType);
    }

    // Sort
    if (sortBy === "importance") {
      filtered.sort(
        (a, b) => (b.importanceBoost ?? 0) - (a.importanceBoost ?? 0)
      );
    } else {
      // Recent first (default)
      filtered.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return filtered;
  }, [memories, filterType, sortBy]);

  // Memory type stats
  const typeStats = useMemo(() => {
    if (!memories) return {};
    const stats: Record<string, number> = {};
    memories.forEach((m) => {
      stats[m.memoryType] = (stats[m.memoryType] || 0) + 1;
    });
    return stats;
  }, [memories]);

  // Determine which list to show
  const isSearchMode = searchResults !== null;
  const displayList = isSearchMode ? searchResults : displayMemories;

  return (
    <div className="space-y-4">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-amber-900 dark:text-amber-100">
              DM Memory Bank
            </h3>
            <p className="text-xs text-muted-foreground">
              {memoryCount ?? 0} memories stored
              {memories && memories.length > 0 && (
                <> &middot; {Object.keys(typeStats).length} types</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <AddMemoryDialog
            campaignId={campaignId}
            onSuccess={() => {
              utils.dmEngine.getMemories.invalidate({ campaignId });
              utils.dmEngine.getMemoryCount.invalidate({ campaignId });
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => initMemoriesMutation.mutate({ campaignId })}
            disabled={initMemoriesMutation.isPending}
            className="border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200"
          >
            {initMemoriesMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            Sync Context
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="text-amber-700 dark:text-amber-300"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Panel (collapsible) */}
      {showStats && (
        <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/50">
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
              Memory Distribution
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {Object.entries(typeStats)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const config = getMemoryConfig(type);
                  return (
                    <div
                      key={type}
                      className={`flex items-center gap-1.5 p-1.5 rounded border ${config.bgColor}`}
                    >
                      {config.icon}
                      <span className={`text-[10px] font-semibold ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-[10px] font-mono ml-auto">
                        {count}
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card className="border-2 border-amber-800/20 bg-amber-50/50 dark:bg-amber-950/50">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search memories semantically... (e.g., 'the merchant from Waterdeep')"
                className="pl-9 bg-white dark:bg-amber-900/30 border-amber-300 dark:border-amber-700"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={searchMutation.isPending}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              {searchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
            {isSearchMode && (
              <Button
                variant="outline"
                onClick={handleClearSearch}
                className="border-amber-300 dark:border-amber-700"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Search mode indicator */}
          {isSearchMode && (
            <div className="mt-2 flex items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                <Search className="h-3 w-3 mr-1" />
                Semantic Search Results
              </Badge>
              <span className="text-xs text-muted-foreground">
                {searchResults.length} memories found for &ldquo;{searchQuery}&rdquo;
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filter & Sort Controls (only in browse mode) */}
      {!isSearchMode && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Filter:</span>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] h-8 text-xs bg-white dark:bg-amber-900/30 border-amber-300 dark:border-amber-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="session_narration">Narration</SelectItem>
              <SelectItem value="player_action">Player Actions</SelectItem>
              <SelectItem value="npc_interaction">NPC Interactions</SelectItem>
              <SelectItem value="combat_event">Combat Events</SelectItem>
              <SelectItem value="location_discovery">Locations</SelectItem>
              <SelectItem value="plot_point">Plot Points</SelectItem>
              <SelectItem value="item_event">Items</SelectItem>
              <SelectItem value="lore">Lore</SelectItem>
              <SelectItem value="context_entry">Context</SelectItem>
              <SelectItem value="character_moment">Character</SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5" />

          <span className="text-xs text-muted-foreground">Sort:</span>
          <Button
            variant={sortBy === "recent" ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs ${
              sortBy === "recent"
                ? "bg-amber-700 text-white"
                : "border-amber-300 dark:border-amber-700"
            }`}
            onClick={() => setSortBy("recent")}
          >
            Recent
          </Button>
          <Button
            variant={sortBy === "importance" ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs ${
              sortBy === "importance"
                ? "bg-amber-700 text-white"
                : "border-amber-300 dark:border-amber-700"
            }`}
            onClick={() => setSortBy("importance")}
          >
            <Star className="h-3 w-3 mr-1" />
            Importance
          </Button>

          <span className="text-xs text-muted-foreground ml-auto">
            {displayList.length} {displayList.length === 1 ? "memory" : "memories"}
          </span>
        </div>
      )}

      {/* Memory List */}
      {memoriesLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-serif">
            Loading memories...
          </p>
        </div>
      ) : displayList.length === 0 ? (
        <Card className="border-2 border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/30">
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-amber-300" />
            <p className="font-serif text-lg text-amber-800 dark:text-amber-200">
              {isSearchMode
                ? "No memories match your search"
                : "No memories yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isSearchMode
                ? "Try a different search query or browse all memories"
                : "Memories are automatically created as you play. You can also add them manually."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2 pr-4">
            {displayList.map((memory) => (
              <MemoryCard
                key={memory.id}
                memory={{...memory, tags: (memory.tags as string[] | null)}}
                campaignId={campaignId}
                similarity={
                  isSearchMode ? (memory as SearchResult).similarity : undefined
                }
                onDelete={handleDelete}
                onImportanceChange={handleImportanceChange}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
