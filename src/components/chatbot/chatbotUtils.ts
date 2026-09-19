import { KNOWLEDGE_BASE, type KnowledgeEntry } from '../../data/chatbotKnowledge';

/** Lowercases, spells out umlauts (ä→ae etc.) and strips punctuation, so
 * "Öffnungszeiten?" and "offnungszeiten" both normalize the same way as the
 * knowledge base's own keyword spellings. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Simple keyword/intent scoring: every keyword found as a substring of the
 * normalized input adds its own length to that entry's score (longer, more
 * specific phrases outweigh short generic ones), and the highest-scoring
 * entry wins. Returns null when nothing matches — caller shows the fallback. */
export function matchKnowledge(userText: string): KnowledgeEntry | null {
  const input = normalize(userText);
  if (!input) return null;

  let best: KnowledgeEntry | null = null;
  let bestScore = 0;

  for (const entry of KNOWLEDGE_BASE) {
    let score = 0;
    for (const keyword of entry.keywords) {
      const normalizedKeyword = normalize(keyword);
      if (normalizedKeyword && input.includes(normalizedKeyword)) {
        score += normalizedKeyword.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return best;
}
