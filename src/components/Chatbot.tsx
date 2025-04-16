import { useEffect, useState } from "react";

type Book = {
  title: string;
  coordinate: string;
  potency: number;
};

type Message = {
  text: string;
  iteration: number;
};

export default function Chatbot() {
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
  const [typedText, setTypedText] = useState("");
  const typingSpeed = 30; // ms per character
  const redactLength = 144000; // number of characters before redaction

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
    try {
      const response = await fetch(
        `https://ai-ra-worker.callierosecarp.workers.dev/?q=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      console.log("💬 Worker responded with:", data);

      setLinks(data.links || []);
      setCoordinate(data.coordinate || "");

      const valencyValue = data.valency || 0;
      setValency(valencyValue);
      setFallback(data.fallback || null);

      if (!response.ok || (!data.term && !data.fallback)) {
        addMessage(`❌ Could not summon a Book for "${query}". Daemon says: ${data.error || "Unknown issue."}`);
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
        addMessage(`📖 You open a new Book: ${data.coordinate}`);
      } else {
        addMessage(`📄 You found an unindexed folio...`);
      }
    } catch (error) {
      addMessage("⚠️ The daemon failed to respond. You remain in narrative limbo.");
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
    const match = url?.match(/\/([^\/]+)\.md$/);
    const slug = match?.[1] || "lexDict";
    return `https://carpvs.com/${slug}`;
  };

  const lastBook = bookBindle[bookBindle.length - 1];

  return (
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
        <h2>📚 Bindle</h2>
        <ul>
          {bookBindle.map((b, i) => (
            <li key={i}>
              {b.title} — Potency: {b.potency}
            </li>
          ))}
        </ul>
      </div>

      <div className="book-details">
        <h2>📖 Current Book</h2>
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
          <p>No book summoned yet.</p>
        )}
        {fallback && (
          <div className="fallback">
            <h3>📄 REDACTED FRAGMENT: 144,000 Characters, Sealed:</h3>
            <p><em>{typedText}</em></p>
          </div>
        )}
      </div>

      <div className="vessel">
        <h2>🧪 Vessel</h2>
        <p>Coming soon: combine Books for lexHex reactions...</p>
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
        {messages.map((m, i) => (
          <div key={i}>
            <code>[{m.iteration}] {m.text}</code>
          </div>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!userInput.trim()) return;
            addMessage(`🧠 You query: "${userInput}"`);
            fetchBookFromWorker(userInput.trim());
            setUserInput("");
          }}
        >
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter a term, phrase, or spell..."
            className="console-input"
          />
          <button type="submit">Summon</button>
        </form>
      </div>

      <div className="options">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={n} onClick={() => handleOption(n)}>
            {n}. {n === 1
              ? "View Ascii Map"
              : n === 2
              ? "Close and Place Book Back Upon Shelf"
              : `Option ${n}`}
          </button>
        ))}
      </div>
    </div>
  );
}