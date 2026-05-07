import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      className="flex items-start justify-between"
      style={{
        padding: '20px 20px 14px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 0,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: '1.125rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: '0.775rem',
              color: 'var(--text-secondary)',
              marginTop: 3,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '10px 20px 8px',
        fontSize: '0.65rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-muted)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {children}
    </div>
  )
}
