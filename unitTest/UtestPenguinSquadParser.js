module("PenguinSquadParser");

QUnit.test("discovers all chapters in source order", (assert) => {
    const done = assert.async();
    const parser = new PenguinSquadParser();

    const dom = util.syncLoadSampleDoc(
        "../testdata/PenguinSquadTOC.html",
        "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse",
    );

    const expected = [
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-1-a-train-appeared",
            title: "A Train Appeared",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-2-secured-fuel",
            title: "Secured Fuel",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-3-i-chose-a-direction-1",
            title: "I Chose a Direction (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-4-i-chose-a-direction-1",
            title: "I Chose a Direction (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-5-dungeon-1",
            title: "Dungeon (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-6-dungeon-2",
            title: "Dungeon (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-7-shop-1",
            title: "Shop (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-8-shop-2",
            title: "Shop (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-9-drone-1",
            title: "Drone (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-10-drone-2",
            title: "Drone (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-11-gallery-1",
            title: "Gallery (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-12-gallery-2",
            title: "Gallery (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-13-gallery-3",
            title: "Gallery (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-14-survivors-1",
            title: "Survivors (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-15-monster-train-1",
            title: "Monster Train (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-16-monster-train-2",
            title: "Monster Train (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-17-monster-train-3",
            title: "Monster Train (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-18-monster-train-4",
            title: "Monster Train (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-19-passenger-1",
            title: "Passenger (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-20-passenger-2",
            title: "Passenger (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-21-passenger-3",
            title: "Passenger (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-22-passenger-4",
            title: "Passenger (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-23-safe-zone-1",
            title: "Safe Zone (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-24-safe-zone-2",
            title: "Safe Zone (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-25-dungeon-double-booking-1",
            title: "Dungeon Double Booking (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-26-dungeon-double-booking-2",
            title: "Dungeon Double Booking (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-27-dungeon-double-booking-3",
            title: "Dungeon Double Booking (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-28-gacha-1",
            title: "Gacha (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-29-gacha-2",
            title: "Gacha (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-30-seoul-1",
            title: "Seoul (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-31-seoul-2",
            title: "Seoul (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-32-lizardman-1",
            title: "Lizardman (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-33-lizardman-2",
            title: "Lizardman (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-34-artisan-s-touch-1",
            title: "Artisan's Touch (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-35-artisan-s-touch-2",
            title: "Artisan's Touch (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-36-artisan-s-touch-3",
            title: "Artisan's Touch (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-37-artisan-s-touch-4",
            title: "Artisan's Touch (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-38-gallery-star-1",
            title: "Gallery Star (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-39-gallery-star-2",
            title: "Gallery Star (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-40-gallery-star-3",
            title: "Gallery Star (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-41-gallery-star-4",
            title: "Gallery Star (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-42-in-the-fog-1",
            title: "In the Fog (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-43-in-the-fog-2",
            title: "In the Fog (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-44-in-the-fog-3",
            title: "In the Fog (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-45-in-the-fog-4",
            title: "In the Fog (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-46-in-the-fog-5",
            title: "In the Fog (5)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-47-the-situation-in-yeouido-1",
            title: "The Situation in Yeouido (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-48-the-situation-in-yeouido-2",
            title: "The Situation in Yeouido (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-49-the-situation-in-yeouido-3",
            title: "The Situation in Yeouido (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-50-suwon-1",
            title: "Suwon (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-51-suwon-2",
            title: "Suwon (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-52-suwon-3",
            title: "Suwon (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-53-suwon-4",
            title: "Suwon (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-54-dungeon-break-1",
            title: "Dungeon Break (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-55-dungeon-break-2",
            title: "Dungeon Break (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-56-dungeon-break-3",
            title: "Dungeon Break (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-57-new-safe-zone-1",
            title: "New Safe Zone (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-58-new-safe-zone-2",
            title: "New Safe Zone (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-59-new-safe-zone-3",
            title: "New Safe Zone (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-60-elf-1",
            title: "Elf (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-61-voting-preparations-1",
            title: "Voting Preparations (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-62-voting-preparations-2",
            title: "Voting Preparations (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-63-top-instructor-1",
            title: "Top Instructor (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-64-top-instructor-2",
            title: "Top Instructor (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-65-dwarf-1",
            title: "Dwarf (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-66-dwarf-2",
            title: "Dwarf (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-67-dwarf-3",
            title: "Dwarf (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-68-dwarf-4",
            title: "Dwarf (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-69-candidate-no-2-1",
            title: "Candidate No. 2 (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-70-candidate-no-2-2",
            title: "Candidate No. 2 (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-71-candidate-no-2-3",
            title: "Candidate No. 2 (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-72-candidate-no-2-4",
            title: "Candidate No. 2 (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-73-vending-machine-in-the-dungeon-1",
            title: "Vending Machine in the Dungeon (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-74-vending-machine-in-the-dungeon-2",
            title: "Vending Machine in the Dungeon (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-75-vending-machine-in-the-dungeon-3",
            title: "Vending Machine in the Dungeon (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-76-elf-town-1",
            title: "Elf Town (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-77-elf-town-2",
            title: "Elf Town (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-78-elf-town-3",
            title: "Elf Town (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-79-demi-human-town-1",
            title: "Demi-Human Town (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-80-demi-human-town-2",
            title: "Demi-Human Town (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-81-demi-human-town-3",
            title: "Demi-Human Town (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-82-tidying-up-1",
            title: "Tidying Up (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-83-tidying-up-2",
            title: "Tidying Up (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-84-tidying-up-3",
            title: "Tidying Up (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-85-voting-1",
            title: "Voting (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-86-incarnation-1",
            title: "Incarnation (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-87-incarnation-2",
            title: "Incarnation (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-88-incarnation-3",
            title: "Incarnation (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-89-incarnation-4",
            title: "Incarnation (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-90-incarnation-5",
            title: "Incarnation (5)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-91-incarnation-6",
            title: "Incarnation (6)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-92-beastkin-1",
            title: "Beastkin (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-93-beastkin-2",
            title: "Beastkin (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-94-beastkin-3",
            title: "Beastkin (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-95-blizzard-1",
            title: "Blizzard (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-96-blizzard-2",
            title: "Blizzard (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-97-blizzard-3",
            title: "Blizzard (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-98-shopping-1",
            title: "Shopping (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-99-shopping-2",
            title: "Shopping (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-100-shopping-3",
            title: "Shopping (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-101-shopping-4",
            title: "Shopping (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-102-clearing-the-tracks-1",
            title: "Clearing the Tracks (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-103-clearing-the-tracks-2",
            title: "Clearing the Tracks (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-104-music-1",
            title: "Music (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-105-music-2",
            title: "Music (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-106-chase-1",
            title: "Chase (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-107-chase-2",
            title: "Chase (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-108-shooting-range-1",
            title: "Shooting Range (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-109-shooting-range-2",
            title: "Shooting Range (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-110-shooting-range-3",
            title: "Shooting Range (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-111-railway-1",
            title: "Railway (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-112-railway-2",
            title: "Railway (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-113-railway-3",
            title: "Railway (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-114-railway-4",
            title: "Railway (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-115-railway-5",
            title: "Railway (5)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-116-constellations-1",
            title: "Constellations (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-117-constellations-2",
            title: "Constellations (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-118-constellations-3",
            title: "Constellations (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-119-constellations-4",
            title: "Constellations (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-120-murim-1",
            title: "Murim (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-121-murim-2",
            title: "Murim (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-122-murim-3",
            title: "Murim (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-123-kraken-1",
            title: "Kraken (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-124-kraken-2",
            title: "Kraken (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-125-kraken-3",
            title: "Kraken (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-126-kraken-4",
            title: "Kraken (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-127-kraken-5",
            title: "Kraken (5)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-128-kraken-6",
            title: "Kraken (6)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-129-occupation-1",
            title: "Occupation (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-130-occupation-2",
            title: "Occupation (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-131-school-1",
            title: "School (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-132-north-korea-1",
            title: "North Korea (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-133-north-korea-2",
            title: "North Korea (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-134-north-korea-3",
            title: "North Korea (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-135-conditions-1",
            title: "Conditions (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-136-food-tour-1",
            title: "Food Tour (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-137-food-tour-2",
            title: "Food Tour (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-138-food-tour-3",
            title: "Food Tour (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-139-food-tour-4",
            title: "Food Tour (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-140-food-tour-5",
            title: "Food Tour (5)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-141-food-tour-6",
            title: "Food Tour (6)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-142-heavenly-demon-1",
            title: "Heavenly Demon (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-143-heavenly-demon-2",
            title: "Heavenly Demon (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-144-sichuan-1",
            title: "Sichuan (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-145-sichuan-2",
            title: "Sichuan (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-146-sichuan-3",
            title: "Sichuan (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-147-sichuan-4",
            title: "Sichuan (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-148-sichuan-5",
            title: "Sichuan (5)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-149-cooking-1",
            title: "Cooking (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-150-russia-1",
            title: "Russia (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-151-russia-2",
            title: "Russia (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-152-gift-1",
            title: "Gift (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-153-gift-2",
            title: "Gift (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-154-gift-3",
            title: "Gift (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-155-gift-4",
            title: "Gift (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-156-gift-5",
            title: "Gift (5)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-157-gift-6",
            title: "Gift (6)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-158-trans-siberian-train-1",
            title: "Trans-Siberian Train (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-159-trans-siberian-train-2",
            title: "Trans-Siberian Train (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-160-trans-siberian-train-3",
            title: "Trans-Siberian Train (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-161-pursuit-1",
            title: "Pursuit (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-162-pursuit-2",
            title: "Pursuit (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-163-pursuit-3",
            title: "Pursuit (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-164-pursuit-4",
            title: "Pursuit (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-165-moscow-1",
            title: "Moscow (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-166-moscow-2",
            title: "Moscow (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-167-ambush-1",
            title: "Ambush (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-168-ambush-2",
            title: "Ambush (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-169-ambush-3",
            title: "Ambush (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-170-ambush-4",
            title: "Ambush (4)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-171-ambush-5",
            title: "Ambush (5)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-172-ambush-6",
            title: "Ambush (6)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-173-ambush-7",
            title: "Ambush (7)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-174-ambush-8",
            title: "Ambush (8)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-175-a-deal-1",
            title: "A Deal (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-176-a-deal-2",
            title: "A Deal (2)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-177-a-deal-3",
            title: "A Deal (3)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-178-sea-route-1",
            title: "Sea Route (1)",
        },
        {
            sourceUrl:
                "https://penguin-squad.com/novels/i-became-a-conductor-in-the-apocalypse/chapter-179-sea-route-2",
            title: "Sea Route (2)",
        },
    ];

    parser.getChapterUrls(dom).then(
        (chapters) => {
            assert.deepEqual(
                chapters.map(({ sourceUrl, title }) => ({ sourceUrl, title })),
                expected,
            );
            assert.strictEqual(
                chapters[0].isIncludeable,
                true,
                "public chapters are includeable",
            );
            assert.strictEqual(
                chapters[chapters.length - 1].isIncludeable,
                false,
                "premium chapters are excluded",
            );
            done();
        },
        (error) => {
            assert.ok(false, error.message);
            done();
        },
    );
});

QUnit.test("reads chapter JSON from a different script wrapper", (assert) => {
    const done = assert.async();
    const parser = new PenguinSquadParser();
    const dom = document.implementation.createHTMLDocument();
    const base = dom.createElement("base");
    base.href = "https://penguin-squad.com/novels/example";
    dom.head.appendChild(base);

    const script = dom.createElement("script");
    const chapterData =
        "{\"chapters\" : [{\"slug\":\"chapter-1-test\",\"title\":\"Test Chapter\"}]}";
    script.textContent = `window.novelData = ${JSON.stringify(chapterData)};`;
    dom.body.appendChild(script);

    parser.getChapterUrls(dom).then(
        (chapters) => {
            assert.deepEqual(chapters, [
                {
                    sourceUrl:
                        "https://penguin-squad.com/novels/example/chapter-1-test",
                    title: "Test Chapter",
                    isIncludeable: true,
                },
            ]);
            done();
        },
        (error) => {
            assert.ok(false, error.message);
            done();
        },
    );
});
