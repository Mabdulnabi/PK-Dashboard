# Liquid Glass Theme — Pro Keys Dashboard

Applied to `app/u/layout.tsx` sidebar + topbar. Confirmed working.

---

## Page Background

```js
// Dark
'radial-gradient(ellipse 100% 80% at 10% 0%, rgba(217,148,1,0.18) 0%, transparent 50%), radial-gradient(ellipse 80% 100% at 90% 100%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 60% at 50% 50%, rgba(217,148,1,0.05) 0%, transparent 60%), #080c16'

// Light
'radial-gradient(ellipse 100% 80% at 10% 0%, rgba(217,148,1,0.22) 0%, transparent 50%), radial-gradient(ellipse 80% 100% at 90% 100%, rgba(99,102,241,0.16) 0%, transparent 50%), radial-gradient(ellipse 60% 60% at 50% 50%, rgba(56,189,248,0.08) 0%, transparent 60%), #e8eef5'
```

---

## Sidebar Glass Fill

```js
// Light — gradient top to bottom
'linear-gradient(to bottom, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0.32) 100%)'

// Dark — gradient top to bottom
'linear-gradient(to bottom, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)'
```

---

## Header Fill

```js
// Light
'rgba(255,255,255,0.42)'

// Dark
'rgba(8,12,22,0.38)'
```

---

## Backdrop Blur

```js
backdropFilter: 'blur(28px)'
WebkitBackdropFilter: 'blur(28px)'

// Dropdowns: blur(32px)
```

---

## Borders

```js
// Light
borderColor: 'rgba(255,255,255,0.65)'

// Dark
borderColor: 'rgba(255,255,255,0.07)'
```

---

## Box Shadows

```js
// Sidebar — light
'4px 0 32px -4px rgba(0,0,0,0.07)'

// Sidebar — dark
'4px 0 40px -4px rgba(0,0,0,0.55)'

// Header — light
'0 4px 24px -4px rgba(0,0,0,0.06)'

// Header — dark
'0 4px 40px -4px rgba(0,0,0,0.45)'
```

---

## Dropdowns (notifications, profile popup)

```js
backdropFilter: 'blur(32px)'

// Light fill
'rgba(255,255,255,0.58–0.60)'

// Dark fill
'rgba(12,17,28,0.55–0.58)'

// Border — light
'1px solid rgba(255,255,255,0.70)'

// Border — dark
'1px solid rgba(255,255,255,0.09)'

// Shadow — light
'0 20px 48px rgba(0,0,0,0.12)'

// Shadow — dark
'0 20px 60px rgba(0,0,0,0.6)'
```

---

## Main Content Area

```js
// Light (behind header, over bg)
'rgba(240,244,248,0.6)'

// Dark
'rgba(9,13,24,0.55)'
```

---

## Key Rule

Fill opacity must stay **LOW** — `0.32–0.48` light, `0.02–0.06` dark.  
Higher opacity kills the glass effect by hiding the background orbs behind the panel.
