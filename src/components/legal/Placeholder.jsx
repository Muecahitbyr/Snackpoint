// Visually flags text that still needs to be filled in with real business
// data before this page goes live (subtle dashed highlight, not an alarming
// banner — same convention used by most Impressum/Datenschutz generators).
export default function Placeholder({ children }) {
  return <span className="legal-placeholder">{children}</span>;
}
