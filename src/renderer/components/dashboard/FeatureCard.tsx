interface FeatureCardProps {
  animationClass?: string
}

export function FeatureCard({ animationClass = '' }: FeatureCardProps) {
  return (
    <div
      className={`card-base card-fade-up ${animationClass} geo-bg col-span-full overflow-hidden`}
      style={{ opacity: 0, minHeight: 160 }}
    >
      <div className="relative z-10 p-6 flex flex-col justify-end h-full" style={{ minHeight: 160 }}>
        <span className="text-display text-xs mb-2" style={{ color: 'rgba(0, 200, 180, 0.7)' }}>
          Private Browsing
        </span>
        <h3 className="font-headline text-xl font-semibold mb-1" style={{ color: 'var(--on-surface)' }}>
          Browse with Confidence
        </h3>
        <p className="font-body text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)', maxWidth: 420 }}>
          Nsty Shield blocks ads and trackers automatically. Your browsing data stays on your device.
        </p>
      </div>
    </div>
  )
}
