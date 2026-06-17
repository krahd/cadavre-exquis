// Curated famous opening lines, used both for the "famous first line" picker
// and as the seed's attribution. Drawn from widely-cited literary openings.

const englishFirstLines = [
  {
    text: "Happy families are all alike; every unhappy family is unhappy in its own way.",
    title: "Anna Karenina",
    author: "Leo Tolstoy",
  },
  {
    text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
    title: "Pride and Prejudice",
    author: "Jane Austen",
  },
  {
    text: "Call me Ishmael.",
    title: "Moby-Dick",
    author: "Herman Melville",
  },
  {
    text: "It was the best of times, it was the worst of times.",
    title: "A Tale of Two Cities",
    author: "Charles Dickens",
  },
  {
    text: "It was a bright cold day in April, and the clocks were striking thirteen.",
    title: "Nineteen Eighty-Four",
    author: "George Orwell",
  },
  {
    text: "Mother died today.",
    title: "The Stranger",
    author: "Albert Camus",
  },
  {
    text: "Lolita, light of my life, fire of my loins.",
    title: "Lolita",
    author: "Vladimir Nabokov",
  },
  {
    text: "Many years later, as he faced the firing squad, Colonel Aureliano Buendía was to remember that distant afternoon when his father took him to discover ice.",
    title: "One Hundred Years of Solitude",
    author: "Gabriel García Márquez",
  },
  {
    text: "All this happened, more or less.",
    title: "Slaughterhouse-Five",
    author: "Kurt Vonnegut",
  },
  {
    text: "The sky above the port was the color of television, tuned to a dead channel.",
    title: "Neuromancer",
    author: "William Gibson",
  },
  {
    text: "Riverrun, past Eve and Adam's, from swerve of shore to bend of bay.",
    title: "Finnegans Wake",
    author: "James Joyce",
  },
  {
    text: "Stately, plump Buck Mulligan came from the stairhead, bearing a bowl of lather on which a mirror and a razor lay crossed.",
    title: "Ulysses",
    author: "James Joyce",
  },
  {
    text: "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.",
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
  },
  {
    text: "You don't know about me without you have read a book by the name of The Adventures of Tom Sawyer; but that ain't no matter.",
    title: "Adventures of Huckleberry Finn",
    author: "Mark Twain",
  },
  {
    text: "It was a pleasure to burn.",
    title: "Fahrenheit 451",
    author: "Ray Bradbury",
  },
  {
    text: "Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies a small unregarded yellow sun.",
    title: "The Hitchhiker's Guide to the Galaxy",
    author: "Douglas Adams",
  },
  {
    text: "The Man in Black fled across the desert, and the Gunslinger followed.",
    title: "The Dark Tower: The Gunslinger",
    author: "Stephen King",
  },
  {
    text: "It was the day my grandmother exploded.",
    title: "The Crow Road",
    author: "Iain Banks",
  },
  {
    text: "All children, except one, grow up.",
    title: "Peter Pan",
    author: "J. M. Barrie",
  },
  {
    text: "Once upon a time and a very good time it was there was a moocow coming down along the road.",
    title: "A Portrait of the Artist as a Young Man",
    author: "James Joyce",
  },
  {
    text: "Whether I shall turn out to be the hero of my own life, or whether that station will be held by anybody else, these pages must show.",
    title: "David Copperfield",
    author: "Charles Dickens",
  },
  {
    text: "There was no possibility of taking a walk that day.",
    title: "Jane Eyre",
    author: "Charlotte Brontë",
  },
  {
    text: "Mrs. Dalloway said she would buy the flowers herself.",
    title: "Mrs Dalloway",
    author: "Virginia Woolf",
  },
  {
    text: "It was love at first sight.",
    title: "Catch-22",
    author: "Joseph Heller",
  },
  {
    text: "124 was spiteful.",
    title: "Beloved",
    author: "Toni Morrison",
  },
  {
    text: "The past is a foreign country; they do things differently there.",
    title: "The Go-Between",
    author: "L. P. Hartley",
  },
  {
    text: "We were somewhere around Barstow on the edge of the desert when the drugs began to take hold.",
    title: "Fear and Loathing in Las Vegas",
    author: "Hunter S. Thompson",
  },
  {
    text: "A screaming comes across the sky.",
    title: "Gravity's Rainbow",
    author: "Thomas Pynchon",
  },
  {
    text: "Someone must have slandered Josef K., for one morning, without having done anything truly wrong, he was arrested.",
    title: "The Trial",
    author: "Franz Kafka",
  },
  {
    text: "As Gregor Samsa awoke one morning from uneasy dreams he found himself transformed in his bed into a gigantic insect.",
    title: "The Metamorphosis",
    author: "Franz Kafka",
  },
];

const spanishFirstLines = [
  {
    text: "Todas las familias felices se parecen unas a otras; pero cada familia infeliz tiene un motivo especial para sentirse desgraciada.",
    title: "Ana Karenina",
    author: "León Tolstói",
  },
  {
    text: "Es una verdad universalmente reconocida que un hombre soltero, poseedor de una gran fortuna, necesita esposa.",
    title: "Orgullo y prejuicio",
    author: "Jane Austen",
  },
  {
    text: "Llamadme Ismael.",
    title: "Moby-Dick",
    author: "Herman Melville",
  },
  {
    text: "Era el mejor de los tiempos, era el peor de los tiempos.",
    title: "Historia de dos ciudades",
    author: "Charles Dickens",
  },
  {
    text: "Era un día luminoso y frío de abril y los relojes daban las trece.",
    title: "1984",
    author: "George Orwell",
  },
  {
    text: "Hoy ha muerto mamá.",
    title: "El extranjero",
    author: "Albert Camus",
  },
  {
    text: "Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo.",
    title: "Cien años de soledad",
    author: "Gabriel García Márquez",
  },
  {
    text: "La señora Dalloway dijo que ella misma compraría las flores.",
    title: "La señora Dalloway",
    author: "Virginia Woolf",
  },
  {
    text: "Al despertar Gregor Samsa una mañana, tras un sueño intranquilo, encontróse en su cama convertido en un monstruoso insecto.",
    title: "La metamorfosis",
    author: "Franz Kafka",
  },
  {
    text: "Alguien debía de haber calumniado a Josef K., porque una mañana fue detenido sin haber hecho nada malo.",
    title: "El proceso",
    author: "Franz Kafka",
  },
  {
    text: "El pasado es un país extranjero; allí hacen las cosas de otra manera.",
    title: "El mensajero",
    author: "L. P. Hartley",
  },
  {
    text: "Todos los niños, excepto uno, crecen.",
    title: "Peter Pan",
    author: "J. M. Barrie",
  },
];

export const firstLinesByLang = {
  en: englishFirstLines,
  es: spanishFirstLines,
};

export const firstLines = englishFirstLines;

function normalizeLineLanguage(lang) {
  const base = String(lang || "").toLowerCase().split("-")[0];
  return firstLinesByLang[base] ? base : "en";
}

export function linesForLanguage(lang) {
  return firstLinesByLang[normalizeLineLanguage(lang)];
}

export function randomFirstLine(lang) {
  const lines = linesForLanguage(lang);
  return lines[Math.floor(Math.random() * lines.length)];
}
