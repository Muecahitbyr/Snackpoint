import { useReveal } from '../hooks/useReveal';

export default function Reveal({ children, delay = 0, className = '', as: Tag = 'div', ...rest }) {
  const { ref, visible } = useReveal();

  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}s` }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
