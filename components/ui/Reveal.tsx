'use client'
import { useRef, useEffect, useState } from 'react'
import { motion, Variants } from 'framer-motion'

type Direction = 'up' | 'down' | 'left' | 'right' | 'fade'

const variants: Record<Direction, Variants> = {
  up:    { hidden: { opacity: 0, y: 28 },  visible: { opacity: 1, y: 0 } },
  down:  { hidden: { opacity: 0, y: -28 }, visible: { opacity: 1, y: 0 } },
  left:  { hidden: { opacity: 0, x: 28 },  visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: -28 }, visible: { opacity: 1, x: 0 } },
  fade:  { hidden: { opacity: 0 },         visible: { opacity: 1 } },
}

interface RevealProps {
  children: React.ReactNode
  direction?: Direction
  delay?: number
  duration?: number
  className?: string
  style?: React.CSSProperties
  threshold?: number
  once?: boolean
}

export function Reveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.45,
  className,
  style,
  threshold = 0.12,
  once = true,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          if (once) obs.disconnect()
        } else if (!once) {
          setVisible(false)
        }
      },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, once])

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      variants={variants[direction]}
      initial="hidden"
      animate={visible ? 'visible' : 'hidden'}
      transition={{ type: 'spring', damping: 28, stiffness: 260, mass: 0.7, delay }}
    >
      {children}
    </motion.div>
  )
}

// Stagger wrapper: children animate in sequence
interface StaggerProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  staggerDelay?: number
  direction?: Direction
  threshold?: number
}

export function RevealStagger({
  children,
  className,
  style,
  staggerDelay = 0.07,
  direction = 'up',
  threshold = 0.08,
}: StaggerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: staggerDelay } },
  }

  const itemVariants: Variants = variants[direction]

  return (
    <motion.div
      ref={ref}
      className={className}
      style={style}
      variants={containerVariants}
      initial="hidden"
      animate={visible ? 'visible' : 'hidden'}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              transition={{ type: 'spring', damping: 28, stiffness: 260, mass: 0.7 }}
            >
              {child}
            </motion.div>
          ))
        : <motion.div variants={itemVariants} transition={{ type: 'spring', damping: 28, stiffness: 260, mass: 0.7 }}>
            {children}
          </motion.div>
      }
    </motion.div>
  )
}
