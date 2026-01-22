# 🚀 Theme Settings - Quick Start Guide

**Feature**: Admin Theme Customization  
**Access**: `/admin/settings/theme`

---

## 📍 How to Access

### Method 1: Direct URL

```
http://localhost:5173/admin/settings/theme
```

### Method 2: Navigation

```
Admin Panel → Settings → Theme Card (🎨)
```

---

## 🎨 What You Can Customize

### 1. Skin Color (สีหลัก)

- **Primary**: Main brand color
- **Secondary**: Accent color

### 2. Button Color (สีปุ่ม)

- **Normal**: Default button color
- **Hover**: Button hover state

### 3. Header & Footer

- **Header Background**: Top navigation background
- **Footer Background**: Bottom section background

### 4. Header Navigation (เมนูนำทาง)

- **Normal**: Default link color
- **Hover**: Link hover color

### 5. Footer Navigation (เมนูท้าย)

- **Normal**: Footer link color
- **Hover**: Footer link hover color

---

## ⚡ Quick Actions

### Change a Color

1. Click color preview or picker
2. Select new color
3. See live preview
4. Click "บันทึกการตั้งค่า"

### Reset a Color

1. Click 🔄 button next to color
2. Color reverts to default

### Reset All Colors

1. Click "รีเซ็ต" in header
2. Confirm dialog
3. All colors reset

### Export Theme

1. Click "ส่งออก"
2. JSON file downloads
3. Save for backup

### Import Theme

1. Click "นำเข้า"
2. Upload JSON or paste
3. Click "นำเข้าธีม"

---

## 💡 Tips & Tricks

### Color Input Methods

- **Visual Picker**: Click color square
- **Hex Code**: Type directly (e.g., `FF5733`)
- **Native Picker**: Click color input button

### Keyboard Shortcuts

- `Tab` - Navigate fields
- `Enter` - Open color picker
- `Esc` - Close modal
- `Ctrl/Cmd + S` - Save (browser default)

### Best Practices

- ✅ Test colors in preview before saving
- ✅ Export theme before major changes
- ✅ Use high contrast colors for accessibility
- ✅ Keep brand consistency
- ✅ Test on mobile devices

---

## 🎯 Common Use Cases

### Scenario 1: Rebrand

```
1. Export current theme (backup)
2. Change primary/secondary colors
3. Update button colors to match
4. Adjust navigation colors
5. Preview and save
```

### Scenario 2: Seasonal Theme

```
1. Export current theme
2. Import seasonal theme JSON
3. Preview changes
4. Save if satisfied
5. Revert by importing original
```

### Scenario 3: A/B Testing

```
1. Export Theme A
2. Create Theme B
3. Export Theme B
4. Switch between by importing
```

---

## 🐛 Troubleshooting

### Colors Not Saving

**Problem**: Changes don't persist  
**Solution**:

- Check browser console for errors
- Verify admin permissions
- Check database connection

### Preview Not Updating

**Problem**: Live preview frozen  
**Solution**:

- Refresh page
- Clear browser cache
- Check for JavaScript errors

### Import Fails

**Problem**: JSON import rejected  
**Solution**:

- Validate JSON format
- Check file structure
- Ensure all required fields present

### Color Picker Not Opening

**Problem**: Native picker doesn't work  
**Solution**:

- Use hex input instead
- Try different browser
- Check browser permissions

---

## 📱 Mobile Usage

### Touch Gestures

- **Tap**: Select color
- **Long Press**: Open native picker
- **Swipe**: Scroll sections
- **Pinch**: Zoom preview (if needed)

### Mobile Tips

- Use landscape for better view
- Native color picker works best
- Preview may be smaller
- All features available

---

## 🔒 Permissions

### Required Role

- **Admin** access only
- Regular users cannot access
- Providers cannot access

### What Admins Can Do

- ✅ View all theme settings
- ✅ Change any color
- ✅ Export theme
- ✅ Import theme
- ✅ Reset to defaults

---

## 📊 Current Default Theme

```json
{
  "skinColor": {
    "primary": "#FFFFFF",
    "secondary": "#0671E3"
  },
  "buttonColor": {
    "normal": "#0B1223",
    "hover": "#DEDEDE"
  },
  "header": {
    "background": "#FFFFFF"
  },
  "footer": {
    "background": "#00000C"
  },
  "headerNav": {
    "normal": "#00000C",
    "hover": "#0B1223"
  },
  "footerNav": {
    "normal": "#FFFFFF",
    "hover": "#FFFFFF"
  }
}
```

---

## 🎓 Video Tutorial

### Coming Soon

- [ ] Basic color customization
- [ ] Export/Import workflow
- [ ] Mobile usage guide
- [ ] Accessibility tips

---

## 📞 Support

### Need Help?

- Check [TESTING-GUIDE.md](./TESTING-GUIDE.md) for detailed testing
- See [IMPLEMENTATION-COMPLETE.md](./IMPLEMENTATION-COMPLETE.md) for technical details
- Contact: Admin Support Team

### Report Issues

- Use admin feedback form
- Include screenshots
- Describe steps to reproduce
- Mention browser/device

---

## ✅ Quick Checklist

Before going live with new theme:

- [ ] Preview looks good
- [ ] Colors have good contrast
- [ ] Tested on mobile
- [ ] Exported backup
- [ ] Team approved
- [ ] Saved successfully

---

**Last Updated**: 2026-01-19  
**Version**: 1.0  
**Status**: Production Ready
