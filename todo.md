# D&D Companion App TODO

## Phase 1: Database Schema & Planning
- [x] Create project structure
- [x] Define database schema for characters, campaigns, context, and sessions

## Phase 2: Character Generation System
- [x] Create D&D 5e data models (races, classes, backgrounds, skills, equipment)
- [x] Implement character creation wizard with step-by-step flow
- [x] Build ability score generation (standard array, point buy, random roll)
- [x] Implement skill proficiency selection
- [x] Add equipment selection based on class and background
- [x] Create character summary page

## Phase 3: Character Sheet Viewer & Editor
- [x] Build character sheet display component
- [x] Implement real-time character editing
- [x] Add ability score and modifier calculations
- [x] Create skill check interface with proficiency bonuses
- [x] Build inventory management
- [x] Add character leveling system

## Phase 4: AI Character Response System
- [x] Implement context database for game events, NPCs, locations, plot points
- [x] Create AI prompt system using character personality and backstory
- [x] Build character response interface for in-character actions and dialogue
- [x] Add context retrieval for relevant game history
- [x] Implement conversation history tracking

## Phase 5: DM Mode & Campaign Logging
- [x] Create DM mode interface for AI dungeon master
- [x] Implement scenario generation and narration
- [x] Build campaign session log with timestamped entries
- [x] Add context entry creation from DM mode
- [x] Create campaign management interface

## Phase 6: Multi-Character Management
- [x] Implement character roster for each user
- [x] Add AI-driven companion character system (1-2 additional characters)
- [x] Build party management interface
- [x] Create character switching mechanism
- [x] Add batch AI response for multiple characters

## Phase 7: Testing & Deployment
- [x] Write vitest tests for character generation
- [x] Write vitest tests for AI response system
- [x] Write vitest tests for context retrieval
- [x] Test complete user workflows
- [x] Create checkpoint and deliver

## Phase 8: User Requested Enhancements

### Expanded 5e Content
- [x] Add more races (Tabaxi, Genasi, Aasimar, Firbolg, Goliath, Kenku, Lizardfolk, Triton, etc.)
- [x] Add subclasses for each class
- [x] Add spell management system with spell slots

### Dice Rolling System
- [x] Implement virtual dice roller (d4, d6, d8, d10, d12, d20, d100)
- [x] Add roll history
- [x] Include automatic modifier calculations
- [x] Add advantage/disadvantage rolling

### Initiative Tracker
- [x] Build combat initiative tracker
- [x] Add turn order management
- [x] Include HP tracking for combatants
- [x] Add condition/status effect monitoring
- [x] Integrate with DM AI mode

### Navigation & UX
- [x] Add persistent navigation header/back button
- [x] Add AI control toggle on home screen character list
- [x] Improve page-to-page navigation flow

### Visual Design
- [x] Enhance D&D themed styling (parchment textures, medieval fonts, fantasy elements)
- [x] Add decorative borders and icons
- [x] Improve overall fantasy aesthetic

## Phase 9: AI Character Generation

### AI-Powered Character Generator
- [x] Create AI endpoint for generating character details from minimal input
- [x] Generate random names based on race if not provided
- [x] Auto-select race, class, background if not specified
- [x] Generate ability scores with appropriate distribution for class
- [x] Select skills based on class and background
- [x] Generate equipment loadout

### Rich Backstory Generation
- [x] Create AI backstory generator that creates 3-5 paragraph backstories
- [x] Include personality traits, ideals, bonds, and flaws
- [x] Add character quirks and mannerisms
- [x] Generate origin story based on race, class, and background
- [x] Add backstory expansion button to existing characters

### Quick Generate UI
- [x] Add "Quick Generate" option on character creation page
- [x] Allow partial input (e.g., just name, or just class)
- [x] Show AI-generated preview before saving
- [x] Add "Regenerate" button for individual sections

## Bug Fixes
- [x] Fix Create Character feature error (empty Select.Item value issue)

## Phase 10: OpenAI API Integration
- [x] Create OpenAI LLM wrapper
- [x] Create OpenAI DALL-E image generation wrapper
- [x] Request OPENAI_API_KEY from user
- [x] Update character generator to use OpenAI
- [x] Update AI router to use OpenAI
- [x] Update multi-character router to use OpenAI
- [x] Add character portrait generation feature
- [x] Add portrait display on character sheet
- [x] Test all AI features with OpenAI

## Phase 11: Simple Password Authentication
- [ ] Create account/password-based auth system 
- [ ] Remove Manus OAuth dependencies
- [ ] Update all protected routes to use password auth
- [ ] Create login page with password input
- [ ] Update session management for password auth
- [ ] Remove OAuth from UI and navigation

## Phase 12: Character Leveling System & Feature Expansion

### Leveling System
- [x] Integrate D&D 5e API for official spells, cantrips, and class data
- [x] Create leveling progression data structures
- [x] Build level-up UI with class feature selection
- [x] Implement spell and cantrip selection based on class
- [x] Add ability score improvements at appropriate levels
- [x] Update character sheet to show progression options
- [x] Allow users to level up their characters, which syncs with DM data

### Feature Expansion
- [ ] Multiple users linked to campaign/DM
- [ ] Search filter and sort for campaigns
- [ ] Users need dedicated screen with Character Sheet, all dice, list of other character basic info, notes, etc.
- [ ] DM needs dedicated DM screen with additional info, DM notes, NPC and Dialogue generator, context tracker
- [ ] Integrate character creation into the "Characters" tab on the Campaigns page

## Phase 13: DM Engine Refactor - Separate Narrative from Mechanics

### Architecture & Schema
- [x] Design DM engine architecture document (ARCHITECTURE.md)
- [x] Add world state tables (rooms, objects with hidden DCs, NPC goals)
- [x] Add game state table for tracking current encounter/exploration mode
- [x] Add NPC table with current_goal field for off-screen advancement

### Mechanics Engine (server/engine/)
- [x] Create dice engine (RNG-based, no LLM math) - roll_skill, roll_attack, roll_save, roll_damage
- [x] Create skill check resolver (compare roll vs DC, factor proficiency/advantage)
- [x] Create combat engine (initiative, attack resolution, damage application, death saves)
- [x] Create passive perception/investigation system (check stats vs hidden DCs before narration)
- [x] Create inventory/spell slot manager (source of truth for state changes)
- [x] Create state manager that reads/writes all game state to DB

### DM Logic Loop (server/engine/dmLoop.ts)
- [x] Implement intent parser - LLM classifies player input into action types
- [x] Implement function calling tools for LLM (roll_skill, roll_attack, check_inventory, etc.)
- [x] Build the core loop: input → intent → mechanics → narrate → update state
- [x] Feed current game state (HP, inventory, spell slots, world state) into context every turn
- [x] Implement passive checks that run BEFORE room descriptions are generated
- [x] Implement NPC off-screen goal advancement between turns

### Narrative Layer (integrated into dmLoop.ts)
- [x] Create narrator that receives mechanics results and generates prose
- [x] Ensure narrator NEVER generates stats/numbers - only reads from DB
- [x] Feed dice results, check outcomes, and state changes into narrator context
- [x] Generate room descriptions with passive check results baked in

### UI Updates
- [x] Update campaign chat to use new DM engine loop
- [x] Show mechanics results (dice rolls, checks) in structured format alongside narration
- [x] Add game state sidebar showing current HP, conditions, spell slots from DB
### Testing
- [x] Write vitest tests for mechanics engine (31 tests passing)
- [x] Fix leveling tests timeout issues
- [x] All 60 tests passing across 7 test files
