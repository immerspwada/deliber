# UI Design Guidelines - MUNEEF Style

## Design Philosophy
สไตล์การออกแบบ UI แบบ MUNEEF - สะอาด ทันสมัย มี accent สีเขียว ใช้งานสะดวก

## Color Palette

### Primary Colors
- **Background**: `#FFFFFF` (White)
- **Primary/Accent**: `#00A86B` (Green)
- **Primary Hover**: `#008F5B` (Dark Green)
- **Primary Light**: `#E8F5EF` (Light Green)
- **Text Primary**: `#1A1A1A` (Near Black)
- **Text Secondary**: `#666666` (Gray)
- **Text Muted**: `#999999` (Light Gray)

### Supporting Colors
- **Border**: `#E8E8E8` (Light Gray)
- **Border Light**: `#F0F0F0` (Very Light Gray)
- **Surface**: `#FFFFFF` (White)
- **Background Secondary**: `#F5F5F5` (Off White)
- **Success**: `#00A86B` (Green)
- **Warning**: `#F5A623` (Orange)
- **Error**: `#E53935` (Red)
- **Location Marker**: `#E53935` (Red for destination)

## Typography
- Font Family: `Sarabun`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- Headings: Bold (700), Near Black (#1A1A1A)
- Body: Regular/Medium (400-500), Gray tones
- ขนาดตัวอักษรต้องอ่านง่าย ไม่เล็กเกินไป

## Components Style

### Buttons
```css
/* Primary Button - Green Rounded */
.btn-primary {
  background-color: #00A86B;
  color: #FFFFFF;
  border: none;
  border-radius: 14px;
  padding: 18px 24px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 168, 107, 0.3);
}

/* Secondary Button */
.btn-secondary {
  background-color: #F5F5F5;
  color: #1A1A1A;
  border: none;
  border-radius: 14px;
}

/* Outline Button */
.btn-outline {
  background-color: transparent;
  color: #00A86B;
  border: 2px solid #00A86B;
  border-radius: 14px;
}
```

### Cards
- Background สีขาว
- Border radius: 16-20px
- Border: 1px solid #F0F0F0 หรือไม่มี
- Shadow เบาๆ หรือไม่มีเลย
- Padding เหมาะสม (16-24px)

### Input Fields
- Border: 2px solid #E8E8E8
- Border radius: 12px
- Focus state: border สีเขียว (#00A86B)
- Placeholder สีเทา (#999999)
- Padding: 16px

### Icons
- **ห้ามใช้ Emoji** - ใช้ SVG icons เท่านั้น
- ใช้ outline style SVG icons
- สีดำ (#1A1A1A) หรือเทา (#666666)
- ขนาดสม่ำเสมอ (20-24px)
- ควรใช้ inline SVG หรือ SVG component

### Location Markers
- Pickup: สีเขียว (#00A86B) - วงกลม
- Destination: สีแดง (#E53935) - วงกลม

## Layout Principles
1. **Whitespace**: ใช้ช่องว่างเยอะ ไม่แน่นเกินไป
2. **Hierarchy**: ลำดับความสำคัญชัดเจน
3. **Consistency**: รูปแบบเดียวกันทั้ง app
4. **Touch-friendly**: ปุ่มและ interactive elements ขนาดใหญ่พอสำหรับนิ้วสัมผัส (min 44px)

## Mobile-First
- ออกแบบสำหรับมือถือเป็นหลัก
- Bottom navigation bar
- Bottom sheet สำหรับ modal/options
- Full-width buttons สำหรับ CTA หลัก
- Safe area padding สำหรับ notch devices

## Map Integration
- Map ครึ่งบนของหน้าจอ (~45-50vh)
- Bottom sheet overlay บน map
- Top bar แบบ floating บน map
- Logo badge ตรงกลาง top bar

## Do's and Don'ts

### ✅ Do
- ใช้สีเขียว (#00A86B) เป็น accent หลัก
- ใช้พื้นหลังสีขาวเป็นหลัก
- เว้นช่องว่างให้เพียงพอ
- ใช้ typography ที่อ่านง่าย
- ทำให้ CTA โดดเด่นด้วยสีเขียว
- ใช้ animation เบาๆ subtle
- ใช้ border-radius โค้งมน (12-20px)

### ❌ Don't
- ใช้สีสันฉูดฉาดหลายสี
- ใส่ elements แน่นเกินไป
- ใช้ gradient หรือ shadow เยอะ
- ใช้ font หลายแบบ
- ทำให้ UI ซับซ้อน
- **ห้ามใช้ Emoji** - ใช้ SVG icons แทนเสมอ
- ใช้สีดำเป็น primary button (ใช้เขียวแทน)
