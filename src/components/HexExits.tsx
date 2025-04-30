import { useEffect, useRef } from "react";

interface HexExitsProps {
  lexDefs: string[];
  entranceLink: string | null;
  exitLink: string | null;
}

const HexExits = ({ lexDefs, entranceLink, exitLink }: HexExitsProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const hexSize = 90;
    const hexHeight = Math.sqrt(3) * hexSize;
    const hexWidth = 2 * hexSize;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const drawHex = (x: number, y: number, label = "", fill: string | undefined = undefined) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        const x_i = x + hexSize * Math.cos(angle);
        const y_i = y + hexSize * Math.sin(angle);
        if (i === 0) ctx.moveTo(x_i, y_i);
        else ctx.lineTo(x_i, y_i);
      }
      ctx.closePath();

      if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
      }

      ctx.strokeStyle = "#9fe0b3";
      ctx.stroke();

      if (label) {
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const maxCharsPerLine = 10;
        const lines = [];
        for (let i = 0; i < label.length; i += maxCharsPerLine) {
          lines.push(label.slice(i, i + maxCharsPerLine));
        }
        const lineHeight = 16;
        const totalHeight = lines.length * lineHeight;
        lines.forEach((line, idx) => {
          ctx.fillText(line, x, y - totalHeight / 2 + idx * lineHeight + lineHeight / 2);
        });
      }
    };

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw center hex (anchor, no label)
    drawHex(centerX, centerY);

    const shelfLabels = Array(4).fill("empty").map((_, i) => {
      const raw = lexDefs[i];
      let text = "";

      if (typeof raw === "string") {
        text = raw;
      } else if (typeof raw === "object" && Array.isArray(raw?.defs)) {
        text = raw.defs.join(" | ");
      }

      const match = text.match(/([a-zA-Z0-9\s\[\]'\-\:\.]{4,120})/);
      return match ? match[1].trim() : "empty";
    });

    const horizontalSpacing = hexWidth * 1.1;
    const verticalSpacing = hexHeight * 1.1;

    const positions = [
      { label: entranceLink, x: centerX - horizontalSpacing, y: centerY }, // 9 o'clock
      { label: shelfLabels[0], x: centerX - hexWidth * 0.55, y: centerY - verticalSpacing }, // 10–12
      { label: shelfLabels[1], x: centerX + hexWidth * 0.55, y: centerY - verticalSpacing }, // 12–2
      { label: shelfLabels[2], x: centerX + hexWidth * 0.55, y: centerY + verticalSpacing }, // 4–6
      { label: shelfLabels[3], x: centerX - hexWidth * 0.55, y: centerY + verticalSpacing }, // 6–8
      { label: exitLink, x: centerX + horizontalSpacing, y: centerY }, // 3 o'clock
    ];

    positions.forEach(({ label, x, y }, idx) => {
      drawHex(x, y, label ?? "empty", label ? "#223322" : undefined);
    });

    // Click handler for exit hex only
    canvas.addEventListener("click", (e) => {
      if (!exitLink) return;
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const exitX = centerX + horizontalSpacing;
      const exitY = centerY;
      const dx = clickX - exitX;
      const dy = clickY - exitY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < hexSize * 0.95) {
        const encoded = encodeURIComponent(exitLink);
        window.open(`https://raw.githubusercontent.com/CR-ux/THE-VAULT/main/${encoded}.md`, "_blank");
      }
    });

  }, [lexDefs, entranceLink, exitLink]);

  return (
    <div
      style={{
        width: '800px',
        height: '600px',
        overflow: 'hidden',
        margin: '2rem auto'
      }}
    >
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        style={{
          display: "block",
          background: "#000000",
          border: "none"
        }}
      />
    </div>
  );
};

export default HexExits;