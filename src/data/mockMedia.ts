import { CarouselSlide, MediaItem } from "@/types/media";

export const HERO_CAROUSEL_ITEMS: CarouselSlide[] = [
  {
    id: "hero-1",
    title: "Dune: Part Two",
    tagline: "Long live the fighters.",
    overview:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.",
    backdropUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=2000&q=85",
    posterUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80",
    releaseYear: 2024,
    rating: 8.8,
    genres: ["Sci-Fi", "Adventure", "Drama"],
    runtime: "2h 46m",
    mediaType: "movie",
    badge: "IMAX",
    audio: "Dolby Atmos",
    spotlightCategory: "Editor's Spotlight",
  },
  {
    id: "hero-2",
    title: "Blade Runner 2049",
    tagline: "The key to the future is finally unearthed.",
    overview:
      "Thirty years after the events of the first film, a new Blade Runner, LAPD Officer K, unearths a long-buried secret that has the potential to plunge what's left of society into chaos. K's discovery leads him on a quest to find Rick Deckard, a former LAPD Blade Runner who has been missing.",
    backdropUrl:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2000&q=85",
    posterUrl:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80",
    releaseYear: 2017,
    rating: 8.5,
    genres: ["Sci-Fi", "Mystery", "Thriller"],
    runtime: "2h 44m",
    mediaType: "movie",
    badge: "4K UHD",
    audio: "Dolby Atmos",
    spotlightCategory: "Atmospheric Masterpiece",
  },
  {
    id: "hero-3",
    title: "Interstellar",
    tagline: "Mankind was born on Earth. It was never meant to die here.",
    overview:
      "The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage across space and time.",
    backdropUrl:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2000&q=85",
    posterUrl:
      "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80",
    releaseYear: 2014,
    rating: 8.7,
    genres: ["Sci-Fi", "Drama", "Adventure"],
    runtime: "2h 49m",
    mediaType: "movie",
    badge: "HDR10+",
    audio: "Dolby Atmos",
    spotlightCategory: "Cinephile Choice",
  },
  {
    id: "hero-4",
    title: "Oppenheimer",
    tagline: "The world forever changes.",
    overview:
      "The story of J. Robert Oppenheimer's role in the development of the atomic bomb during World War II, charting the brilliant minds at Los Alamos and the ensuing political and moral tempest that consumed his legacy.",
    backdropUrl:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=2000&q=85",
    posterUrl:
      "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=600&q=80",
    releaseYear: 2023,
    rating: 8.9,
    genres: ["Biography", "Drama", "History"],
    runtime: "3h 00m",
    mediaType: "movie",
    badge: "IMAX",
    audio: "Dolby Atmos",
    spotlightCategory: "Academy Award Winner",
  },
  {
    id: "hero-5",
    title: "Arrival",
    tagline: "Why are they here?",
    overview:
      "Taking place after alien crafts land around the world, an expert linguist is recruited by the military to determine whether they come in peace or are a threat. As humankind teeters on the verge of global war, she races against time for answers.",
    backdropUrl:
      "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=2000&q=85",
    posterUrl:
      "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=600&q=80",
    releaseYear: 2016,
    rating: 8.2,
    genres: ["Drama", "Mystery", "Sci-Fi"],
    runtime: "1h 56m",
    mediaType: "movie",
    badge: "4K UHD",
    audio: "5.1 Surround",
    spotlightCategory: "Deep Narrative",
  },
  {
    id: "hero-6",
    title: "Severance",
    tagline: "Please do not attempt to adjust your mind.",
    overview:
      "Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives. When a mysterious colleague appears outside of work, it begins a journey to discover the truth about their jobs.",
    backdropUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2000&q=85",
    posterUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80",
    releaseYear: 2022,
    rating: 8.7,
    genres: ["Drama", "Mystery", "Sci-Fi"],
    runtime: "Season 1",
    mediaType: "tv",
    badge: "DOLBY VISION",
    audio: "Dolby Atmos",
    spotlightCategory: "Trending Series",
  },
  {
    id: "hero-7",
    title: "The Batman",
    tagline: "Unmask the truth.",
    overview:
      "In his second year of fighting crime, Batman uncovers corruption in Gotham City that connects to his own family while facing a serial killer known as the Riddler, descending into the dark underworld of the criminal elite.",
    backdropUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=2000&q=85",
    posterUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
    releaseYear: 2022,
    rating: 7.9,
    genres: ["Action", "Crime", "Drama"],
    runtime: "2h 56m",
    mediaType: "movie",
    badge: "4K UHD",
    audio: "Dolby Atmos",
    spotlightCategory: "Neo-Noir Spotlight",
  },
  {
    id: "hero-8",
    title: "Arcane",
    tagline: "Every legend has a beginning.",
    overview:
      "Set in the utopian region of Piltover and the oppressed underground of Zaun, the story follows the origins of two iconic League champions-and the power that will tear them apart in a stunning visual synthesis of animation.",
    backdropUrl:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=2000&q=85",
    posterUrl:
      "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80",
    releaseYear: 2024,
    rating: 9.0,
    genres: ["Animation", "Action", "Sci-Fi"],
    runtime: "Season 2",
    mediaType: "tv",
    badge: "HDR10+",
    audio: "Dolby Atmos",
    spotlightCategory: "Universal Acclaim",
  },
];

