import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

loadEnv({ path: ".env.local" });
loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const promptsByGenre = {
  Fantasy: [
    ["The Last Spellwright", "A spellwright discovers that every spell they cast erases one memory from someone they love.", ["magic", "sacrifice"]],
    ["Crown of Ash", "A disgraced heir must win back a kingdom where dragons now choose the ruler.", ["dragons", "royalty"]],
    ["The Forest That Bargains", "A village survives by trading secrets to an ancient forest, until a child offers the wrong one.", ["forest", "secrets"]],
    ["The Moonlit Market", "A night market appears once a year selling impossible things, and one merchant recognizes your character.", ["market", "wonder"]],
    ["Salt and Starlight", "A sailor maps constellations that are actually sleeping gods beneath the sea.", ["sea", "gods"]],
    ["The Borrowed Sword", "A sword that never loses also never belongs to the same hero twice.", ["quest", "artifact"]],
    ["A Door in the Rain", "Every rainstorm opens one door to another realm, but this time something follows your character home.", ["portal", "storm"]],
    ["The Giant's Apology", "A giant arrives at a capital city to apologize for a war nobody remembers.", ["giants", "memory"]],
    ["Bones of the Library", "A library built from the bones of extinct beasts starts whispering new prophecies.", ["library", "prophecy"]],
    ["The Tenth Familiar", "A young mage fails to summon a familiar nine times, then summons a creature that claims to be their future self.", ["mage", "familiar"]],
  ],
  "Science Fiction": [
    ["Signal From the Orchard", "An apple orchard begins receiving radio messages from a probe that has not launched yet.", ["time", "signal"]],
    ["The Sleep Colony", "A colony ship wakes one passenger every century to make one impossible decision.", ["space", "colony"]],
    ["Borrowed Gravity", "A city rents gravity by the hour, and your character can no longer afford to stay grounded.", ["city", "technology"]],
    ["The Last Human Job", "In a fully automated world, one person is hired to do a task nobody will explain.", ["automation", "mystery"]],
    ["Weather on Mars", "The first Martian weather reporter predicts a storm that appears to be alive.", ["mars", "weather"]],
    ["The Memory Firewall", "A cybersecurity analyst discovers a virus that deletes only memories of one person.", ["memory", "cybersecurity"]],
    ["Return to Europa", "A diver returns to Europa's ocean and finds the habitat exactly as it was abandoned, except for the music.", ["europa", "exploration"]],
    ["The Clone Who Stayed", "A clone meant to replace a vanished diplomat refuses the assignment and asks to investigate the original's disappearance.", ["clones", "diplomacy"]],
    ["Low Orbit Garden", "A botanist on an orbital greenhouse grows a plant that responds to lies.", ["orbit", "botany"]],
    ["The Quiet Algorithm", "An algorithm designed to prevent wars begins asking for childhood stories.", ["ai", "peace"]],
  ],
  Romance: [
    ["Second Draft", "Two rival writers are assigned to revise the same love story and recognize their own past in every scene.", ["writers", "second chance"]],
    ["The Wedding Violinist", "A violinist hired for a wedding realizes the best person at the ceremony is the one trying to stop it.", ["wedding", "music"]],
    ["Postcards in Winter", "A small-town mail carrier keeps delivering postcards from someone who left years ago.", ["small town", "letters"]],
    ["The Last Table", "Two strangers repeatedly book the same last table at a crowded restaurant.", ["restaurant", "meet cute"]],
    ["A Map of Us", "An urban planner and a preservationist clash over a neighborhood, then uncover a shared history.", ["city", "rivals"]],
    ["Rain Check", "A missed date due to a storm becomes a yearly tradition between two people who never quite meet.", ["storm", "timing"]],
    ["The Bookshop Key", "A bookshop owner finds a key hidden in a used book with a note addressed to their ex.", ["bookshop", "past love"]],
    ["Three Songs Later", "A radio host takes anonymous song requests from someone who seems to know their heart.", ["radio", "music"]],
    ["The Orchard Agreement", "Two families agree to share an orchard for one season, forcing old enemies to work side by side.", ["family", "farm"]],
    ["Practice Kiss", "Actors cast as lovers in a community play are the only ones who do not believe the chemistry is real.", ["theater", "friends to lovers"]],
  ],
  Mystery: [
    ["The Missing Chapter", "A rare book arrives at a library with a chapter describing a murder that has not happened yet.", ["library", "crime"]],
    ["Blue Umbrella", "Every witness remembers the same blue umbrella, but it never appears on camera.", ["witness", "clue"]],
    ["The Locked Greenhouse", "A botanist is found dead in a locked greenhouse where every plant has been rearranged.", ["locked room", "plants"]],
    ["The Wrong Portrait", "A museum portrait changes overnight to show a stranger wearing the victim's ring.", ["museum", "art"]],
    ["The Silent Bell", "A town bell rings for the first time in fifty years, and one resident vanishes at the sound.", ["small town", "disappearance"]],
    ["Receipts", "A detective follows a trail of receipts that prove the suspect was in two cities at once.", ["detective", "alibi"]],
    ["The Cold Case Choir", "A community choir's old sheet music hides notes about an unsolved disappearance.", ["cold case", "music"]],
    ["House Number Nine", "Every house on the street exists except number nine, which appears only in old police reports.", ["street", "secret"]],
    ["The Broken Watch", "A watch stopped at the wrong time becomes the key to proving everyone lied.", ["time", "evidence"]],
    ["Last Seen Laughing", "A comedian disappears after telling a joke only one person in the audience understands.", ["comedy club", "disappearance"]],
  ],
  Horror: [
    ["The Room That Breathes", "A renter discovers one room in their apartment expands and contracts like lungs while they sleep.", ["apartment", "body horror"]],
    ["Harvest Moon Static", "A rural radio station broadcasts voices from people buried in the fields.", ["radio", "rural"]],
    ["The Smiling House", "A family photo shows their house smiling wider every year.", ["haunting", "family"]],
    ["Under the Ice", "Something trapped beneath a frozen lake knocks in the rhythm of your character's name.", ["lake", "creature"]],
    ["The Good Neighbor", "A neighbor who never leaves their porch knows what everyone will dream before they sleep.", ["neighbor", "dreams"]],
    ["Teeth in the Wallpaper", "A renovation reveals wallpaper printed with teeth that are not illustrations.", ["house", "renovation"]],
    ["The Children's Hour", "At 3:17 each morning, every toy in the house points toward the basement.", ["toys", "basement"]],
    ["Mouth of the Tunnel", "A subway tunnel closes for repairs, but commuters still hear trains arriving below.", ["subway", "urban"]],
    ["The Last Pumpkin", "A pumpkin patch grows one perfect pumpkin that bleeds when carved.", ["autumn", "folk horror"]],
    ["No Reflection After Dawn", "A town wakes to find mirrors no longer show anyone born there.", ["mirrors", "town"]],
  ],
  Literary: [
    ["The Shape of Leaving", "A family gathers to divide an estate and discovers each person remembers a different childhood.", ["family", "memory"]],
    ["Clean Windows", "A window washer sees intimate moments in every apartment but cannot face the silence in their own home.", ["city", "isolation"]],
    ["The Weight of Names", "A teacher nearing retirement writes down every student name they failed to remember.", ["school", "regret"]],
    ["Ordinary Weather", "Two siblings spend a rainy afternoon sorting their mother's belongings and avoiding one question.", ["siblings", "grief"]],
    ["The Unfinished Room", "A contractor returns to the house they abandoned years ago after a personal loss.", ["house", "loss"]],
    ["Parking Lot Lilies", "A grocery store cashier plants flowers in a cracked parking lot and changes the routines of strangers.", ["work", "community"]],
    ["The Quiet Table", "At a diner, a server observes one booth where people always sit before making life-changing decisions.", ["diner", "choice"]],
    ["After the Applause", "A once-celebrated pianist gives lessons to beginners and learns to hear music differently.", ["music", "aging"]],
    ["The Distance Between Floors", "Neighbors in an apartment building know each other only by the sounds through ceilings.", ["neighbors", "connection"]],
    ["Inventory of Small Mercies", "A nurse keeps a private list of tiny kindnesses witnessed during a difficult week.", ["care", "kindness"]],
  ],
  Poetry: [
    ["Instructions for a Storm", "Write a poem that gives practical instructions to a storm as if it were a lost guest.", ["storm", "instruction"]],
    ["Elegy for a Streetlight", "Write an elegy for a streetlight that watched over one corner for decades.", ["elegy", "city"]],
    ["The Taste of Blue", "Write a poem where a color is described through taste, texture, and memory.", ["synesthesia", "memory"]],
    ["Borrowed Hands", "Write about hands inherited from family, labor, art, or grief.", ["family", "body"]],
    ["Small Gods of Morning", "Write a poem that treats ordinary morning objects as minor gods.", ["morning", "objects"]],
    ["Map Without North", "Write a poem about being lost without using the words lost, map, road, or home.", ["constraint", "journey"]],
    ["What the River Keeps", "Write in the voice of a river that remembers everything dropped into it.", ["river", "voice"]],
    ["After the Last Train", "Write a poem set in a station after the final train has gone.", ["station", "absence"]],
    ["Dictionary of Rain", "Invent five kinds of rain and define each through a personal moment.", ["rain", "definitions"]],
    ["The Unsent Line", "Write a poem built around one sentence the speaker cannot send.", ["letters", "silence"]],
  ],
  Memoir: [
    ["First Kitchen", "Write about the first kitchen you remember and what it taught you about care, hunger, or family.", ["family", "food"]],
    ["The Day I Lied", "Write about a lie you told and what it protected, damaged, or revealed.", ["truth", "memory"]],
    ["Object I Kept", "Choose one object you have kept for years and tell the story it still carries.", ["object", "past"]],
    ["A Room I Outgrew", "Write about a room, school, job, or city that no longer fit who you were becoming.", ["change", "place"]],
    ["The Sound of Home", "Describe home through sound instead of sight.", ["home", "sound"]],
    ["Before I Knew Better", "Write about a belief you once held and the moment it began to change.", ["belief", "growth"]],
    ["A Meal After Bad News", "Write about eating, cooking, or refusing food after receiving difficult news.", ["food", "grief"]],
    ["The Person I Avoided", "Write about someone you avoided and what you understand now.", ["relationship", "reflection"]],
    ["Weather I Remember", "Write about a memory where weather shaped the emotional truth of the day.", ["weather", "memory"]],
    ["A Name I Answered To", "Write about a nickname, title, role, or label and how it changed your sense of self.", ["identity", "names"]],
  ],
  Thriller: [
    ["The Elevator Stops", "An elevator stops between floors, and one passenger receives a text from someone inside who is not there.", ["elevator", "suspense"]],
    ["Red File", "A clerk opens a misdelivered file and finds surveillance photos of their own morning.", ["surveillance", "conspiracy"]],
    ["The Wrong Safe House", "A witness arrives at a safe house that has been prepared for someone else.", ["witness", "safe house"]],
    ["Forty Minutes", "A commuter has forty minutes to identify which person on the train is carrying a bomb.", ["train", "countdown"]],
    ["The Emergency Contact", "A stranger lists your character as their emergency contact, then vanishes from the hospital.", ["hospital", "identity"]],
    ["No Signal Road", "A rideshare driver takes a shortcut through a dead zone and realizes the passenger chose it deliberately.", ["rideshare", "dead zone"]],
    ["The Duplicate Passport", "At airport security, your character is shown a valid passport with their face and another name.", ["airport", "identity"]],
    ["Three Locked Phones", "A journalist inherits three locked phones from a source who died before the meeting.", ["journalist", "phones"]],
    ["The Witness Window", "From an office window, an accountant sees a crime no camera recorded.", ["office", "witness"]],
    ["Last Exit", "A highway sign changes to show your character's full name and one instruction: take the last exit.", ["highway", "warning"]],
  ],
  Historical: [
    ["The Printer's Daughter", "In a city on the edge of revolution, a printer's daughter hides a forbidden pamphlet in a wedding invitation.", ["revolution", "printing"]],
    ["Winter at the Telegraph Office", "A telegraph operator receives a message dated ten years in the future during a bitter winter.", ["telegraph", "winter"]],
    ["The Silk Ledger", "A merchant's ledger reveals a hidden network of women moving money and messages across borders.", ["trade", "secrets"]],
    ["Lanterns at the Harbor", "On the night before a fleet departs, a dockworker must decide whether to warn the enemy.", ["harbor", "war"]],
    ["The Midwife's Map", "A midwife records births on a map that becomes evidence in a land dispute.", ["midwife", "community"]],
    ["The Clockmaker's Trial", "A clockmaker is accused of sabotage when every clock in town stops at the same moment.", ["trial", "craft"]],
    ["Letters From the Front Step", "During wartime, a child writes letters to a parent who may never receive them.", ["war", "letters"]],
    ["The Queen's Gardener", "A royal gardener overhears a plot while pruning trees no one else is allowed to touch.", ["court", "garden"]],
    ["Coal Dust Sunday", "A mining town's Sunday routine changes after one miner refuses to go underground.", ["labor", "mining"]],
    ["The Forgotten Exhibition", "A museum assistant in the early days of photography discovers one portrait that should not exist.", ["photography", "museum"]],
  ],
  Comedy: [
    ["The Apology Department", "A company creates a department to apologize professionally, and your character is its worst employee.", ["workplace", "satire"]],
    ["Wedding Plus None", "A guest accidentally RSVPs for twelve imaginary dates and must produce them by Saturday.", ["wedding", "farce"]],
    ["The Haunted Coffee Maker", "A cheap office coffee maker is haunted by a ghost with very strong opinions about meetings.", ["office", "ghost"]],
    ["Neighborhood Watch List", "A neighborhood watch group becomes convinced the new mailbox is a spy.", ["suburb", "absurd"]],
    ["The Accidental Guru", "A misprinted flyer turns your character into the keynote speaker for a wellness retreat.", ["retreat", "mistaken identity"]],
    ["Bring Your Lizard to Work Day", "A typo in an HR email creates the most chaotic day in company history.", ["workplace", "animals"]],
    ["The Silent Book Club", "A silent book club collapses when everyone starts communicating through increasingly aggressive bookmarks.", ["book club", "social comedy"]],
    ["Emergency Clown Training", "A city accidentally enrolls firefighters in clown school and clowns in emergency response training.", ["training", "mix-up"]],
    ["The Soup Competition", "A local soup contest turns into espionage when the trophy is discovered to be solid gold.", ["contest", "small town"]],
    ["One Star Review", "A business owner tries to identify which family member left a devastating one-star review.", ["family", "business"]],
  ],
  Nonfiction: [
    ["The History of One Street", "Research one street in your area and tell its story through maps, names, buildings, and people.", ["local history", "research"]],
    ["A Tool You Use Daily", "Explain the design, history, and hidden complexity of a tool you use every day.", ["design", "objects"]],
    ["The Cost of Convenience", "Investigate one convenient habit and trace its labor, environmental, or social costs.", ["investigation", "society"]],
    ["How a Rumor Travels", "Track how a rumor, myth, or urban legend spreads and why people believe it.", ["media", "belief"]],
    ["A Day in a Public Place", "Observe a library, train station, park, or courthouse for one hour and write what it reveals.", ["observation", "place"]],
    ["The Life of a Recipe", "Follow one recipe across family, culture, migration, or adaptation.", ["food", "culture"]],
    ["An Interview With Work", "Interview someone about their job and focus on the details outsiders rarely see.", ["interview", "labor"]],
    ["The Science of a Small Habit", "Research the science behind a small habit, from nail-biting to morning walks.", ["science", "habits"]],
    ["What the Archive Leaves Out", "Use an archive, photo album, or public record and write about what is missing.", ["archive", "memory"]],
    ["A Biography of an Object", "Write the factual life story of an object from materials to use to disposal.", ["objects", "environment"]],
  ],
};

const prompts = Object.entries(promptsByGenre).flatMap(([genre, entries]) =>
  entries.map(([title, body, tags], index) => ({
    title,
    body,
    genre,
    tags,
    isFeatured: index === 0,
  }))
);

async function main() {
  let created = 0;
  let updated = 0;

  for (const prompt of prompts) {
    const existing = await prisma.prompt.findFirst({
      where: {
        title: prompt.title,
        genre: prompt.genre,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      await prisma.prompt.update({
        where: {
          id: existing.id,
        },
        data: prompt,
      });
      updated += 1;
      continue;
    }

    await prisma.prompt.create({
      data: prompt,
    });
    created += 1;
  }

  console.log(
    `Seeded ${prompts.length} prompts: ${created} created, ${updated} updated.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
