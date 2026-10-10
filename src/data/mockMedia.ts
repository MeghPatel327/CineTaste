import { CarouselSlide, MediaItem } from "@/types/media";

export const HERO_CAROUSEL_ITEMS: CarouselSlide[] = [
  {
    id: "hero-1",
    title: "Dune: Part Two",
    tagline: "Long live the fighters.",
    overview:
      "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.",
    backdropUrl:
      "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
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
      "https://image.tmdb.org/t/p/w1280/sAtoMqDVhNDQBc3QJL3RF6hlhGq.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
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
      "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK1DVfjko.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
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
      "https://image.tmdb.org/t/p/w1280/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
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
      "https://image.tmdb.org/t/p/w1280/yIZ1xendyqKvY3FGeeUYUd5X9Mm.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
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
      "https://image.tmdb.org/t/p/w1280/lBLMnIFCpXMYIhWAfQD3s6mHFVP.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/lFGgqGMOcsKeaKpsMmt9siJ1OXe.jpg",
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
      "https://image.tmdb.org/t/p/w1280/b0PlSFdDwbyFAJlB1qpUHD7tEQs.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
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
      "https://image.tmdb.org/t/p/w1280/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
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
      "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
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
      "https://image.tmdb.org/t/p/w1280/lBLMnIFCpXMYIhWAfQD3s6mHFVP.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/lFGgqGMOcsKeaKpsMmt9siJ1OXe.jpg",
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
      "https://image.tmdb.org/t/p/w1280/sAtoMqDVhNDQBc3QJL3RF6hlhGq.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg",
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
      "https://image.tmdb.org/t/p/w1280/b8lcLiwOdlEsMKCsNZPnVBzOYhC.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgmX.jpg",
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
      "https://image.tmdb.org/t/p/w1280/geGpMpTXPf9hBqOlGnmHFikWYkN.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/uWkSDmgg9bkmBhJCpROuWH5ZiQh.jpg",
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
      "https://image.tmdb.org/t/p/w1280/3cb66Jh7i8HisKBWfwdTRJxMi4n.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/btbRB7BrD887j5NrvjxceRDmaot.jpg",
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
      "https://image.tmdb.org/t/p/w1280/4jcBO0s9RviGCyZvIQMGwgbzBSY.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/d3qcpfNwbAMCNqWDHzPQsUYiEgS.jpg",
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
      "https://image.tmdb.org/t/p/w1280/hMx1RdpCk3jLhaDNfGdOJzMBJpB.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/l6GABkBLEJHCQLwMKiaK12hBaYP.jpg",
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
      "https://image.tmdb.org/t/p/w1280/fDlLVMQMJgpdiCOb3IHsFjJFjxn.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/rkGZVxhyx46EYJbSns3N0qAnJWo.jpg",
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
      "https://image.tmdb.org/t/p/w1280/5OoL31BhDxCdGqW1FkWKuzxALjL.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/eJFzSVeMou0DXYobR2XSwNnDZhL.jpg",
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
      "https://image.tmdb.org/t/p/w1280/ruHMdSoOGBjATmyGGJEzdqiy42O.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/sS7PFB4MWODFxGqu1yiu7OMxqMY.jpg",
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
      "https://image.tmdb.org/t/p/w1280/lGTkvGmj27eKy1yR8K94MV21Npm.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/hTv0prMKAMhqqyWxiGLFtlMqGVk.jpg",
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
      "https://image.tmdb.org/t/p/w1280/2N8dbOYH8NRoHSlUjF8wQq3K9Z8.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/xWH0gEOMakNKM0cBDjQNL8rV0R3.jpg",
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
      "https://image.tmdb.org/t/p/w1280/rMeWmkh5VtcDmu3lBOq5GJa6BZY.jpg",
    posterUrl:
      "https://image.tmdb.org/t/p/w500/y9JSlBjPWauEbux5uabNjoyBIkS.jpg",
    releaseYear: 2021,
    rating: 7.7,
    genres: ["Drama", "Mystery", "Sci-Fi"],
    runtime: "Limited Series",
    mediaType: "tv",
    badge: "DOLBY VISION",
    recommendationReason: "Lyrical, hopeful post-pandemic vision with breathtaking art direction",
  },
];

