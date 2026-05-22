import { sectionHeader, sectionHeaderBody, sectionTitle, sectionSubtitle, sectionAction } from "./SectionHeader.css"

export function DocumentsSectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string
  subtitle?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className={sectionHeader}>
      <div className={sectionHeaderBody}>
        <h2 className={sectionTitle}>{title}</h2>
        {subtitle && <div className={sectionSubtitle}>{subtitle}</div>}
      </div>
      {action && onAction && (
        <button type="button" onClick={onAction} className={sectionAction}>
          {action} →
        </button>
      )}
    </div>
  )
}
