/**
 * Arsenal history: a hand-curated reference, NOT a live data feed.
 *
 * Everything here is a well-documented historical fact (club foundation,
 * trophy-winning seasons, record holders, the 2003–04 season). Figures that can
 * still change with new seasons (trophy counts, active players' totals) are
 * deliberately limited to a stated cut-off instead of claiming to be current;
 * the live side of the site (news, matches, table) covers the present.
 * Cross-check anything important with arsenal.com/history.
 */

export const HISTORY_NOTE =
  "Curated reference compiled from the club’s published history. It stops at the cut-offs shown in each section and is not updated automatically; for the current season use the live pages.";

export const HISTORY_SOURCES = [
  { label: "Arsenal.com: History", href: "https://www.arsenal.com/history" },
  { label: "Premier League: Arsenal archive", href: "https://www.premierleague.com/clubs/1/Arsenal/overview" },
];

export const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "club", label: "Club" },
  { id: "trophy", label: "Trophies" },
  { id: "stadium", label: "Stadiums" },
  { id: "people", label: "Managers & people" },
  { id: "record", label: "Records" },
  { id: "women", label: "Women" },
];

/** { year, label?, cat, title, text } sorted ascending by year. */
export const TIMELINE = [
  { year: 1886, cat: "club", title: "The club is founded", text: "Workers at the Royal Arsenal armaments factory in Woolwich, south-east London, form the club as Dial Square. It is renamed Royal Arsenal within weeks." },
  { year: 1893, cat: "club", title: "Woolwich Arsenal join the Football League", text: "The club becomes the first southern club to join the Football League, as Woolwich Arsenal." },
  { year: 1913, cat: "stadium", title: "Move to Highbury", text: "The club leaves Woolwich for north London and drops “Woolwich” from its name, becoming simply Arsenal. Highbury is the home ground until 2006." },
  { year: 1919, cat: "club", title: "Elected to the First Division", text: "Arsenal are voted into the expanded First Division after the First World War and have remained in the top flight ever since." },
  { year: 1925, cat: "people", title: "Herbert Chapman appointed", text: "Chapman becomes manager and builds the side that wins the club’s first major honours in the 1930s." },
  { year: 1930, cat: "trophy", title: "First major trophy: the FA Cup", text: "Arsenal beat Huddersfield Town 2–0 in the FA Cup final." },
  { year: 1931, label: "1930–31", cat: "trophy", title: "First league title", text: "Arsenal win the First Division for the first time." },
  { year: 1933, label: "1932–33", cat: "trophy", title: "Second league title", text: "A second championship under Chapman." },
  { year: 1934, label: "1933–34", cat: "trophy", title: "Third title; Chapman dies", text: "Arsenal win a third title, completed after Chapman’s death in January 1934." },
  { year: 1935, label: "1934–35", cat: "record", title: "Ted Drake scores 42", text: "Ted Drake’s 42 league goals this season remain the club record for a single league season; Arsenal win a third consecutive title." },
  { year: 1936, cat: "trophy", title: "FA Cup", text: "A second FA Cup." },
  { year: 1938, label: "1937–38", cat: "trophy", title: "League title", text: "A fifth league championship." },
  { year: 1948, label: "1947–48", cat: "trophy", title: "League title", text: "A sixth league championship." },
  { year: 1950, cat: "trophy", title: "FA Cup", text: "A third FA Cup." },
  { year: 1953, label: "1952–53", cat: "trophy", title: "League title", text: "A seventh league championship." },
  { year: 1970, label: "1969–70", cat: "trophy", title: "First European trophy", text: "Arsenal win the Inter-Cities Fairs Cup under Bertie Mee." },
  { year: 1971, label: "1970–71", cat: "trophy", title: "The first Double", text: "Arsenal win the league and the FA Cup in the same season, beating Liverpool 2–1 after extra time at Wembley." },
  { year: 1979, cat: "trophy", title: "FA Cup", text: "Arsenal beat Manchester United 3–2 in the FA Cup final." },
  { year: 1986, cat: "people", title: "George Graham appointed", text: "Graham takes over and wins two league titles, two domestic cups and a European trophy in nine years." },
  { year: 1987, label: "1986–87", cat: "trophy", title: "League Cup", text: "Arsenal win the League Cup for the first time." },
  { year: 1989, label: "1988–89", cat: "trophy", title: "Anfield 1989", text: "Arsenal need to win by two goals at Liverpool on the final night of the season; Michael Thomas scores in stoppage time and Arsenal take the title on goals scored." },
  { year: 1991, label: "1990–91", cat: "trophy", title: "League title", text: "A tenth league championship." },
  { year: 1993, label: "1992–93", cat: "trophy", title: "Both domestic cups", text: "Arsenal become the first club to win the FA Cup and League Cup in the same season." },
  { year: 1994, label: "1993–94", cat: "trophy", title: "Cup Winners’ Cup", text: "Arsenal beat Parma 1–0 in the European Cup Winners’ Cup final." },
  { year: 1996, cat: "people", title: "Arsène Wenger appointed", text: "Wenger arrives in north London and stays for 22 years." },
  { year: 1998, label: "1997–98", cat: "trophy", title: "Second Double", text: "Arsenal win the Premier League and the FA Cup in Wenger’s first full season." },
  { year: 2002, label: "2001–02", cat: "trophy", title: "Third Double", text: "Arsenal win the league at Old Trafford and the FA Cup in the same season." },
  { year: 2004, label: "2003–04", cat: "trophy", title: "The Invincibles", text: "Arsenal go through the entire 38-match Premier League season unbeaten. See the Invincibles page." },
  { year: 2005, cat: "trophy", title: "FA Cup on penalties", text: "Arsenal beat Manchester United on penalties after a 0–0 draw in Cardiff." },
  { year: 2006, cat: "stadium", title: "Highbury to the Emirates", text: "Arsenal leave Highbury after 93 years and move to the Emirates Stadium." },
  { year: 2006, cat: "club", title: "Champions League final", text: "Arsenal reach the Champions League final for the first time, losing 2–1 to Barcelona in Paris." },
  { year: 2007, label: "2006–07", cat: "women", title: "Arsenal Ladies win in Europe", text: "Arsenal Ladies win the UEFA Women’s Cup, part of a domestic and European quadruple." },
  { year: 2014, cat: "trophy", title: "FA Cup ends a nine-year wait", text: "Arsenal beat Hull City 3–2 after extra time." },
  { year: 2015, cat: "trophy", title: "FA Cup", text: "Arsenal retain the FA Cup, beating Aston Villa 4–0." },
  { year: 2017, cat: "trophy", title: "FA Cup", text: "Arsenal beat Chelsea 2–1 in the final." },
  { year: 2018, cat: "people", title: "Wenger leaves", text: "Arsène Wenger leaves after 22 years in charge." },
  { year: 2019, cat: "people", title: "Mikel Arteta appointed", text: "Arteta, a former Arsenal captain, becomes head coach in December 2019." },
  { year: 2020, cat: "trophy", title: "FA Cup", text: "Arsenal beat Chelsea 2–1 in the final, Arteta’s first trophy as manager." },
  { year: 2025, cat: "women", title: "Women’s Champions League winners", text: "Arsenal Women beat Barcelona 1–0 in the UEFA Women’s Champions League final in Lisbon." },
];

