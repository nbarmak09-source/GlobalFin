import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div
      className="flex flex-wrap items-start justify-between gap-y-3"
      style={{
        padding: '24px 0 20px',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 0,
      }}
    >
      <div>
        <h1
          className="text-heading"
          style={{
            fontSize: '1.5rem',
            color: 'var(--color-text)',
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-muted)',
              marginTop: 4,
              fontFamily: 'var(--font-body)',
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
    <div className="text-label" style={{ padding: '10px 0 8px' }}>
      {children}
    </div>
  )
}

/** Reusable tab bar used on financial panel pages */
export function PageTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}) {
  return (
    <div
      className="-mx-3 sm:mx-0 flex gap-0 overflow-x-auto scrollbar-hide"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className="transition-all duration-150 cursor-pointer focus-visible:outline-none whitespace-nowrap"
          style={{
            padding: '10px 18px',
            minHeight: 44,
            fontSize: '0.875rem',
            fontWeight: active === id ? 600 : 400,
            fontFamily: 'var(--font-heading)',
            color: active === id ? 'var(--color-primary)' : 'var(--color-muted)',
            borderBottom: active === id
              ? '2px solid var(--color-primary)'
              : '2px solid transparent',
            background: 'transparent',
            border: 'none',
            borderBottomWidth: 2,
            borderBottomStyle: 'solid',
            borderBottomColor: active === id ? 'var(--color-primary)' : 'transparent',
          }}
          onMouseEnter={(e) => {
            if (active !== id)
              (e.currentTarget as HTMLElement).style.color = 'var(--color-text)'
          }}
          onMouseLeave={(e) => {
            if (active !== id)
              (e.currentTarget as HTMLElement).style.color = 'var(--color-muted)'
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
