interface HexIconProps {
  size?: number
  color?: string
  filled?: boolean
  className?: string
}

export function HexIcon({ size = 24, color = 'var(--primary)', filled = true, className = '' }: HexIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
    >
      <path
        d="M12 2L21.5 7.5V16.5L12 22L2.5 16.5V7.5L12 2Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  )
}