/** Managers and their eras (honours listed are for their time in charge, cut off as stated). */
export const ERAS = [
  { name: "Herbert Chapman", years: "1925–1934", text: "Modernised the club and won the first FA Cup (1930) and league titles (1930–31, 1932–33) in the 1930s; died in January 1934 while still in charge." },
  { name: "Bertie Mee", years: "1966–1976", text: "Won the Inter-Cities Fairs Cup (1970) and the club’s first Double (1970–71)." },
  { name: "George Graham", years: "1986–1995", text: "Two league titles (1988–89, 1990–91), the League Cup (1987, 1993), the FA Cup (1993) and the Cup Winners’ Cup (1994)." },
  { name: "Arsène Wenger", years: "1996–2018", text: "Three league titles (1997–98, 2001–02, 2003–04) and seven FA Cups; moved the club from Highbury to the Emirates." },
  { name: "Mikel Arteta", years: "2019–", text: "Head coach since December 2019; first trophy was the 2020 FA Cup. Current-season results are on the live pages." },
];

/** Trophy roll, stated with the cut-off it is complete to. */
export const HONOURS = {
  cutoff: "Complete for the seasons listed; later seasons are not tracked here.",
  groups: [
    { name: "League championship (to 2003–04)", years: ["1930–31", "1932–33", "1933–34", "1934–35", "1937–38", "1947–48", "1952–53", "1970–71", "1988–89", "1990–91", "1997–98", "2001–02", "2003–04"] },
    { name: "FA Cup (to 2020)", years: ["1930", "1936", "1950", "1971", "1979", "1993", "1998", "2002", "2003", "2005", "2014", "2015", "2017", "2020"] },
    { name: "League Cup (to 1993)", years: ["1987", "1993"] },
    { name: "European trophies", years: ["Inter-Cities Fairs Cup 1969–70", "Cup Winners’ Cup 1993–94"] },
  ],
};

