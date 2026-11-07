import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import type { Lang } from '../data/types';

// Speech to text for the voice food entry.
// Web: the browser's Web Speech API (Chrome, Safari, Edge).
// iOS/Android: Expo Go has no speech-recognition module, so the text field relies on the
// microphone key of the system keyboard (dictation), which fills the same field.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function recognitionCtor(): (new () => Recognition) | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const inAppDictation = () => !!recognitionCtor();

export function useDictation(lang: Lang, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  useEffect(() => {
    cb.current = onText;
  }, [onText]);
  useEffect(() => () => rec.current?.stop(), []);

  const start = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang === 'pl' ? 'pl-PL' : 'en-US';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? '')
        .join(' ');
      cb.current(text);
    };
    r.onerror = (e) => setError(e.error);
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    setListening(true);
    r.start();
  };
  const stop = () => rec.current?.stop();

  return { supported: inAppDictation(), listening, error, start, stop };
}

/**
 * One spoken command: start() listens until the speaker pauses, `transcript` updates live,
 * and `onFinal` gets the whole sentence once recognition ends.
 */
export function useVoiceCapture(lang: Lang, onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const text = useRef('');
  const cb = useRef(onFinal);
  useEffect(() => {
    cb.current = onFinal;
  }, [onFinal]);
  useEffect(() => () => rec.current?.stop(), []);

  const start = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    rec.current?.stop();
    const r = new Ctor();
    r.lang = lang === 'pl' ? 'pl-PL' : 'en-US';
    r.interimResults = true;
    r.continuous = false;
    text.current = '';
    r.onresult = (e) => {
      text.current = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? '')
        .join(' ')
        .trim();
      setTranscript(text.current);
    };
    r.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') setError(e.error);
    };
    r.onend = () => {
      setListening(false);
      if (rec.current === r && text.current) cb.current(text.current);
      rec.current = null;
    };
    rec.current = r;
    setTranscript('');
    setError(null);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setError('start');
    }
  };
  const stop = () => rec.current?.stop();
  const cancel = () => {
    const r = rec.current;
    rec.current = null;
    r?.stop();
    setListening(false);
  };

  return { supported: inAppDictation(), listening, transcript, error, start, stop, cancel };
}
