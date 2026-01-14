# 🎯 Floating Action Bar

Pill-shaped floating navigation bar with smooth animations and active state indicator.

## ✨ Features

- 🎨 Pill-shaped design with rounded corners
- 🔵 Active state with orange circular background
- ⚡ Smooth transitions (300ms)
- 📱 Mobile-optimized (fixed bottom positioning)
- ♿ Accessible (ARIA labels)
- 🎭 Customizable icons and actions

## 🚀 Usage

### Basic

```vue
<template>
  <FloatingActionBar @change="handleNavChange" />
</template>

<script setup lang="ts">
function handleNavChange(id: string) {
  console.log("Active:", id);
}
</script>
```

### Custom Items

```vue
<template>
  <FloatingActionBar
    :items="customItems"
    default-active="home"
    @change="handleNavChange"
  />
</template>

<script setup lang="ts">
import { HomeIcon, BellIcon } from "@heroicons/vue/24/outline";

const customItems = [
  { id: "home", label: "Home", icon: HomeIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
];
</script>
```

### With Actions

```vue
<template>
  <FloatingActionBar :items="itemsWithActions" />
</template>

<script setup lang="ts">
const router = useRouter();

const itemsWithActions = [
  {
    id: "home",
    label: "Home",
    icon: HomeIcon,
    action: () => router.push("/"),
  },
  {
    id: "profile",
    label: "Profile",
    icon: UserIcon,
    action: () => router.push("/profile"),
  },
];
</script>
```

## 📋 Props

| Prop          | Type         | Default   | Description              |
| ------------- | ------------ | --------- | ------------------------ |
| items         | ActionItem[] | [5 items] | Navigation items         |
| defaultActive | string       | 'home'    | Initially active item ID |

### ActionItem Type

```typescript
interface ActionItem {
  id: string; // Unique identifier
  label: string; // Accessibility label
  icon: Component; // Heroicon component
  action?: () => void; // Optional click handler
}
```

## 🎨 Styling

### Active State

- Background: `bg-orange-500` (w-14 h-14)
- Icon: `text-white` (w-7 h-7)

### Inactive State

- Background: `transparent` (w-12 h-12)
- Icon: `text-gray-400` (w-6 h-6)
- Hover: `bg-gray-800`

### Container

- Background: `bg-gray-900`
- Border: `border-gray-800`
- Shadow: `shadow-2xl`
- Position: `fixed bottom-6 left-1/2 -translate-x-1/2`

## 🎭 Demo

Visit `/demo/floating-action-bar` to see it in action!

## 🔧 Customization

### Change Colors

```vue
<button
  :class="[
    activeId === item.id
      ? 'bg-blue-500'  // Change active color
      : 'hover:bg-gray-700'
  ]"
>
```

### Change Size

```vue
<button
  :class="[
    activeId === item.id
      ? 'w-16 h-16'  // Larger active
      : 'w-14 h-14'  // Larger inactive
  ]"
>
```

### Change Position

```vue
<div class="fixed bottom-4 left-4">  <!-- Bottom-left -->
<div class="fixed top-6 left-1/2 -translate-x-1/2">  <!-- Top-center -->
```

## 📱 Mobile Considerations

- Uses `fixed` positioning for consistent placement
- `z-50` ensures it stays above content
- `pb-24` on parent container prevents content overlap
- Touch-friendly size (48px+ tap targets)

## ♿ Accessibility

- Each button has `aria-label` for screen readers
- Keyboard navigation supported
- Focus states included
- Semantic HTML structure

## 🎯 Best Practices

1. **Limit items**: 3-5 items for optimal UX
2. **Clear icons**: Use recognizable Heroicons
3. **Consistent placement**: Keep in same position across pages
4. **Avoid overlap**: Add padding to page content
5. **Test on mobile**: Ensure thumb-reachable on all devices
