# DM Engine Architecture

## Core Principle: Separation of Narrative and Mechanics

The LLM is NEVER the source of truth for game state. All HP, inventory, spell slots,
ability scores, dice rolls, and world state live in the database. The LLM only:
1. Interprets player intent
2. Chooses which mechanics to invoke (via function calling)
3. Narrates the results of those mechanics

## Data Flow (The Logic Loop)

```
Player Input
    ↓
[1] Intent Classification (LLM)
    - "I attack the goblin" → { action: "attack", target: "goblin" }
    - "I search the room"   → { action: "skill_check", skill: "investigation" }
    - "I cast fireball"     → { action: "cast_spell", spell: "fireball", targets: [...] }
    - "I talk to the innkeeper" → { action: "dialogue", npc: "innkeeper" }
    ↓
[2] Pre-Narration Checks (Code)
    - Run passive perception vs hidden object DCs
    - Check if any NPC goals trigger reactions
    - Validate spell slots, inventory, etc.
    ↓
[3] Mechanics Execution (Code, NOT LLM)
    - Dice rolls (RNG)
    - DC comparisons
    - Damage calculations
    - State mutations (HP, inventory, spell slots)
    ↓
[4] State Update (Database)
    - Write all changes to DB
    - Update character HP, spell slots, inventory
    - Update world state (NPC positions, room states)
    - Log the mechanical results
    ↓
[5] Narration (LLM)
    - Receives: mechanical results + current world state from DB
    - Generates: prose description of what happened
    - NEVER invents stats, rolls, or state changes
    ↓
[6] Response to Player
    - Structured mechanics panel (dice rolls, HP changes, etc.)
    - Narrative prose from LLM
```

## Function Calling Tools (LLM → Code)

The LLM uses OpenAI function calling to request mechanical actions:

| Tool Name | Purpose | Example |
|-----------|---------|---------|
| `roll_skill_check` | Skill check against DC | { skill: "perception", dc: 15, characterId: 1 } |
| `roll_attack` | Attack roll + damage | { characterId: 1, targetId: "goblin_1", weaponOrSpell: "longsword" } |
| `roll_saving_throw` | Saving throw | { ability: "dexterity", dc: 13, characterId: 1 } |
| `cast_spell` | Cast a spell (validates slots) | { characterId: 1, spellName: "fireball", level: 3, targets: [...] } |
| `use_item` | Use/consume inventory item | { characterId: 1, item: "healing_potion" } |
| `check_inventory` | Read inventory state | { characterId: 1 } |
| `check_character_stats` | Read full character state | { characterId: 1 } |
| `update_hp` | Heal or damage a character | { characterId: 1, amount: -8 } |
| `advance_npc_goals` | Progress NPC plans | { npcId: "goblin_chief" } |
| `describe_environment` | Get room/area details | { locationId: "tavern" } |

## Database Tables (New/Modified)

### gameState (per campaign)
- Current location, time of day, encounter mode (exploration/combat/social)
- Active conditions, environmental effects

### npcs (per campaign)
- Name, stats, current_goal, disposition, location
- Goals advance off-screen between turns

### locations (per campaign)
- Name, description, connected locations
- Hidden objects with DCs (e.g., trap DC 15, secret door DC 18)

### encounterState (per campaign, active combat)
- Initiative order, current turn
- Combatant HP, conditions, positions

## Key Design Decisions

1. **Dice rolls are ALWAYS code-generated** - crypto.getRandomValues for fairness
2. **LLM sees DB state every turn** - full character sheet + relevant world state injected
3. **Passive checks run before narration** - system compares stats vs DCs silently
4. **NPC goals are data** - stored in DB, advanced by code, narrated by LLM
5. **All state changes go through the engine** - LLM requests changes, code validates and applies