/** All-time records. `asOf` says when each list was last verified. */
export const RECORDS = [
  {
    id: "scorers",
    title: "All-time top goalscorers (all competitions)",
    asOf: "As of 2024. Active players are not tracked, so check current totals on arsenal.com.",
    rows: [["Thierry Henry", "228"], ["Ian Wright", "185"], ["Cliff Bastin", "178"], ["John Radford", "149"]],
    unit: "goals",
  },
  {
    id: "apps",
    title: "Most appearances (all competitions)",
    asOf: "As of 2024. Active players are not tracked.",
    rows: [["David O’Leary", "722"], ["Tony Adams", "669"], ["Lee Dixon", "619"], ["Nigel Winterburn", "584"]],
    unit: "apps",
  },
  {
    id: "single",
    title: "Individual and team records",
    asOf: "As of 2024.",
    rows: [
      ["Most Premier League goals for Arsenal", "Thierry Henry, 175"],
      ["Most league goals in a season", "Ted Drake, 42 (1934–35)"],
      ["Longest league unbeaten run", "49 matches (May 2003 to October 2004)"],
      ["Points in the unbeaten 2003–04 title season", "90, with 26 wins and 12 draws"],
    ],
  },
];

/** The 2003–04 Premier League season. */
export const INVINCIBLES = {
  season: "2003–04",
  summary: "Arsenal won the Premier League without losing a single match, the only team to go unbeaten through a 38-match Premier League season. The title was clinched away at Tottenham with four games to spare and the trophy was lifted at Highbury on the final day.",
  table: { position: "1st", played: 38, won: 26, drawn: 12, lost: 0, gf: 73, ga: 26, gd: 47, points: 90, margin: "11 points ahead of second-placed Chelsea" },
  manager: "Arsène Wenger",
  captain: "Patrick Vieira",
  keyPlayers: [
    { name: "Thierry Henry", role: "Forward", note: "30 league goals, the Premier League’s top scorer that season." },
    { name: "Dennis Bergkamp", role: "Forward", note: "" },
    { name: "Robert Pires", role: "Midfielder", note: "" },
    { name: "Patrick Vieira", role: "Midfielder", note: "Club captain." },
    { name: "Freddie Ljungberg", role: "Midfielder", note: "" },
    { name: "Gilberto Silva", role: "Midfielder", note: "" },
    { name: "Sol Campbell", role: "Defender", note: "" },
    { name: "Kolo Touré", role: "Defender", note: "" },
    { name: "Ashley Cole", role: "Defender", note: "" },
    { name: "Jens Lehmann", role: "Goalkeeper", note: "Played every league match." },
  ],
  matches: [
    { date: "21 September 2003", title: "Manchester United 0–0 Arsenal", text: "Arsenal hold out at Old Trafford after Ruud van Nistelrooy misses a late penalty; the match is remembered for the angry scenes at the final whistle." },
    { date: "25 April 2004", title: "Tottenham 2–2 Arsenal", text: "A draw at White Hart Lane is enough to secure the title with four matches still to play." },
    { date: "15 May 2004", title: "Arsenal 2–1 Leicester City", text: "The final day at Highbury, where Arsenal complete the season unbeaten and lift the trophy." },
  ],
  note: "The 49-match league unbeaten run began in May 2003 and ended at Old Trafford in October 2004.",
};

export const searchHistory = (q) => {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return [];
  const hay = (e) => `${e.title} ${e.text} ${e.label ?? e.year}`.toLowerCase();
  const hits = TIMELINE.filter((e) => hay(e).includes(t)).map((e) => ({ kind: "timeline", year: e.year, label: e.label ?? String(e.year), title: e.title, text: e.text }));
  if (/invincible|unbeaten|2003|2004|henry|vieira/.test(t)) hits.unshift({ kind: "invincibles", year: 2004, label: "2003–04", title: "The Invincibles", text: INVINCIBLES.summary });
  return hits.slice(0, 6);
};
