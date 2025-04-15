import { useState } from "react";
import { getRandomBooks } from "./dummyBooks";

type Message = {
  text: string;
  iteration: number;
};

export default function Chatbot() {
  const [iteration, setIteration] = useState(1);
  const [bookBindle] = useState(getRandomBooks());
  const [messages, setMessages] = useState<Message[]>([]);
  const [coordinate, setCoordinate] = useState(bookBindle[0]);
  const [lexDefs] = useState<string[]>([]);
  const [spells] = useState<string[]>(["TraceThread", "InvokeGlossolalia"]);

  const fetchBookFromWorker = async (query: string) => {
    try {
      const response = await fetch(`https://ai-ra-worker.callierosecarp.workers.dev/?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setCoordinate(data.coordinate);
      addMessage(`📖 You open a new Book: ${data.coordinate}`);
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

  return (
    <div className="chatbot">
      <h1>AI:RA — Interfacing the Ineffable</h1>
      <div className="stats">
        <p><strong>Co-Ordinate:</strong> {coordinate}</p>
        <p><strong>Iteration:</strong> {iteration}</p>
        <p><strong>Learned Spells:</strong> {spells.join(", ")}</p>
        <p><strong>lexDefs:</strong> {lexDefs.join("; ") || "None yet"}</p>
      </div>

      <div className="console">
        {messages.map((m, i) => (
          <div key={i}>
            <code>[{m.iteration}] {m.text}</code>
          </div>
        ))}
      </div>

      <div className="options">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={n} onClick={() => handleOption(n)}>
            {n}. {n === 1 ? "View Ascii Map" : n === 2 ? "Close and Place Book Back Upon Shelf" : `Option ${n}`}
          </button>
        ))}
      </div>
    </div>
  );
}