export const CONTINUE_WATCHING_ITEMS: MediaItem[] = [
  {
    id: "cw-1",
    title: "Dune: Part Two",
    overview: "Paul Atreides unites with Chani and the Fremen to lead the rebellion.",
    backdropUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2024,
    rating: 8.8,
    genres: ["Sci-Fi", "Adventure"],
    runtime: "2h 46m",
    mediaType: "movie",
    badge: "IMAX",
    watchProgress: 68,
  },
  {
    id: "cw-2",
    title: "Severance",
    overview: "Episode 7: Defiant Jazz. The Lumon innies orchestrate a daring breach.",
    backdropUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2022,
    rating: 8.7,
    genres: ["Mystery", "Sci-Fi"],
    runtime: "Episode 7",
    mediaType: "tv",
    badge: "DOLBY VISION",
    watchProgress: 42,
  },
  {
    id: "cw-3",
    title: "Blade Runner 2049",
    overview: "Officer K navigates the desolate ruins of Las Vegas to find Deckard.",
    backdropUrl:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2017,
    rating: 8.5,
    genres: ["Sci-Fi", "Mystery"],
    runtime: "2h 44m",
    mediaType: "movie",
    badge: "4K UHD",
    watchProgress: 85,
  },
  {
    id: "cw-4",
    title: "Shōgun",
    overview: "Lord Toranaga battles against his treacherous rivals in feudal Japan.",
    backdropUrl:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2024,
    rating: 8.7,
    genres: ["Drama", "History", "War"],
    runtime: "Episode 4",
    mediaType: "tv",
    badge: "HDR10+",
    watchProgress: 24,
  },
];