export const POPULAR_MOVIES_ITEMS: MediaItem[] = [
  {
    id: "pm-1",
    title: "Dune: Part Two",
    overview: "Paul Atreides unites with Chani and the Fremen to lead the rebellion.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    releaseYear: 2024,
    rating: 8.8,
    genres: ["Sci-Fi", "Adventure", "Drama"],
    runtime: "2h 46m",
    mediaType: "movie",
    badge: "IMAX",
  },
  {
    id: "pm-2",
    title: "Oppenheimer",
    overview: "The story of J. Robert Oppenheimer's role in the development of the atomic bomb.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
    releaseYear: 2023,
    rating: 8.9,
    genres: ["Biography", "Drama", "History"],
    runtime: "3h 00m",
    mediaType: "movie",
    badge: "IMAX",
  },
  {
    id: "pm-3",
    title: "The Batman",
    overview: "Batman ventures into Gotham City's underworld when a sadistic killer leaves behind cryptic clues.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/b0PlSFdDwbyFAJlB1qpUHD7tEQs.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    releaseYear: 2022,
    rating: 7.9,
    genres: ["Action", "Crime", "Drama"],
    runtime: "2h 56m",
    mediaType: "movie",
    badge: "4K UHD",
  },
  {
    id: "pm-4",
    title: "Interstellar",
    overview: "A team of explorers travels through a wormhole in space in an attempt to ensure humanity's survival.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK1DVfjko.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    releaseYear: 2014,
    rating: 8.7,
    genres: ["Sci-Fi", "Drama", "Adventure"],
    runtime: "2h 49m",
    mediaType: "movie",
    badge: "HDR10+",
  },
  {
    id: "pm-5",
    title: "Arrival",
    overview: "A linguist works with the military to communicate with alien lifeforms.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/yIZ1xendyqKvY3FGeeUYUd5X9Mm.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
    releaseYear: 2016,
    rating: 8.2,
    genres: ["Drama", "Mystery", "Sci-Fi"],
    runtime: "1h 56m",
    mediaType: "movie",
    badge: "4K UHD",
  },
];

export const POPULAR_SERIES_ITEMS: MediaItem[] = [
  {
    id: "ps-1",
    title: "Severance",
    overview: "Mark leads a team of office workers whose memories have been surgically divided.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/lBLMnIFCpXMYIhWAfQD3s6mHFVP.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/lFGgqGMOcsKeaKpsMmt9siJ1OXe.jpg",
    releaseYear: 2022,
    rating: 8.7,
    genres: ["Drama", "Mystery", "Sci-Fi"],
    runtime: "Season 1",
    mediaType: "tv",
    badge: "DOLBY VISION",
  },
  {
    id: "ps-2",
    title: "Arcane",
    overview: "Set in Piltover and Zaun, following the origins of two iconic champions.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/rkB4LyZHo1NHXFEDHl9vSD9r1lI.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/fqldf2t8ztc9aiwn3k6mlX3tvRT.jpg",
    releaseYear: 2024,
    rating: 9.0,
    genres: ["Animation", "Action", "Sci-Fi"],
    runtime: "Season 2",
    mediaType: "tv",
    badge: "HDR10+",
  },
  {
    id: "ps-3",
    title: "Shōgun",
    overview: "Lord Toranaga battles against his rivals in feudal Japan as an English navigator washes ashore.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/b8lcLiwOdlEsMKCsNZPnVBzOYhC.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/7O4iVfOMQmdCSxhOg1WnzG1AgmX.jpg",
    releaseYear: 2024,
    rating: 8.7,
    genres: ["Drama", "History", "War"],
    runtime: "Limited Series",
    mediaType: "tv",
    badge: "HDR10+",
  },
  {
    id: "ps-4",
    title: "Station Eleven",
    overview: "A post-apocalyptic saga spanning multiple timelines following survivors rebuilding humanity.",
    backdropUrl: "https://image.tmdb.org/t/p/w1280/rMeWmkh5VtcDmu3lBOq5GJa6BZY.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w500/y9JSlBjPWauEbux5uabNjoyBIkS.jpg",
    releaseYear: 2021,
    rating: 7.7,
    genres: ["Drama", "Mystery", "Sci-Fi"],
    runtime: "Limited Series",
    mediaType: "tv",
    badge: "DOLBY VISION",
  },
];
