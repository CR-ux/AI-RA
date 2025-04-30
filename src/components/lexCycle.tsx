

const LexCycle = () => {
  return (
    <svg width="500" height="500" viewBox="-1.5 -1.5 3 3" xmlns="http://www.w3.org/2000/svg">
      {/* Hexagon edges */}
      <line x1="1" y1="0" x2="0.5" y2="0.866" stroke="black" />
      <line x1="0.5" y1="0.866" x2="-0.5" y2="0.866" stroke="black" />
      <line x1="-0.5" y1="0.866" x2="-1" y2="0" stroke="black" />
      <line x1="-1" y1="0" x2="-0.5" y2="-0.866" stroke="black" />
      <line x1="-0.5" y1="-0.866" x2="0.5" y2="-0.866" stroke="black" />
      <line x1="0.5" y1="-0.866" x2="1" y2="0" stroke="black" />

      {/* Lines to center */}
      <line x1="1" y1="0" x2="0" y2="0" stroke="black" strokeDasharray="4" />
      <line x1="0.5" y1="0.866" x2="0" y2="0" stroke="black" strokeDasharray="4" />
      <line x1="-0.5" y1="0.866" x2="0" y2="0" stroke="black" strokeDasharray="4" />
      <line x1="-1" y1="0" x2="0" y2="0" stroke="black" strokeDasharray="4" />
      <line x1="-0.5" y1="-0.866" x2="0" y2="0" stroke="black" strokeDasharray="4" />
      <line x1="0.5" y1="-0.866" x2="0" y2="0" stroke="black" strokeDasharray="4" />

      {/* Outer points */}
      <circle cx="1" cy="0" r="0.05" fill="blue" />
      <circle cx="0.5" cy="0.866" r="0.05" fill="blue" />
      <circle cx="-0.5" cy="0.866" r="0.05" fill="blue" />
      <circle cx="-1" cy="0" r="0.05" fill="blue" />
      <circle cx="-0.5" cy="-0.866" r="0.05" fill="blue" />
      <circle cx="0.5" cy="-0.866" r="0.05" fill="blue" />

      {/* Center point */}
      <circle cx="0" cy="0" r="0.07" fill="red" />

      {/* Labels */}
      <text x="1.2" y="0" fontSize="0.1" textAnchor="middle">Noen</text>
      <text x="0.6" y="1" fontSize="0.1" textAnchor="middle">Croen</text>
      <text x="-0.6" y="1" fontSize="0.1" textAnchor="middle">Wyrb</text>
      <text x="-1.2" y="0" fontSize="0.1" textAnchor="middle">Badverb</text>
      <text x="-0.6" y="-1" fontSize="0.1" textAnchor="middle">Lacronym</text>
      <text x="0.6" y="-1" fontSize="0.1" textAnchor="middle">Prodverb</text>
      <text x="0" y="0.2" fontSize="0.12" textAnchor="middle" fill="red">Ripture</text>
    </svg>
  );
};

export default LexCycle;
