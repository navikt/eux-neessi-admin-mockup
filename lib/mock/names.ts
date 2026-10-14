/** Made-up Norwegian names. Combinations are random and do not refer to real people. */

export const FIRST_NAMES = [
  "Kari", "Ola", "Ingrid", "Lars", "Solveig", "Erik", "Marte", "Henrik", "Sigrid", "Jonas",
  "Ida", "Magnus", "Nora", "Sindre", "Tuva", "Eirik", "Hedda", "Vegar", "Silje", "Torbjørn",
  "Maja", "Anders", "Thea", "Øystein", "Live", "Petter", "Ragnhild", "Kristian", "Astrid", "Håkon",
  "Ane", "Sverre", "Frida", "Mats", "Guro", "Bjørnar", "Linnea", "Aksel", "Mari", "Jørgen",
];

export const LAST_NAMES = [
  "Fjellheim", "Strandvik", "Bergset", "Lysaker", "Nordbø", "Haugland", "Vikanes", "Myrvold",
  "Solberget", "Tangen", "Elvestad", "Rognlien", "Skarsvåg", "Dalheim", "Kvalnes", "Brekkestø",
  "Østerås", "Lien", "Furuheim", "Sandnes", "Granli", "Hovde", "Aasland", "Fosshaug",
  "Kjelsrud", "Moberg", "Rustad", "Teigen", "Vatnedal", "Blikstad",
];

export const FOREIGN_NAMES: Record<string, { first: string[]; last: string[] }> = {
  SE: { first: ["Elin", "Johan", "Linnéa", "Oskar"], last: ["Lindqvist", "Bergström", "Åkesson", "Nyberg"] },
  DK: { first: ["Mette", "Rasmus", "Signe", "Mikkel"], last: ["Kjærgaard", "Holm", "Lund", "Thygesen"] },
  PL: { first: ["Agnieszka", "Tomasz", "Katarzyna", "Piotr"], last: ["Wiśniewski", "Kowalczyk", "Zielińska", "Nowicki"] },
  DE: { first: ["Anja", "Matthias", "Sabine", "Jörg"], last: ["Hoffmann", "Brandt", "Krüger", "Lehmann"] },
  LT: { first: ["Rūta", "Mindaugas", "Asta", "Darius"], last: ["Kazlauskas", "Petrauskienė", "Žukauskas", "Vaitkus"] },
  ES: { first: ["Lucía", "Javier", "Carmen", "Diego"], last: ["Navarro", "Romero", "Iglesias", "Ortega"] },
  default: { first: ["Elena", "Marco", "Anna", "Luca"], last: ["Moretti", "Varga", "Dimitrova", "Novak"] },
};
