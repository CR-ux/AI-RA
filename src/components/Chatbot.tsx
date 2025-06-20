import TerminalIcon from '@mui/icons-material/Terminal';
import { InputAdornment, TextField } from '@mui/material';
import { useEffect, useState } from "react";
import ReactMarkdown from 'react-markdown';
import HexExits from './HexExits';
import SoundChamber from './SoundChamber';

const KV_INDEX_URL = import.meta.env.VITE_KV_INDEX_URL;

async function fetchIndexFromKV() {
  if (!KV_INDEX_URL) return null;
  try {
    const res = await fetch(KV_INDEX_URL);
    if (!res.ok) throw new Error('Failed to fetch KV index');
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}



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
  const [kvIndex, setKvIndex] = useState<Record<string, any> | null>(null);
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

  useEffect(() => {
    fetchIndexFromKV()
      .then((idx) => setKvIndex(idx))
      .catch((err) => console.error(err));
  }, []);

  const fetchBookFromWorker = async (query: string) => {
    if (!query.trim()) return;
    try {
      const response = await fetch(
        `https://ai-ra-worker.callierosecarp.workers.dev/?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      const indexEntry = kvIndex ? kvIndex[query] : null;
      console.log("Raw data keys:", Object.keys(data));
      console.log("Raw data object:", data);
      console.log("Full fetched data:", data);
      console.log("Worker responded with:", data);
      console.log("Received lexDefs:", data.lexDefs);
      console.log("defBlocks:", )
      setLinks(shuffleArray(data.links || []));
      setCoordinate(indexEntry?.coordinate || data.coordinate || "");

      const valencyValue = indexEntry?.valency ?? data.valency ?? 0;
      setValency(valencyValue);

      const concentrationValue = indexEntry?.concentration ?? data.concentration ?? 0;
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
        const fallbackResponse = await fetch("https://raw.githubusercontent.com/CR-ux/THE-VAULT/main/notBorges%2Fthis%20universe%20(which%20some%20call%20the%20hospital).md");
        const fallbackText = await fallbackResponse.text();
        setFallback(fallbackText.slice(0, redactLength));
        addMessage(`Book not in Memory. {REDACTING} with Icarus' final falling words write back from the Vault to make some sort of Meaning of All of This`);
        return;
      }

      if (data.term || indexEntry) {
        const potency = indexEntry?.potency ?? data.potency ?? 0;
        const newBook: Book = {
          title: data.term || query,
          coordinate: indexEntry?.coordinate || data.coordinate || "",
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
      addMessage("You try open the Ascii overview map. It is Unopenable.");
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
      let keys: string[] = [];
      if (kvIndex) {
        keys = Object.keys(kvIndex);
      } else {
        const response = await fetch(
          "https://raw.githubusercontent.com/CR-ux/THE-VAULT/main/index.json"
        );
        const index = await response.json();
        keys = Object.keys(index);
      }

      if (keys.length > 0) {
        const randomEntry = keys[Math.floor(Math.random() * keys.length)];
        fetchBookFromWorker(randomEntry);
      } else {
        addMessage("urgent.");
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
          .prompt-bar {
            display: flex;
            align-items: center;
            padding-top: 0.5rem;
            background-color: transparent;
            border-top: 1px solid #9fe0b3;
          }
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
          .layout {
            display: grid;
            gap: 1rem;
            max-width: 600px;
            margin: 0 auto;
          }
          .center-column {
            max-width: 600px;
            margin: 0 auto;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          .side {
            display: grid;
            flex-direction: column;
            gap: 1rem;
          }
          .module {
            border: 1px solid #9fe0b3;
            padding: 0.5rem;
            background: #111;
            text-align: left;
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            white-space: pre-wrap;
          }
          .console {
            word-wrap: break-word;
            overflow-wrap: break-word;
            word-break: break-word;
            white-space: pre-wrap;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            position: relative;
            height: 200px;
            overflow-y: auto;
            max-height: 100px;
            overflow-y: scroll;
            scrollbar-width: none;
            -ms-overflow-style: none;
            font-family: 'Courier New', Courier, monospace;
            text-align: left;
            white-space: pre-wrap;
          }
          .console::-webkit-scrollbar {
            display: none;
          }
          .options {
            display: flex;
            justify-content: center;
            gap: 1rem;
            margin-top: 1rem;
          }
          .options button {
            padding: 0.75rem 1.25rem;
            font-size: 1rem;
            width: auto;
            background-color: #111;
            color: #c2e1a9;
            border: 1px solid #9fe0b3;
            font-family: 'Courier New', monospace;
            cursor: pointer;
          }
          .options button:hover {
            background-color: #1a1a1a;
          }
        `}
      </style>
      <SoundChamber
        valency={valency}
        potency={lastBook?.potency || 0}
        floor={bookBindle.length}
        iteration={iteration}
      />
      <div className="chatbot" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1>AI:RA</h1>
        
      </div>
      <div className="layout">
      <div className="options">
        <button key={7} onClick={() => {
          if (bookBindle.length > 1) {
            const previousBook = bookBindle[bookBindle.length - 2];
            fetchBookFromWorker(previousBook.title);
          } else {
            window.open('https://carpvs.com/', '_blank');
          }
        }}>
          ⬆ Anabasis (Ascend)
        </button>
        <button key={8} onClick={handleKatabasis}>
          ⬇ Katabasis (Descend)
        </button>
      </div>
    

        <div className="center-column">
        <p>The Interface (Which Some Call Inhospitable) Is Comprised of an Indefinite, Perhaps Infinite, Non-Integer of Hexagonal Galleries. From any Hexagon, One Can See The Floors As Above and Below-one After Another, Endlessly</p>
          <div className="module console" style={{ textAlign: 'left' }}>
            {typedConsole.map((line, i) => (
              <div key={i}>
                <code>&gt; {line}</code>
              </div>
            ))}
            <div className="prompt-bar">
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
                    '& .MuiFilledInput-root': {
                      backgroundColor: 'transparent',
                      borderRadius: 0,
                      padding: 0,
                    },
                    '& .MuiFilledInput-input': {
                      padding: '0.5rem',
                      fontFamily: 'monospace',
                      color: '#9fe0b3',
                    },
                    '& .MuiFilledInput-root:hover': {
                      backgroundColor: 'transparent',
                    },
                    '& .MuiFilledInput-root.Mui-focused': {
                      backgroundColor: 'transparent',
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

          <div className="module book-details" style={{ textAlign: 'left' }}>
            <p>{"BOOK HELD {OPEN||CLOSE}"}</p>
            {lastBook ? (
              <>
                <p>Title: {lastBook.title}</p>
                <p>Coordinate:{' '}
                  <a href={lastBook.coordinate} target="_blank" rel="noopener noreferrer">
                    {displayCoordinate(lastBook.coordinate)}
                  </a>
                </p>
                <p>SynApp Valency: {valency}</p>
                <p>Potency: {lastBook.potency}</p>
                <p>Concentration: {concentration}</p>
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
        </div>
        <div className="side">
          <div className="module stats">
            <p>Co-Ordinate:{' '}
              <a href={coordinate} target="_blank" rel="noopener noreferrer">
                {displayCoordinate(coordinate)}
              </a>
            </p>
            <p>Iteration: {iteration}</p>
            <p>lexDefs: {lexDefs.join('; ') || 'None yet'}</p>
          </div>
          <div className="module">
            <HexExits
              lexDefs={lexDefs}
              entranceLink={bookBindle.length > 1 ? bookBindle[bookBindle.length - 2]?.title : ""}
              exitLink={links[0] || ""}
            />
          </div>
        </div>
      </div>
    </>
  );
}