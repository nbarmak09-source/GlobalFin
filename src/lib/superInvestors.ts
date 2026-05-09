export interface SuperInvestor {
  slug: string
  name: string
  fund: string
  cik: string
  strategy: string
  /** Public HTTPS image; empty string falls back to initials in UI (no stable Commons portrait). */
  imageUrl: string
  description: string
}

export const SUPER_INVESTORS: SuperInvestor[] = [
  {
    slug: "warren-buffett",
    name: "Warren Buffett",
    fund: "Berkshire Hathaway Inc",
    cik: "0001067983",
    strategy: "Value",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d4/Warren_Buffett_at_the_2015_SelectUSA_Investment_Summit_%28cropped%29.jpg",
    description:
      "Chairman of Berkshire Hathaway. One of the most successful investors of all time, known for long-term value investing.",
  },
  {
    slug: "bill-ackman",
    name: "Bill Ackman",
    fund: "Pershing Square Capital Management",
    cik: "0001336528",
    strategy: "Activist",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d8/Bill_Ackman_%2826410186110%29_%28cropped%29.jpg",
    description:
      "Founder of Pershing Square. Known for high-conviction concentrated positions and activist campaigns.",
  },
  {
    slug: "joel-greenblatt",
    name: "Joel Greenblatt",
    fund: "Gotham Asset Management",
    cik: "0001326428",
    strategy: "Value",
    imageUrl: "",
    description:
      "Author of The Little Book That Beats the Market. Pioneer of quantitative value investing.",
  },
  {
    slug: "david-einhorn",
    name: "David Einhorn",
    fund: "Greenlight Capital",
    cik: "0001079114",
    strategy: "Long/Short",
    imageUrl: "",
    description:
      "Founder of Greenlight Capital. Known for detailed short-selling research and value-oriented longs.",
  },
  {
    slug: "dan-loeb",
    name: "Dan Loeb",
    fund: "Third Point LLC",
    cik: "0001040273",
    strategy: "Activist",
    imageUrl: "",
    description:
      "Founder of Third Point LLC. Known for activist letters and event-driven equity investments.",
  },
  {
    slug: "michael-burry",
    name: "Michael Burry",
    fund: "Scion Asset Management",
    cik: "0001649339",
    strategy: "Value",
    imageUrl: "",
    description:
      "Founder of Scion Asset Management. Famous for his Big Short bet against subprime mortgages in 2008.",
  },
  {
    slug: "david-tepper",
    name: "David Tepper",
    fund: "Appaloosa Management",
    cik: "0000915191",
    strategy: "Long/Short",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3d/David_Tepper_01.jpg",
    description:
      "Founder of Appaloosa Management. Known for distressed debt and macro-driven equity investments.",
  },
  {
    slug: "seth-klarman",
    name: "Seth Klarman",
    fund: "Baupost Group",
    cik: "0000895655",
    strategy: "Value",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b8/Seth_Klarman_at_147th_Preakness_Stakes.jpg",
    description:
      "Founder of Baupost Group. Author of Margin of Safety and regarded as one of the greatest value investors.",
  },
]
