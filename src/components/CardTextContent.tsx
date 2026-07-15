import { parseCardText } from '../lib/cardTextFormat';

interface CardTextContentProps {
  text: string;
  className?: string;
}

/** Rendert Karten-Text mit echten Listen statt Bullet-Zeichen im Fließtext. */
export function CardTextContent({ text, className = '' }: CardTextContentProps) {
  const blocks = parseCardText(text);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`card-text-content ${className}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <p key={index} className="whitespace-pre-line">
              {block.text}
            </p>
          );
        }

        return (
          <ul key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="whitespace-pre-line">
                {item}
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
}
