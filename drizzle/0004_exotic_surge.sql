CREATE TABLE `encounterState` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`currentRound` int NOT NULL DEFAULT 1,
	`currentTurnIndex` int NOT NULL DEFAULT 0,
	`initiativeOrder` json,
	`locationId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `encounterState_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gameState` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`mode` enum('exploration','combat','social','rest') NOT NULL DEFAULT 'exploration',
	`currentLocationId` int,
	`inGameTime` varchar(255) DEFAULT 'Day 1, Morning',
	`environmentalConditions` json,
	`activeEffects` json,
	`sessionNumber` int NOT NULL DEFAULT 1,
	`turnNumber` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `gameState_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`baseDescription` text,
	`connectedLocationIds` json,
	`hiddenObjects` json,
	`hazards` json,
	`isAccessible` boolean NOT NULL DEFAULT true,
	`isVisited` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mechanicsLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`turnNumber` int NOT NULL,
	`eventType` enum('skill_check','attack_roll','saving_throw','damage','healing','spell_cast','item_use','hp_change','condition_change','initiative_roll','death_save','passive_check','npc_goal_advance','state_change') NOT NULL,
	`actorId` varchar(255),
	`targetId` varchar(255),
	`details` json,
	`summary` text,
	`isHidden` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `mechanicsLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `npcs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`npcType` enum('friendly','neutral','hostile','merchant','quest_giver','boss') NOT NULL DEFAULT 'neutral',
	`description` text,
	`locationId` int,
	`currentGoal` text,
	`goalProgress` int DEFAULT 0,
	`disposition` int DEFAULT 0,
	`stats` json,
	`personalityNotes` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `npcs_id` PRIMARY KEY(`id`)
);
