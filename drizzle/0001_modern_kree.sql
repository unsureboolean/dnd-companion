CREATE TABLE `aiConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`characterId` int,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`contextUsed` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiConversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`campaignId` int,
	`name` varchar(255) NOT NULL,
	`race` varchar(100) NOT NULL,
	`characterClass` varchar(100) NOT NULL,
	`background` varchar(100) NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`strength` int NOT NULL,
	`dexterity` int NOT NULL,
	`constitution` int NOT NULL,
	`intelligence` int NOT NULL,
	`wisdom` int NOT NULL,
	`charisma` int NOT NULL,
	`alignment` varchar(50),
	`experiencePoints` int NOT NULL DEFAULT 0,
	`personality` text,
	`backstory` text,
	`ideals` text,
	`bonds` text,
	`flaws` text,
	`skills` json,
	`savingThrows` json,
	`equipment` json,
	`spells` json,
	`features` json,
	`maxHitPoints` int NOT NULL,
	`currentHitPoints` int NOT NULL,
	`armorClass` int NOT NULL,
	`isAiControlled` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contextEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`entryType` enum('event','npc','location','plot','item','other') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contextEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessionLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`sessionNumber` int NOT NULL,
	`entryType` enum('narration','character_action','dm_note','combat','dialogue') NOT NULL,
	`characterId` int,
	`content` text NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessionLogs_id` PRIMARY KEY(`id`)
);
