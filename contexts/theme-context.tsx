"use client"

import React, { createContext, useContext, useState, useEffect } from 'react'

export interface ThemeColors {
  primary: string
  secondary: string
  background: string
  surface: string
  accent: string
  text: {
    primary: string
    secondary: string
    muted: string
  }
  border: string
}

export interface Theme {
  id: string
  name: string
  colors: ThemeColors
}

const themes: Record<string, Theme> = {
  'cool-slate': {
    id: 'cool-slate',
    name: '冷色石板',
    colors: {
      primary: '#475569',
      secondary: '#0284c7',
      background: '#f8fafc',
      surface: '#f1f5f9',
      accent: '#e0f2fe',
      text: {
        primary: '#0f172a',
        secondary: '#334155',
        muted: '#475569'
      },
      border: '#cbd5e1'
    }
  }
}

interface ThemeContextType {
  currentTheme: Theme
  setTheme: (themeId: string) => void
  themes: Record<string, Theme>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentThemeId, setCurrentThemeId] = useState<string>('cool-slate')

  const setTheme = (themeId: string) => {
    if (themes[themeId]) {
      setCurrentThemeId(themeId)
      // 应用CSS变量
      applyThemeToCSS(themes[themeId])
    }
  }

  const applyThemeToCSS = (theme: Theme) => {
    const root = document.documentElement
    
    // 应用主题颜色到CSS变量
    root.style.setProperty('--theme-primary', theme.colors.primary)
    root.style.setProperty('--theme-secondary', theme.colors.secondary)
    root.style.setProperty('--theme-background', theme.colors.background)
    root.style.setProperty('--theme-surface', theme.colors.surface)
    root.style.setProperty('--theme-accent', theme.colors.accent)
    root.style.setProperty('--theme-text-primary', theme.colors.text.primary)
    root.style.setProperty('--theme-text-secondary', theme.colors.text.secondary)
    root.style.setProperty('--theme-text-muted', theme.colors.text.muted)
    root.style.setProperty('--theme-border', theme.colors.border)
  }

  useEffect(() => {
    // 初始化时应用默认主题
    applyThemeToCSS(themes[currentThemeId])
  }, [currentThemeId])

  const value: ThemeContextType = {
    currentTheme: themes[currentThemeId],
    setTheme,
    themes
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
