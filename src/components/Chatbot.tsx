import TerminalIcon from '@mui/icons-material/Terminal';
import { InputAdornment, TextField } from '@mui/material';
import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import HexExits from './HexExits';
import SoundChamber from './SoundChamber';



function decodeHTMLEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function shuffleArray(array: string[]) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
  const [concentration, setConcentration] = useState<number>(0);
  const [links, setLinks] = useState<string[]>([]);
  const [fallback, setFallback] = useState<string | null>(null);
  const redactLength = 144000;
  const typingSpeed = 30;

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
      console.log("Raw data keys:", Object.keys(data));
      console.log("Raw data object:", data);
      console.log("Full fetched data:", data);
      console.log("Worker responded with:", data);
      console.log("Received lexDefs:", data.lexDefs);
      console.log("defBlocks:", )
      setLinks(shuffleArray(data.links || []));
      setCoordinate(data.coordinate || "");

      const valencyValue = data.valency || 0;
      setValency(valencyValue);

      const concentrationValue = data.concentration || 0;
      setConcentration(concentrationValue);

      setFallback(data.markdown || data.fallback || null);

      console.log("Raw data lexDefs:", data.lexDefs);
      const receivedLexDefs = Array.isArray(data.lexDefs) ? data.lexDefs : [];

      const flattenedDefs: any[] = [];

      const seenKeys = new Set<string>();

      receivedLexDefs.forEach(({ name, usages, defBlock }: any) => {
        usages.forEach((usage: string) => {
          const usageTrimmed = usage.trim();
          const key = `${name}||${usageTrimmed}`;
          if (seenKeys.has(key)) return;
          seenKeys.add(key);

          let matched = "";

          const searchSpace = `${defBlock || ""}\n${data.markdown || ""}`;

          const usageRegexSafe = usageTrimmed.replace(/[^a-zA-Z0-9]/g, "");
          const nbRegexStrict = new RegExp(`\\bN\\.B\\.?\\s*["“]([^"”\\[]{4,200})["”]\\s*\\[\\^${name.replace(/\[\^l\]/, '')}(\\[\\^l\\])?${usageRegexSafe}\\]`, 'g');
          const nbRegexLoose = new RegExp(`\\bN\\.B\\.?\\s*["“]([^"”\\[]{4,200})["”]`, 'g');

          let matches = [...searchSpace.matchAll(nbRegexStrict)];
          if (matches.length === 0) {
            matches = [...searchSpace.matchAll(nbRegexLoose)];
          }

          const allMatches = matches.map(m => m[1]?.trim()).filter(Boolean);

          if (allMatches.length) {
            matched = allMatches[flattenedDefs.length % allMatches.length];
          } else {
            matched = "empty";
          }

          flattenedDefs.push({
            name,
            usage: usageTrimmed,
            def: matched
          });
        });
      });

      console.log("Flattened defs by usage:", flattenedDefs);
      setLexDefs(flattenedDefs);


      if (!response.ok || (!data.term && !data.fallback)) {
        addMessage(`Could not summon a Book for "${query}".Your Journey Ends, Hear`);
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
        addMessage(`< You open a new Book: ${newBook.title}`);
      } else {
        addMessage(`> You found an unindexed folio...`);
      }
    } catch (error) {
      console.error(error);
      addMessage("An unexpected error occurred while fetching the Book.");
    }
  };

  const handleOption = (opt: number) => {
    setIteration((i) => i + 1);
    if (opt === 1) {
      addMessage("You open the Ascii overview map...");
    } else if (opt === 2) {
      addMessage("You close the Book and return it to the shelf. The Light it gives it insufficient, and unceasing.");
    } else {
      fetchBookFromWorker(`option ${opt}`);
    }
  };

  const addMessage = (text: string) => {
    setMessages((msgs) => [...msgs, { text, iteration }]);
  };

  const displayCoordinate = (url: string) => {
    if (!url) return "https://carpvs.com/lexDict";
    const match = url.match(/\/([^\/]+)(?:\.md)?$/);
    const slug = match?.[1] || "lexDict";
    return `https://carpvs.com/${slug}`;
  };

  const lastBook = bookBindle[bookBindle.length - 1];
  const typedConsole = useTypedConsole(messages);

  const handleKatabasis = async () => {
    try {
      const response = await fetch("https://raw.githubusercontent.com/CR-ux/THE-VAULT/main/index.json");
      const index = await response.json();
      const keys = Object.keys(index);

      if (keys.length > 0) {
        const randomEntry = keys[Math.floor(Math.random() * keys.length)];
        fetchBookFromWorker(randomEntry);
      } else {
        addMessage("The Vault yielded no doors. The Abyss holds you.");
      }
    } catch (error) {
      console.error(error);
      addMessage("Failed to descend. The Void resists you.");
    }
  };

  return (
    <>
      <style>
        {`
          body {
            background-color: #000;
            color: #c2e1a9;
            font-family: '', 'Courier New', monospace;
          }
          a {
            color: #ffffff;
            text-decoration: none;
          }
          a:hover {
            color: #ffffff;
          }
          code {
            font-family: 'Source Code Pro', 'Courier New', Courier, monospace;
          }
        `}
      </style>
      <SoundChamber
        valency={valency}
        potency={lastBook?.potency || 0}
        floor={bookBindle.length}
        iteration={iteration}
      />
      <div className="chatbot">
        <h1>AI:RA — Interfacing the Ineffable</h1>
        <h5>The Interface (Which Some Call Inhospitable)</h5>
        <h6>Is Comprised of an Indefinite, Perhaps Infinite, Non-Integer of Hexagonal Galleries</h6>
        <h6>From any Hexagon, One Can See The Floors As Above and Below-one After Another, Endlessly</h6>
        <div className="stats">
          <p><strong>Co-Ordinate:</strong>{" "}
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
              <p><strong>Concentration:</strong> {concentration}</p>
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

        <div className="options">
          <button key={7} onClick={() => {
            if (bookBindle.length > 1) {
              const previousBook = bookBindle[bookBindle.length - 2];
              fetchBookFromWorker(previousBook.title);
            } else {
              window.open("https://carpvs.com/", "_blank");
            }
          }}>
            ⬆ Anabasis (Ascend)
          </button>
          <button key={8} onClick={handleKatabasis}>
            ⬇ Katabasis (Descend)
          </button>
        </div>
        <div
          className="chat-message"
          style={{
            width: '100%',
            maxWidth: '800px',
            margin: '0 auto',
            padding: '1rem',
            overflow: 'hidden'
          }}
        >
          <HexExits
            lexDefs={lexDefs}
            entranceLink={bookBindle.length > 1 ? bookBindle[bookBindle.length - 2]?.title : ""}
            exitLink={links[0] || ""}
          />
        </div>

        <div className="console" style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          padding: '1rem',
          border: '1px solid #9fe0b3',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '400px',
          overflowY: 'scroll',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE 10+
          '&::-webkit-scrollbar': {
            display: 'none' // Chrome, Safari, Opera
          }
        }}>
          {typedConsole.map((line, i) => (
            <div key={i}>
              <code>&gt; {line}</code>
            </div>
          ))}
          <div style={{ position: 'sticky', bottom: 0, backgroundColor: '#000', paddingTop: '1rem' }}>
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
                placeholder="Place. Hold. err()"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <TerminalIcon sx={{ color: '#9fe0b3' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    fontFamily: 'monospace',
                    color: '#9fe0b3',
                  }
                }}
                sx={{
                  mt: 2,
                  mb: 2,
                  '& .MuiFilledInput-root': {
                    backgroundColor: '#1a1a1a',
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
        </div>

        <div className="options">
          <button onClick={() => handleOption(1)}>1. View Ascii Map</button>
          <button onClick={() => handleOption(2)}>2. Close|Place Open Book Back Upon Shelf</button>
        </div>
      </div>
    </>
  );
}