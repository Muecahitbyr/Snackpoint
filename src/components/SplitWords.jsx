import { Fragment } from 'react';

// Splits a headline into word spans so CSS can fly them in one after the
// other once the surrounding .reveal turns visible (.split-word in
// index.css). Outside a reveal the words simply show. The text stays real
// text, so screen readers and search engines read it unchanged.
export default function SplitWords({ text, step = 0.08 }) {
  const words = text.split(' ');
  return words.map((word, i) => (
    <Fragment key={i}>
      <span className="split-word" style={{ '--word-delay': `${i * step}s` }}>{word}</span>
      {i < words.length - 1 && ' '}
    </Fragment>
  ));
}
