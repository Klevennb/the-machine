export type AuthorAdvice = {
  quote: string;
  author: string;
  source?: string;
};

const AUTHOR_ADVICE: AuthorAdvice[] = [
  {
    quote:
      "You can't wait for inspiration. You have to go after it with a club.",
    author: "Jack London",
  },
  {
    quote: "No tears in the writer, no tears in the reader.",
    author: "Robert Frost",
    source: "The Figure a Poem Makes",
  },
  {
    quote:
      "The difference between the almost right word and the right word is really a large matter.",
    author: "Mark Twain",
    source: "Letter to George Bainton",
  },
  {
    quote:
      "How vain it is to sit down to write when you have not stood up to live.",
    author: "Henry David Thoreau",
    source: "Journal",
  },
  {
    quote: "Never use a long word where a short one will do.",
    author: "George Orwell",
    source: "Politics and the English Language",
  },
  {
    quote:
      "There are only two or three human stories, and they go on repeating themselves.",
    author: "Willa Cather",
    source: "O Pioneers!",
  },
  {
    quote: "Tell all the truth but tell it slant.",
    author: "Emily Dickinson",
    source: "Tell all the truth but tell it slant",
  },
  {
    quote: "True ease in writing comes from art, not chance.",
    author: "Alexander Pope",
    source: "An Essay on Criticism",
  },
  {
    quote: "The sound must seem an echo to the sense.",
    author: "Alexander Pope",
    source: "An Essay on Criticism",
  },
  {
    quote:
      "Reading maketh a full man; conference a ready man; and writing an exact man.",
    author: "Francis Bacon",
    source: "Of Studies",
  },
  {
    quote: "The pen is the tongue of the mind.",
    author: "Miguel de Cervantes",
    source: "Don Quixote",
  },
  {
    quote:
      "Not that the story need be long, but it will take a long while to make it short.",
    author: "Henry David Thoreau",
  },
  {
    quote: "Every word was once a poem.",
    author: "Ralph Waldo Emerson",
    source: "The Poet",
  },
  {
    quote: "The proof of a poet is that his country absorbs him.",
    author: "Walt Whitman",
    source: "Preface to Leaves of Grass",
  },
  {
    quote:
      "The difficulty of literature is not to write, but to write what you mean.",
    author: "Robert Louis Stevenson",
    source: "Virginibus Puerisque",
  },
  {
    quote: "Style is the invariable mark of any master.",
    author: "Robert Louis Stevenson",
    source: "On Some Technical Elements of Style in Literature",
  },
  {
    quote: "Try to be one of the people on whom nothing is lost.",
    author: "Henry James",
    source: "The Art of Fiction",
  },
  {
    quote:
      "What is character but the determination of incident? What is incident but the illustration of character?",
    author: "Henry James",
    source: "The Art of Fiction",
  },
  {
    quote: "It takes a great deal of history to produce a little literature.",
    author: "Henry James",
  },
  {
    quote: "If Art does not enlarge men's sympathies, it does nothing morally.",
    author: "George Eliot",
  },
  {
    quote:
      "Invention, it must be humbly admitted, does not consist in creating out of void.",
    author: "Mary Shelley",
    source: "Introduction to Frankenstein",
  },
  {
    quote:
      "If poetry comes not as naturally as the leaves to a tree it had better not come at all.",
    author: "John Keats",
  },
  {
    quote:
      "Poetry should surprise by a fine excess and not by singularity.",
    author: "John Keats",
  },
  {
    quote:
      "Poetry lifts the veil from the hidden beauty of the world.",
    author: "Percy Bysshe Shelley",
    source: "A Defence of Poetry",
  },
  {
    quote:
      "A poem is the very image of life expressed in its eternal truth.",
    author: "Percy Bysshe Shelley",
    source: "A Defence of Poetry",
  },
  {
    quote: "The best words in the best order.",
    author: "Samuel Taylor Coleridge",
  },
  {
    quote: "Execution is the chariot of genius.",
    author: "William Blake",
  },
  {
    quote:
      "The crooked roads without Improvement are roads of Genius.",
    author: "William Blake",
    source: "The Marriage of Heaven and Hell",
  },
  {
    quote: "I like good strong words that mean something.",
    author: "Louisa May Alcott",
    source: "Little Women",
  },
  {
    quote: "Brevity is the soul of wit.",
    author: "William Shakespeare",
    source: "Hamlet",
  },
  {
    quote: "Suit the action to the word, the word to the action.",
    author: "William Shakespeare",
    source: "Hamlet",
  },
  {
    quote: "Hold, as 'twere, the mirror up to nature.",
    author: "William Shakespeare",
    source: "Hamlet",
  },
  {
    quote: "The truest poetry is the most feigning.",
    author: "William Shakespeare",
    source: "As You Like It",
  },
  {
    quote: "The poet, he nothing affirmeth, and therefore never lieth.",
    author: "Philip Sidney",
    source: "The Defence of Poesy",
  },
  {
    quote: "Proper words in proper places, make the true definition of a style.",
    author: "Jonathan Swift",
  },
  {
    quote:
      "The first rule of good style is that the author should have something to say.",
    author: "Arthur Schopenhauer",
    source: "On Style",
  },
  {
    quote:
      "Obscurity and vagueness of expression are always and everywhere a very bad sign.",
    author: "Arthur Schopenhauer",
    source: "On Style",
  },
  {
    quote:
      "Of all that is written I love only what a person has written with his blood.",
    author: "Friedrich Nietzsche",
    source: "Thus Spoke Zarathustra",
  },
  {
    quote:
      "Be regular and orderly in your life, so that you may be violent and original in your work.",
    author: "Gustave Flaubert",
  },
  {
    quote:
      "Whatever you want to say, there is only one word to express it.",
    author: "Gustave Flaubert",
  },
  {
    quote:
      "Art is not a handicraft, it is the transmission of feeling the artist has experienced.",
    author: "Leo Tolstoy",
    source: "What Is Art?",
  },
  {
    quote: "Precision and brevity are the first virtues of prose.",
    author: "Alexander Pushkin",
  },
  {
    quote: "True originality consists not in a new manner but in a new vision.",
    author: "Edith Wharton",
    source: "The Writing of Fiction",
  },
  {
    quote:
      "The artist must possess the courageous soul that dares and defies.",
    author: "Kate Chopin",
    source: "The Awakening",
  },
  {
    quote:
      "I quote others only in order the better to express myself.",
    author: "Michel de Montaigne",
    source: "Essays",
  },
  {
    quote:
      "I have made this longer than usual because I have not had time to make it shorter.",
    author: "Blaise Pascal",
  },
  {
    quote: "What is well conceived is clearly said.",
    author: "Nicolas Boileau-Despreaux",
    source: "The Art of Poetry",
  },
  {
    quote:
      "Hasten slowly, and without losing heart, put your work twenty times upon the anvil.",
    author: "Nicolas Boileau-Despreaux",
    source: "The Art of Poetry",
  },
  {
    quote: "The secret of being a bore is to tell everything.",
    author: "Voltaire",
  },
  {
    quote:
      "Wherever you meet with a passage which you think is particularly fine, strike it out.",
    author: "Samuel Johnson",
  },
  {
    quote: "Language most shows a man: speak, that I may see thee.",
    author: "Ben Jonson",
    source: "Timber, or Discoveries",
  },
  {
    quote:
      "A good poet's made as well as born.",
    author: "Ben Jonson",
    source: "To the Memory of My Beloved, the Author Mr. William Shakespeare",
  },
  {
    quote:
      "Fiction is truth under circumstances imaginary.",
    author: "Walter Besant",
    source: "The Art of Fiction",
  },
  {
    quote:
      "All art constantly aspires towards the condition of music.",
    author: "Walter Pater",
    source: "The Renaissance",
  },
  {
    quote: "No artist desires to prove anything.",
    author: "Oscar Wilde",
    source: "The Picture of Dorian Gray",
  },
  {
    quote: "All bad poetry springs from genuine feeling.",
    author: "Oscar Wilde",
    source: "The Critic as Artist",
  },
];

function hashDate(value: string) {
  return Array.from(value).reduce(
    (hash, character) => hash + character.charCodeAt(0),
    0
  );
}

export function getDailyAuthorAdvice(date: string) {
  return AUTHOR_ADVICE[hashDate(date) % AUTHOR_ADVICE.length];
}
