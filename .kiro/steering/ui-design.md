# UI Design Guidelines - Uber Style

## Design Philosophy
สไตล์การออกแบบ UI ต้องเป็นแบบ Uber - ขาวดำ สะอาดตา เรียบง่าย ใช้งานสะดวก

## Color Palette

### Primary Colors
- **Background**: `#FFFFFF` (White)
- **Primary Text**: `#000000` (Black)
- **Secondary Text**: `#6B6B6B` (Gray)
- **Accent/CTA**: `#000000` (Black buttons with white text)

### Supporting Colors
- **Border/Divider**: `#E5E5E5` (Light Gray)
- **Disabled**: `#CCCCCC`
- **Success**: `#276EF1` (Uber Blue - ใช้เฉพาะ status)
- **Error**: `#E11900`
- **Background Secondary**: `#F6F6F6`

## Typography
- Font Family: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- Headings: Bold, Black (#000000)
- Body: Regular, Black or Gray
- ขนาดตัวอักษรต้องอ่านง่าย ไม่เล็กเกินไป

## Components Style

### Buttons
```css
/* Primary Button */
.btn-primary {
  background-color: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8px;
  padding: 14px 24px;
  font-weight: 500;
}

/* Secondary Button */
.btn-secondary {
  background-color: #F6F6F6;
  color: #000000;
  border: none;
  border-radius: 8px;
}
```

### Cards
- Background สีขาว
- Border radius: 12px
- Shadow เบาๆ หรือไม่มีเลย
- Padding เหมาะสม (16-24px)

### Input Fields
- Border: 1px solid #E5E5E5
- Border radius: 8px
- Focus state: border สีดำ
- Placeholder สีเทา

### Icons
- **ห้ามใช้ Emoji** - ใช้ SVG icons เท่านั้น
- ใช้ outline style SVG icons
- สีดำหรือเทาเข้ม
- ขนาดสม่ำเสมอ (24px)
- ควรใช้ inline SVG หรือ SVG component

## Layout Principles
1. **Whitespace**: ใช้ช่องว่างเยอะ ไม่แน่นเกินไป
2. **Hierarchy**: ลำดับความสำคัญชัดเจน
3. **Consistency**: รูปแบบเดียวกันทั้ง app
4. **Touch-friendly**: ปุ่มและ interactive elements ขนาดใหญ่พอสำหรับนิ้วสัมผัส (min 44px)

## Mobile-First
- ออกแบบสำหรับมือถือเป็นหลัก
- Bottom navigation bar
- Swipe gestures ที่เป็นธรรมชาติ
- Full-width buttons สำหรับ CTA หลัก

## Do's and Don'ts

### ✅ Do
- ใช้สีขาวดำเป็นหลัก
- เว้นช่องว่างให้เพียงพอ
- ใช้ typography ที่อ่านง่าย
- ทำให้ CTA โดดเด่น
- ใช้ animation เบาๆ subtle

### ❌ Don't
- ใช้สีสันฉูดฉาด
- ใส่ elements แน่นเกินไป
- ใช้ gradient หรือ shadow เยอะ
- ใช้ font หลายแบบ
- ทำให้ UI ซับซ้อน
- **ห้ามใช้ Emoji** - ใช้ SVG icons แทนเสมอ
