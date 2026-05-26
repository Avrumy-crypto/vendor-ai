interface Props {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'full' | 'mark';
}

const sizeMap = {
  sm: { star: 16, title: 'text-lg', sub: 'text-xs' },
  md: { star: 22, title: 'text-2xl', sub: 'text-sm' },
  lg: { star: 32, title: 'text-4xl', sub: 'text-base' },
};

export default function Logo({ size = 'md', variant = 'full' }: Props) {
  const s = sizeMap[size];

  return (
    <div className="flex flex-col items-center select-none">
      {/* Brooklyn Bridge + Star — simplified SVG mark */}
      <svg
        width={s.star * 4}
        height={s.star * 2.8}
        viewBox="0 0 80 56"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mb-1"
      >
        {/* Star */}
        <polygon
          points="40,2 43.8,13.2 55.5,13.2 46.1,20 49.9,31.2 40,24.4 30.1,31.2 33.9,20 24.5,13.2 36.2,13.2"
          fill="#2869B4"
        />
        {/* Bridge towers */}
        <rect x="28" y="28" width="5" height="22" rx="1" fill="#706560" />
        <rect x="47" y="28" width="5" height="22" rx="1" fill="#706560" />
        {/* Bridge arch left */}
        <path d="M28 34 Q18 34 6 50" stroke="#706560" strokeWidth="2" fill="none" />
        {/* Bridge arch right */}
        <path d="M52 34 Q62 34 74 50" stroke="#706560" strokeWidth="2" fill="none" />
        {/* Cable lines left */}
        <line x1="28" y1="30" x2="10" y2="50" stroke="#706560" strokeWidth="1" opacity="0.5" />
        <line x1="28" y1="32" x2="17" y2="50" stroke="#706560" strokeWidth="1" opacity="0.5" />
        <line x1="28" y1="34" x2="23" y2="50" stroke="#706560" strokeWidth="1" opacity="0.5" />
        {/* Cable lines right */}
        <line x1="52" y1="30" x2="70" y2="50" stroke="#706560" strokeWidth="1" opacity="0.5" />
        <line x1="52" y1="32" x2="63" y2="50" stroke="#706560" strokeWidth="1" opacity="0.5" />
        <line x1="52" y1="34" x2="57" y2="50" stroke="#706560" strokeWidth="1" opacity="0.5" />
        {/* Road base */}
        <line x1="4" y1="50" x2="76" y2="50" stroke="#706560" strokeWidth="2.5" />
      </svg>

      {variant === 'full' && (
        <>
          <div className={`font-display font-bold tracking-wide text-brand-500 leading-none ${s.title}`}>
            FIVE STAR
          </div>
          <div className={`font-sans font-medium tracking-[0.25em] text-bridge-500 uppercase mt-0.5 ${s.sub}`}>
            Packaging
          </div>
        </>
      )}
    </div>
  );
}

export function LogoWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      {/* Mini star */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="#2869B4">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
      </svg>
      <span className="font-display font-bold text-brand-500 text-lg leading-none">
        FIVE STAR
      </span>
    </div>
  );
}
