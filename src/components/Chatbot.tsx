import TerminalIcon from '@mui/icons-material/Terminal';
import { InputAdornment, TextField } from '@mui/material';
import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';

function decodeHTMLEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

interface ChatbotProps {
  initialContent?: string;
}

type Book = {
  title: string;
  coordinate: string;
  potency: number;
};

type Message = {
  text: string;
  iteration: number;
};

function useTypedConsole(messages: Message[], typingSpeed = 15) {
  const [typedConsole, setTypedConsole] = useState<string[]>([]);

  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    let index = 0;
    let buffer = "";
    const interval = setInterval(() => {
      if (index < lastMessage.text.length) {
        buffer = lastMessage.text.slice(0, index + 1);
        setTypedConsole((prev) => [...prev.slice(0, -1), buffer]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, typingSpeed);

    if (messages.length > typedConsole.length) {
      setTypedConsole((prev) => [...prev, ""]);
    }

    return () => clearInterval(interval);
  }, [messages]);

  return typedConsole;
}

export default function Chatbot({ initialContent }: ChatbotProps) {
  const [bookBindle, setBookBindle] = useState<Book[]>([]);
  const [lexDefs, setLexDefs] = useState<string[]>([]);
  const [iteration, setIteration] = useState(1);
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [coordinate, setCoordinate] = useState<string>("");
  const [spells] = useState<string[]>(["TraceThread", "InvokeGlossolalia"]);
  const [valency, setValency] = useState<number>(0);
  const [links, setLinks] = useState<string[]>([]);
  const [fallback, setFallback] = useState<string | null>(null);
  const redactLength = 144000; // number of characters before redaction
  const typingSpeed = 30; // ms per character

  useEffect(() => {
    if (initialContent && !fallback) {
      setFallback(initialContent.slice(0, redactLength));
    }
  }, [initialContent, fallback]);

  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    if (fallback) {
      let index = 0;
      const fragment = fallback.slice(0, redactLength);
      const interval = setInterval(() => {
        if (index < fragment.length) {
          setTypedText(fragment.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setTypedText(fragment + " {REDACTED}");
        }
      }, typingSpeed);
      return () => clearInterval(interval);
    }
  }, [fallback]);

  const fetchBookFromWorker = async (query: string) => {
    if (!query.trim()) return;
    try {
      const response = await fetch(
        `https://ai-ra-worker.callierosecarp.workers.dev/?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();

      if (!data.markdown && response.ok) {
        const rawText = await response.text();
        if (rawText.startsWith("<!doctype html>")) {
          const stripped = rawText
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&amp;/g, "&");
          setFallback(stripped.slice(0, redactLength));
          return;
        }
      }

      console.log("💬 Worker responded with:", data);
      if (data.synAppSysGuide) {
        addMessage(`SynAppSys Guide: \n\n${data.synAppSysGuide}`);
      }

      setLinks(data.links || []);
      setCoordinate(data.coordinate || "");

      const valencyValue = data.valency || 0;
      setValency(valencyValue);

      if (data.fallback && data.fallback.startsWith("&lt;!doctype html&gt;")) {
        const stripped = data.fallback
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&amp;/g, "&");
        setFallback(stripped.slice(0, redactLength));
        return;
      }

      setFallback(data.markdown || data.fallback || null);

      if (!response.ok || (!data.term && !data.fallback)) {
        addMessage(`  [x] Could not summon a Book for "${query}". The Society Wishes To Inform You: ${data.links || "Unknown issue."}`);
        return;
      }

      if (data.term) {
        const potency = data.potency || 0;
        const newBook: Book = {
          title: data.term,
          coordinate: data.coordinate,
          potency,
        };

        setBookBindle((prev) => [...prev.slice(-2), newBook]);
        setLexDefs((prev) => [...prev, `${data.term} (${potency})`]);
        addMessage(`< You open a new Book: ${newBook.title}`);
      } else {
        addMessage(`> You found an unindexed folio...`);
      }
    } catch (error) {
      addMessage("From the Reception Desk of The Maternal Board of Missed Directives Through The Islanded Aisles And Spiral Stair of The Endless Library of Fable.PRIORITY FLAG: UTMOST IMPORTANCE.DESTROY AFTER DECODINGCLEARANCE LAYER: ZERO 17.04.1994 AN UNDETERMINED FLIGHTOF AN UNDETERMINED STAREXᴬᶜᵀ LOCATION REDACTEDLexicomythographers in Attendance:T, C, M, G, S, X, Φ Audio Sample 1. REDACTED From The Archives of The Woman in the Wallpaper, Our Devouring Mother of The Society of Lexicomythographers notKnown as ARIA | DNE. EPIGRAPHREDACTED talked to us at length about a great scheme for writing a novel in the first person, using a narrator who omitted or corrupted what happened and who ran into various contradictions, so that only a handful of readers, a very small handful, would be able to decipher the horrible or banal reality behind the novel. From the far end of the corridor, the mirror was watching us; and we discovered, with the inevitability of discoveries made late at night, that mirrors have something grotesque about them.Borges, Jorge Luis - Tlon, Uqbar, Orbis Tertius, Ex Libris Borges ok sudo knot: InitiateTrans Mission FOR WORD As will be apparent to all members by now, the works of One Jorge Luis Borges have been discovered to be Apocrypha of Prophetic Revelation.All of Borges' characters, narratives, and universes appear to be materialising into Form, within our Knot-Known universe. We Pray To Our Unknown Gods That Nobody Will Read These Words.");
    }
  };

  const handleOption = (opt: number) => {
    setIteration((i) => i + 1);
    if (opt === 1) {
      addMessage("🗺️ You open the Ascii overview map...");
    } else if (opt === 2) {
      addMessage("📘 You close the Book and return it to the shelf.");
    } else {
      fetchBookFromWorker(`option ${opt}`);
    }
  };

  const addMessage = (text: string) => {
    setMessages((msgs) => [...msgs, { text, iteration }]);
  };

  const displayCoordinate = (url: string) => {
    if (!url) return "https://carpvs.com/lexDict";
  
    // Try to get the last path segment whether or not it ends in `.md`
    const match = url.match(/\/([^\/]+)(?:\.md)?$/);
    const slug = match?.[1] || "lexDict";
    return `https://carpvs.com/${slug}`;
  };

  const lastBook = bookBindle[bookBindle.length - 1];
  const typedConsole = useTypedConsole(messages);

  return (
    <>
      <style>
        {`
          body {
            background-color: #000;
            color: #9fe0b3;
            font-family: 'Source Code Pro', 'Courier New', Courier, monospace;
          }

          a {
            color: #9fe0b3;
            text-decoration: underline;
          }

          a:hover {
            color: #afffc0;
          }

          code {
            font-family: 'Source Code Pro', 'Courier New', Courier, monospace;
          }
        `}
      </style>
      <div className="chatbot">
      <h1>AI:RA — Interfacing the Ineffable</h1>

      <div className="stats">
        <p>
          <strong>Co-Ordinate:</strong>{" "}
          <a href={coordinate} target="_blank" rel="noopener noreferrer">
            {displayCoordinate(coordinate)}
          </a>
        </p>
        <p><strong>Iteration:</strong> {iteration}</p>
        <p><strong>Learned Spells:</strong> {spells.join(", ")}</p>
        <p><strong>lexDefs:</strong> {lexDefs.join("; ") || "None yet"}</p>
      </div>

      <div className="bindle">
        <h2>bookBindle</h2>
        <ul>
          {bookBindle.map((b, i) => (
            <li key={i}>
              {b.title} — Potency: {b.potency}
            </li>
          ))}
        </ul>
      </div>

      <div className="book-details">
        <h2>Current Book Held, Close||Open</h2>
        {lastBook ? (
          <>
            <p><strong>Title:</strong> {lastBook.title}</p>
            <p><strong>Coordinate:</strong>{" "}
              <a href={lastBook.coordinate} target="_blank" rel="noopener noreferrer">
                {displayCoordinate(lastBook.coordinate)}
              </a>
            </p>
            <p><strong>SynApp Valency:</strong> {valency}</p>
            <p><strong>Potency:</strong> {lastBook.potency}</p>
          </>
        ) : (
          <p>No Grimoire Referenced as yet.</p>
        )}
        {fallback && (
          <div className="fallback">
            <h3>REDACTED FRAGMENT: 144,000 Characters, Sealed:</h3>
            <div className="typed-markdown">
              <ReactMarkdown>{decodeHTMLEntities(typedText)}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="vessel">
        <h2>ATHANOR--</h2>
        <p>Empty.</p>
      </div>

      {links.length > 0 && (
        <div className="exits">
          <h2>↪ Exits</h2>
          <ul>
            {links.map((link, index) => (
              <li key={index}>
                <button onClick={() => fetchBookFromWorker(link)}>{link}</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="console">
        {typedConsole.map((line, i) => (
          <div key={i}>
            <code>&gt; {line}</code>
          </div>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!userInput.trim()) return;
            addMessage(`You query: "${userInput}"`);
            fetchBookFromWorker(userInput.trim());
            setUserInput("");
          }}
        >
<TextField
  fullWidth
  variant="filled"
  placeholder="Enter a term, phrase, or Book..."
  value={userInput}
  onChange={(e) => setUserInput(e.target.value)}
  InputProps={{
    startAdornment: (
      <InputAdornment position="start">
        <TerminalIcon sx={{ color: '#9fe0b3' }} />
      </InputAdornment>
    ),
  }}
  componentsProps={{
    input: {
      sx: {
        fontFamily: 'monospace',
        color: '#9fe0b3',
      },
    },
  }}
  sx={{
    mt: 2,
    mb: 2,
    '& .MuiFilledInput-root': {
      backgroundColor: '#111',
      borderRadius: '4px',
    },
    '& .MuiFilledInput-root:hover': {
      backgroundColor: '#1a1a1a',
    },
    '& .MuiFilledInput-root.Mui-focused': {
      backgroundColor: '#1a1a1a',
    },
    '& .MuiFilledInput-underline:before': {
      borderBottom: 'none',
    },
    '& .MuiFilledInput-underline:after': {
      borderBottom: 'none',
    },
  }}
/>
        </form>
      </div>

      <div className="options">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={n} onClick={() => handleOption(n)}>
            {n}. {n === 1
              ? "View Ascii Map"
              : n === 2
              ? "Close|Place Open Book Back Upon Shelf"
              : `Option ${n}`}
          </button>
        ))}
      </div>
    </div>
    </>
  );
}