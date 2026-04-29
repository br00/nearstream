export type Locale = "en" | "it";

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language || "";
  return lang.startsWith("it") ? "it" : "en";
}

export const t = {
  en: {
    nav: "Nearstream",
    heroTitle: "A quieter way to share\nwith people you actually know.",
    heroBody:
      "I stepped off social media. I’m building something personal — a place to share daily life with close friends. No algorithm. No public. Just us.",
    heroEmail: "Leave your email if you want to follow along.",
    inputPlaceholder: "your@email.com",
    send: "Send",
    received: "Received. I’ll be in touch.",
    errorInvalid: "That email doesn’t look right.",
    errorGeneric: "Something went wrong. Please try again.",
    // Below the fold
    whatLabel: "What is this",
    whatP1:
      "Social networks took something simple — sharing with friends — and turned it into a performance for strangers.",
    whatP2:
      "Nearstream is the opposite. Your own site, your own stream. Your friends see it in a reader that shows everything in order, nothing more.",
    whatP3: "No likes. No views. No strangers. Just a quiet stream of life from people you chose.",
    // How it works (for devs)
    howLabel: "Under the hood",
    howSite: "Your site",
    howSiteDesc:
      "Each person owns their domain. Post what you want — photos, writing, daily life, permanent work. Built with Astro or Next.js + Sanity CMS.",
    howFeed: "RSS feed",
    howFeedDesc:
      "Your site auto-generates an RSS feed. A standard format since 1999 — no platform, no lock-in, anyone can subscribe.",
    howReader: "The reader",
    howReaderDesc:
      "A custom Next.js app fetches your friends’ feeds, merges them, sorts by time. Your layout. Your rules. The core of the project.",
    // Philosophy
    quote:
      "“A small audience of people you actually care about is more meaningful than a large audience of strangers.”",
    quoteBody:
      "The web was personal once. It can be again.",
    // Bottom
    bottomBody: "This is early. I’m building in the open.\nDrop your email to follow along.",
    // Curious link
    curious: "Curious how it works?",
    // About page
    aboutExpLabel: "The experience",
    aboutExpP1:
      "You open the reader. You see your friends’ posts from today — photos, a few words, a sketch, whatever they felt like sharing.",
    aboutExpP2:
      "Everything is sorted by time. No recommendations, no suggested content, no ads. Just a quiet scroll through the day of people you actually know.",
    aboutExpP3:
      "You close it when you’re done. Nothing tries to pull you back.",
    aboutPrinLabel: "The principles",
    aboutPrin1: "You own your domain. Your content lives on your site, not on a platform.",
    aboutPrin2: "Your audience is people you chose. Not followers — friends.",
    aboutPrin3: "No likes, no views, no metrics. Sharing without performing.",
    aboutPrin4: "No algorithm decides what you see. Time is the only order.",
    aboutStackLabel: "The stack",
    aboutStackNote: "For the technically curious.",
    aboutStackP:
      "Each person runs their own site on their own domain. The site publishes an RSS feed — a standard format since 1999. A custom reader fetches all your friends’ feeds, merges them, and sorts by date. That’s the whole architecture.",
  },
  it: {
    nav: "Nearstream",
    heroTitle: "Un modo più tranquillo di condividere\ncon le persone che conosci davvero.",
    heroBody:
      "Ho lasciato i social. Sto costruendo qualcosa di personale — un posto dove condividere la vita di tutti i giorni con gli amici più stretti. Niente algoritmo. Niente pubblico. Solo noi.",
    heroEmail: "Lascia la tua email se vuoi seguire il progetto.",
    inputPlaceholder: "la-tua@email.com",
    send: "Invia",
    received: "Ricevuto. Ti farò sapere.",
    errorInvalid: "Quest’email non sembra giusta.",
    errorGeneric: "Qualcosa è andato storto. Riprova.",
    whatLabel: "Cos’è",
    whatP1:
      "I social network hanno preso una cosa semplice — condividere con gli amici — e l’hanno trasformata in una performance per sconosciuti.",
    whatP2:
      "Nearstream è il contrario. Il tuo sito, il tuo stream. I tuoi amici lo vedono in un reader che mostra tutto in ordine, nient’altro.",
    whatP3: "Niente like. Niente visualizzazioni. Niente sconosciuti. Solo un flusso tranquillo di vita dalle persone che hai scelto.",
    howLabel: "Come funziona",
    howSite: "Il tuo sito",
    howSiteDesc:
      "Ognuno ha il proprio dominio. Pubblica quello che vuoi — foto, testi, vita quotidiana, lavori permanenti. Costruito con Astro o Next.js + Sanity CMS.",
    howFeed: "Feed RSS",
    howFeedDesc:
      "Il tuo sito genera automaticamente un feed RSS. Un formato standard dal 1999 — nessuna piattaforma, nessun lock-in.",
    howReader: "Il reader",
    howReaderDesc:
      "Un’app Next.js personalizzata raccoglie i feed dei tuoi amici, li unisce e li ordina per tempo. Il tuo layout. Le tue regole.",
    quote:
      "“Un piccolo pubblico di persone a cui tieni davvero vale più di un grande pubblico di sconosciuti.”",
    quoteBody:
      "Il web era personale, una volta. Può esserlo di nuovo.",
    bottomBody: "Siamo all’inizio. Sto costruendo alla luce del sole.\nLascia la tua email per seguire il progetto.",
    curious: "Curioso di sapere come funziona?",
    aboutExpLabel: "L’esperienza",
    aboutExpP1:
      "Apri il reader. Vedi i post dei tuoi amici di oggi — foto, qualche parola, un disegno, quello che hanno avuto voglia di condividere.",
    aboutExpP2:
      "Tutto è in ordine cronologico. Niente raccomandazioni, niente contenuti suggeriti, niente pubblicità. Solo uno scorrere tranquillo nella giornata di persone che conosci davvero.",
    aboutExpP3:
      "Chiudi quando hai finito. Niente cerca di trattenerti.",
    aboutPrinLabel: "I principi",
    aboutPrin1: "Il tuo dominio è tuo. I tuoi contenuti vivono sul tuo sito, non su una piattaforma.",
    aboutPrin2: "Il tuo pubblico sono persone che hai scelto tu. Non follower — amici.",
    aboutPrin3: "Niente like, niente visualizzazioni, niente metriche. Condividere senza esibirsi.",
    aboutPrin4: "Nessun algoritmo decide cosa vedi. Il tempo è l’unico ordine.",
    aboutStackLabel: "Lo stack",
    aboutStackNote: "Per i più curiosi.",
    aboutStackP:
      "Ogni persona ha il proprio sito sul proprio dominio. Il sito pubblica un feed RSS — un formato standard dal 1999. Un reader personalizzato raccoglie i feed di tutti i tuoi amici, li unisce e li ordina per data. Tutta qui l’architettura.",
  },
} as const;
