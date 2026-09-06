# Navigation Animations — Pro Keys Dashboard

المكتبة: `framer-motion` + Tailwind `transition-*` للعناصر الثانوية.

---

## 1. Active Pill (shared layout animation)

```tsx
{active && (
  <motion.div
    layoutId={`nav-pill-${isRtl}`}   // منفصل LTR/RTL عشان مش يتحرك بشكل غلط
    className="absolute inset-0 rounded-lg"
    style={{ background: item.color + '15' }}  // لون كل tab + 15% opacity
    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
  />
)}
```

**السلوك:** الـ pill بتتنقل بشكل سلس من الـ tab القديم للجديد عن طريق `layoutId` shared — framer-motion بتحرك الـ position تلقائياً بـ spring.

| قيمة | تأثير |
|------|-------|
| `stiffness: 350` | حركة سريعة نسبياً |
| `damping: 30` | بدون bounce زيادة |

---

## 2. Icon Bounce on Hover

```tsx
<motion.div
  whileHover="hover"    // على الـ wrapper الخارجي
>
  <motion.div
    variants={{ hover: { scale: 1.18, rotate: isRtl ? -8 : 8 } }}
    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
    className="w-7 h-7 rounded-lg ..."
  >
    <Icon />
  </motion.div>
</motion.div>
```

**السلوك:** لما المستخدم يعمل hover على الـ tab، الأيقونة بتكبر وتتدوار خفيفاً.

| قيمة | تأثير |
|------|-------|
| `scale: 1.18` | تكبير 18% |
| `rotate: +8°` | LTR — دوران ليمين |
| `rotate: -8°` | RTL — دوران لشمال (عكس) |
| `stiffness: 400` | bounce سريع |
| `damping: 15` | bounce واضح بدون تجاوز كبير |

---

## 3. Page Content Transition (عند التنقل بين الصفحات)

```tsx
<AnimatePresence mode="wait" initial={false}>
  <motion.div
    key={pathname}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

**السلوك:** الصفحة القديمة تخرج لأعلى وتفضي، الجديدة تدخل من أسفل.

| قيمة | تأثير |
|------|-------|
| `mode="wait"` | ينتظر exit ينتهي قبل ما يعمل enter |
| `duration: 0.22s` | سريع ومش مزعج |
| `ease: [0.25,0.46,0.45,0.94]` | cubic-bezier — ease-out مخصص، حركة طبيعية |

---

## 4. Sidebar Collapse

```tsx
<aside className={`${collapsed ? 'w-[66px]' : 'w-[220px]'} transition-all duration-200`} />
```

```tsx
<ChevronLeft className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
```

**السلوك:** CSS transition على الـ width — مش framer-motion.

| قيمة | تأثير |
|------|-------|
| `duration-200` | 200ms |
| `rotate-180` | السهم يتعكس مع collapse |

---

## 5. Icon Background Opacity (active vs inactive)

```tsx
style={{ background: item.color + (active ? '25' : '18') }}
```

مش animation — قيمة hex opacity ثابتة بتتغير مباشرة:
- Active: `color + 25` → ~15% opacity
- Inactive: `color + 18` → ~9% opacity

---

## 6. Label Color & Weight (active state)

```tsx
<span style={active ? { color: item.color, fontWeight: 600 } : {}}>
```

بدون transition — تغيير فوري عند الـ navigate.

---

## 7. Drag Reorder (Customize Sidebar)

```tsx
<div
  draggable
  className={`transition-all border-2 ${isDragging ? 'opacity-40 scale-[0.97]' : ''} ${isOver ? 'scale-[1.01]' : ''}`}
  style={{
    background: isOver ? item.color + '08' : undefined,
    borderColor: isOver ? item.color + '66' : 'transparent',
    borderStyle: isOver ? 'dashed' : 'solid',
  }}
/>
```

**السلوك:** CSS transition بس (مش framer-motion) — العنصر اللي بيتسحب يتعتم وبيصغر، والـ drop target بيكبر خفيفاً ويظهر border dashed.

---

## ملخص المكتبات

| Animation | مكتبة |
|-----------|--------|
| Active pill slide | `framer-motion` — layoutId |
| Icon hover bounce | `framer-motion` — variants/spring |
| Page transition | `framer-motion` — AnimatePresence |
| Sidebar collapse | CSS Tailwind `transition-all` |
| Drag reorder | CSS Tailwind `transition-all` |
| Logo theme swap | CSS inline `transition: opacity 0.15s` |
