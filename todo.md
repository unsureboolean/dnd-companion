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
- [ ] Create password-based auth system (password: "jeffisawesome")
- [ ] Remove Manus OAuth dependencies
- [ ] Update all protected routes to use password auth
- [ ] Create login page with password input
- [ ] Update session management for password auth
- [ ] Remove OAuth from UI and navigation
