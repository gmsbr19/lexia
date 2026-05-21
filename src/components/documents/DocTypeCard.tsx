"use client"

import { useRouter } from "next/navigation"
import useDocumentStore, { DocType } from "@/lib/store"
import { Scroll, Feather, Briefcase, Scale, ArrowRight } from 'lucide-react'
import { tokens } from '@/styles/tokens.css'

interface Props {
  name: DocType
  iconName: string
  count: number
  description: string
}

export default function DocTypeCard({ name, iconName, count, description }: Props) {
  const router = useRouter()
  const setDocType = useDocumentStore((s) => s.setDocType)

  function handleClick() {
    setDocType(name)
    router.push('/documents/new')
  }

  const Icon = (() => {
    switch (iconName) {
      case 'Scroll': return Scroll
      case 'Feather': return Feather
      case 'Briefcase': return Briefcase
      case 'Scale': return Scale
      default: return Scroll
    }
  })()

  return (
    <div onClick={handleClick} style={{ textDecoration: 'none' }}>
      <div style={{
        background: tokens.color.surface, border: `1px solid ${tokens.color.border}`,
        borderRadius: 16, padding: "22px 22px 20px",
        cursor: "pointer", transition: "transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
        boxShadow: tokens.color.shadowSm, display: "flex", flexDirection: "column", gap: 16,
        position: "relative", overflow: "hidden", minHeight: 220,
      }}>
        <div style={{
          position: "absolute", top: -40, right: -40, width: 140, height: 140,
          borderRadius: "50%", background: tokens.color.accentSoft, opacity: 0.5, filter: "blur(2px)",
        }} />
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: tokens.color.bgSunken,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: tokens.color.accent, position: "relative",
        }}>
          <Icon size={22} strokeWidth={1.6} />
        </div>
        <div style={{ position: "relative", flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: tokens.color.text, letterSpacing: "-0.02em", marginBottom: 6 }}>{name}</div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: tokens.color.textMuted }}>{description}</div>
        </div>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingTop: 14, borderTop: `1px solid ${tokens.color.border}`, position: "relative",
        }}>
          <span style={{ fontSize: "11.5px", color: tokens.color.textSubtle }}>{count} templates</span>
          <div style={{
            width: 26, height: 26, borderRadius: "50%", background: tokens.color.bgSunken,
            display: "flex", alignItems: "center", justifyContent: "center", color: tokens.color.textMuted,
          }}>
            <ArrowRight size={13} />
          </div>
        </div>
      </div>
    </div>
  )
}