export const BECAUSE_YOU_LOVED_ITEMS: MediaItem[] = [
  {
    id: "byl-1",
    title: "Children of Men",
    overview:
      "In 2027, in a chaotic world in which women have become infertile, a former activist agrees to help transport a miraculously pregnant woman to a sanctuary at sea.",
    backdropUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2006,
    rating: 8.0,
    genres: ["Sci-Fi", "Thriller"],
    runtime: "1h 49m",
    mediaType: "movie",
    badge: "4K UHD",
    recommendationReason: "Directorial precision & high tension like Blade Runner 2049",
  },
  {
    id: "byl-2",
    title: "Ex Machina",
    overview:
      "A young programmer is selected to participate in a ground-breaking experiment in synthetic intelligence by evaluating the human qualities of a highly advanced humanoid A.I.",
    backdropUrl:
      "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1507499739999-097706ad8914?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2014,
    rating: 7.7,
    genres: ["Sci-Fi", "Drama", "Mystery"],
    runtime: "1h 48m",
    mediaType: "movie",
    badge: "4K UHD",
    recommendationReason: "Philosophical sci-fi AI themes",
  },
  {
    id: "byl-3",
    title: "Annihilation",
    overview:
      "A biologist signs up for a dangerous, secret expedition into an environmental disaster zone where the laws of nature do not apply.",
    backdropUrl:
      "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2018,
    rating: 7.0,
    genres: ["Adventure", "Horror", "Sci-Fi"],
    runtime: "1h 55m",
    mediaType: "movie",
    badge: "HDR10+",
    recommendationReason: "Surreal extraterrestrial biome & mystery",
  },
  {
    id: "byl-4",
    title: "Solaris",
    overview:
      "A psychologist is sent to a space station orbiting a mysterious planet to discover what has caused the crew to go insane.",
    backdropUrl:
      "https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1447433589675-4aaa569f3e05?auto=format&fit=crop&w=500&q=80",
    releaseYear: 1972,
    rating: 8.0,
    genres: ["Sci-Fi", "Mystery"],
    runtime: "2h 47m",
    mediaType: "movie",
    recommendationReason: "Classic contemplative existential sci-fi",
  },
  {
    id: "byl-5",
    title: "Gattaca",
    overview:
      "A genetically inferior man assumes the identity of a superior one in order to pursue his lifelong dream of space travel.",
    backdropUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=500&q=80",
    releaseYear: 1997,
    rating: 7.8,
    genres: ["Sci-Fi", "Drama", "Thriller"],
    runtime: "1h 46m",
    mediaType: "movie",
    badge: "4K UHD",
    recommendationReason: "Distopian aesthetic & cerebral score",
  },
];

export const HIDDEN_GEMS_ITEMS: MediaItem[] = [
  {
    id: "gem-1",
    title: "Coherence",
    overview:
      "Strange things begin to happen when a group of eight friends gather for a dinner party on the night a celestial comet passes overhead.",
    backdropUrl:
      "https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1531306728370-e2ebd9d7bb99?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2013,
    rating: 7.3,
    genres: ["Mystery", "Sci-Fi", "Thriller"],
    runtime: "1h 29m",
    mediaType: "movie",
    recommendationReason: "98% taste match in high-concept puzzle sci-fi",
  },
  {
    id: "gem-2",
    title: "Dark City",
    overview:
      "A man struggles with memories of his past in a world without sunlight, run by mysterious beings who stop time and alter reality.",
    backdropUrl:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=500&q=80",
    releaseYear: 1998,
    rating: 7.6,
    genres: ["Mystery", "Sci-Fi", "Thriller"],
    runtime: "1h 40m",
    mediaType: "movie",
    badge: "4K UHD",
    recommendationReason: "Pre-Matrix neo-noir cyberpunk classic",
  },
  {
    id: "gem-3",
    title: "The Vast of Night",
    overview:
      "In the twilight of the 1950s, a switchboard operator and a radio DJ discover a strange audio frequency that could change their small town and the future forever.",
    backdropUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2019,
    rating: 6.8,
    genres: ["Drama", "Mystery", "Sci-Fi"],
    runtime: "1h 31m",
    mediaType: "movie",
    badge: "4K UHD",
    recommendationReason: "Pioneering camera long-takes and eerie retro suspense",
  },
  {
    id: "gem-4",
    title: "Primer",
    overview:
      "Four friends and entrepreneurial inventors unwittingly build a device that allows for rudimentary time looping.",
    backdropUrl:
      "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2004,
    rating: 6.9,
    genres: ["Drama", "Sci-Fi", "Thriller"],
    runtime: "1h 17m",
    mediaType: "movie",
    recommendationReason: "The ultimate complex hard-sci-fi indie achievement",
  },
  {
    id: "gem-5",
    title: "Station Eleven",
    overview:
      "A post-apocalyptic saga spanning multiple timelines, telling the stories of survivors of a devastating flu as they attempt to rebuild and reimagine civilization.",
    backdropUrl:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=80",
    releaseYear: 2021,
    rating: 7.7,
    genres: ["Drama", "Mystery", "Sci-Fi"],
    runtime: "Limited Series",
    mediaType: "tv",
    badge: "DOLBY VISION",
    recommendationReason: "Lyrical, hopeful post-pandemic vision with breathtaking art direction",
  },
];
