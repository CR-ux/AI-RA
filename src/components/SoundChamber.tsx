import { useEffect, useRef, useState } from 'react';
import * as Tone from 'tone';

type SoundChamberProps = {
  valency: number;
  potency: number;
  floor: number;
  iteration: number;
};

export default function SoundChamber({ valency, potency, floor, iteration }: SoundChamberProps) {
  const [unlocked, setUnlocked] = useState(false);
  const loopRef = useRef<Tone.Loop | null>(null);

  useEffect(() => {
    if (!unlocked) return;

    const masterGain = new Tone.Gain(0.1).toDestination();

    // Polyphonic harmonic drones
    if (valency > 0 && floor > 0) {
      const maxFreq = 4000;
      const baseFreq = 80 + valency * 5;
      const harmonicCount = Math.min(5, iteration);
      const oscillators: Tone.Oscillator[] = [];

      for (let i = 0; i < floor; i++) {
        const harmonic = i < harmonicCount ? i + 1 : 1;
        const freq = Math.min(baseFreq * harmonic, maxFreq);
        const osc = new Tone.Oscillator({
          frequency: freq,
          type: potency > 6 ? 'sawtooth' : potency > 3 ? 'triangle' : 'sine',
          volume: -20 - i * 2,
        }).connect(masterGain);
        osc.start();
        oscillators.push(osc);
      }

      return () => {
        oscillators.forEach((osc) => osc.stop());
        masterGain.dispose();
      };
    }

    return () => {
      masterGain.dispose();
    };
  }, [valency, potency, floor, iteration, unlocked]);

  useEffect(() => {
    if (!unlocked) return;

    const shouldPlayLoop = valency === 0 && potency === 0 && floor === 0;

    if (shouldPlayLoop) {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current.dispose();
        loopRef.current = null;
      }

      const masterGain = new Tone.Gain(0.1).toDestination();
      const synth = new Tone.MembraneSynth().connect(masterGain);
      synth.volume.value = -6;

      const loop = new Tone.Loop((time) => {
        synth.triggerAttackRelease("C2", "8n", time);
      }, "1n");

      loopRef.current = loop;
      loop.start(0);

      Tone.Transport.bpm.value = 80;
      Tone.Transport.start();

      return () => {
        loop.stop();
        loop.dispose();
        masterGain.dispose();
      };
    } else {
      if (loopRef.current) {
        loopRef.current.stop();
        loopRef.current.dispose();
        loopRef.current = null;
      }
    }
  }, [valency, potency, floor, unlocked]);

  if (!unlocked) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        <button
          onClick={async () => {
            await Tone.start();
            setUnlocked(true);
          }}
          style={{
            background: 'none',
            border: '1px solid #c2e1a9',
            color: '#c2e1a9',
            fontFamily: 'monospace',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
         Who's There? You Know. You Know Who? You Know, You. 
        </button>
      </div>
    );
  }

  return null;
}
