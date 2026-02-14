CREATE TABLE `memoryEmbeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`memoryType` enum('session_narration','player_action','npc_interaction','combat_event','location_discovery','plot_point','item_event','lore','context_entry','character_moment') NOT NULL,
	`content` text NOT NULL,
	`summary` varchar(500),
	`embedding` json NOT NULL,
	`sourceId` int,
	`sourceTable` varchar(100),
	`sessionNumber` int,
	`turnNumber` int,
	`importanceBoost` int DEFAULT 0,
	`tags` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memoryEmbeddings_id` PRIMARY KEY(`id`)
);
