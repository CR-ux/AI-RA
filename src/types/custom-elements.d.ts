declare namespace JSX {
    interface IntrinsicElements {
      'hexchess-board': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        board?: string;
        orientation?: 'white' | 'black';
        'player-role'?: 'white' | 'black' | 'spectator' | 'analyzer';
        'hide-coordinates'?: boolean;
        style?: React.CSSProperties;
      };
    }
  }

  