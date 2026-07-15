import { useEffect, useState } from 'react';
import type { GeneratedCard } from '../types';
import {
  generateCardsFromImage,
  generateCardsFromText,
  EXAMPLE_TEXT,
  AiClientError,
} from '../lib/ai';
import {
  extractTextFromPdf,
  isImageFile,
  isPdfFile,
  readImageAsBase64,
  PdfExtractError,
} from '../lib/pdf';
import { createCardsBulk, getCardsByDeck, getDeck } from '../lib/repository';
import { FileUploadZone } from './FileUploadZone';
import { GeneratedCardsReview } from './GeneratedCardsReview';

type Step = 'upload' | 'generating' | 'review' | 'done';

interface AiGeneratorProps {
  deckId: string;
  onBack: () => void;
  onSaved: () => void;
}

export function AiGenerator({ deckId, onBack, onSaved }: AiGeneratorProps) {
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState<string | null>(null);
  const [generatedCards, setGeneratedCards] = useState<GeneratedCard[]>([]);
  const [saving, setSaving] = useState(false);
  const [deckName, setDeckName] = useState('');
  const [fileName, setFileName] = useState('');
  const [existingFronts, setExistingFronts] = useState<string[]>([]);

  useEffect(() => {
    void getDeck(deckId).then((d) => {
      if (d) setDeckName(d.name);
    });
  }, [deckId]);

  async function loadExistingFronts() {
    const existing = await getCardsByDeck(deckId);
    setExistingFronts(existing.map((c) => c.front));
  }

  async function processFile(file: File) {
    setError(null);
    setFileName(file.name);
    setStep('generating');

    try {
      let cards: GeneratedCard[];

      if (isPdfFile(file)) {
        const text = await extractTextFromPdf(file);
        cards = await generateCardsFromText(text);
      } else if (isImageFile(file)) {
        const { base64, mimeType } = await readImageAsBase64(file);
        cards = await generateCardsFromImage(base64, mimeType);
      } else {
        throw new PdfExtractError('Dateiformat nicht unterstützt.');
      }

      setGeneratedCards(cards);
      await loadExistingFronts();
      setStep('review');
    } catch (err) {
      setStep('upload');
      if (err instanceof PdfExtractError || err instanceof AiClientError) {
        setError(err.message);
      } else {
        setError('Unerwarteter Fehler. Bitte erneut versuchen.');
      }
    }
  }

  async function handleTestWithExample() {
    setError(null);
    setFileName('Beispieltext (Photosynthese)');
    setStep('generating');

    try {
      const cards = await generateCardsFromText(EXAMPLE_TEXT);
      setGeneratedCards(cards);
      await loadExistingFronts();
      setStep('review');
    } catch (err) {
      setStep('upload');
      setError(err instanceof AiClientError ? err.message : 'Test fehlgeschlagen.');
    }
  }

  async function handleSave(cards: GeneratedCard[]) {
    setSaving(true);
    setError(null);
    try {
      const count = await createCardsBulk(deckId, cards);
      console.log('[Abimind AI] Gespeichert:', count, 'Karten');
      setStep('done');
      onSaved();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Speichern fehlgeschlagen.';
      console.error('[Abimind AI] createCardsBulk fehlgeschlagen', err);
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onBack} className="mb-2 text-sm text-indigo-600 hover:underline">
          ← Zurück zum Deck
        </button>
        <h2 className="text-xl font-semibold text-slate-800">KI Smart Generator</h2>
        <p className="text-sm text-slate-500">
          {deckName ? `Deck: ${deckName}` : 'Lade …'}
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Fehler</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <FileUploadZone onFileSelected={processFile} />
          <div className="rounded-lg bg-slate-100 p-4 text-sm text-slate-600">
            <p className="font-medium text-slate-700">Entwickler-Test</p>
            <p className="mt-1">
              API testen ohne Upload – sendet festen Beispieltext an die Serverless Function.
            </p>
            <button
              onClick={handleTestWithExample}
              className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Mit Beispieltext testen
            </button>
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="flex flex-col items-center gap-3 py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="font-medium text-slate-700">KI generiert Karten …</p>
          <p className="text-sm text-slate-500">{fileName}</p>
          <p className="text-xs text-slate-400">Das kann 15–60 Sekunden dauern.</p>
        </div>
      )}

      {step === 'review' && (
        <GeneratedCardsReview
          cards={generatedCards}
          existingFronts={existingFronts}
          onChange={setGeneratedCards}
          onSave={handleSave}
          onCancel={() => {
            setGeneratedCards([]);
            setStep('upload');
          }}
          saving={saving}
        />
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-xl font-semibold text-emerald-700">Karten gespeichert!</p>
          <button
            onClick={onBack}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
          >
            Zum Deck
          </button>
        </div>
      )}
    </div>
  );
}
