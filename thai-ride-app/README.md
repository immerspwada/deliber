# Thai Ride App - ระบบเรียกรถไทย

แอปพลิเคชัน Progressive Web App (PWA) สำหรับบริการเรียกรถ ส่งของ และซื้อของ ในประเทศไทย

## ฟีเจอร์หลัก

- 🚗 **เรียกรถ** - บริการรับส่งที่สะดวกและปลอดภัย
- 📦 **ส่งของ** - ส่งของรวดเร็วและเชื่อถือได้
- 🛒 **ซื้อของ** - มีคนไปซื้อของให้คุณ
- 📱 **PWA** - ใช้งานได้เหมือนแอปดั้งเดิม
- 🇹🇭 **ภาษาไทย** - รองรับภาษาไทยเต็มรูปแบบ
- 💳 **ชำระเงิน** - รองรับ PromptPay และระบบธนาคารไทย

## เทคโนโลยี

- **Frontend**: Vue.js 3 + TypeScript + Vite
- **UI**: Tailwind CSS (Uber-like design)
- **PWA**: Vite PWA Plugin + Workbox
- **State Management**: Pinia
- **Router**: Vue Router 4
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Maps**: Google Maps API
- **Testing**: Vitest + Vue Test Utils + Fast-check

## การติดตั้ง

1. Clone repository
```bash
git clone <repository-url>
cd thai-ride-app
```

2. ติดตั้ง dependencies
```bash
npm install
```

3. ตั้งค่า environment variables
```bash
cp .env.example .env
# แก้ไขค่าใน .env ตามที่ต้องการ
```

4. รันแอปพลิเคชัน
```bash
npm run dev
```

## Scripts

- `npm run dev` - รัน development server
- `npm run build` - build สำหรับ production
- `npm run preview` - preview build
- `npm run test` - รัน tests
- `npm run test:watch` - รัน tests แบบ watch mode
- `npm run test:ui` - รัน tests พร้อม UI

## โครงสร้างโปรเจค

```
thai-ride-app/
├── public/                 # Static assets
├── src/
│   ├── components/         # Vue components
│   ├── views/             # Page components
│   ├── router/            # Vue Router configuration
│   ├── stores/            # Pinia stores
│   ├── tests/             # Test files
│   └── utils/             # Utility functions
├── .env                   # Environment variables
└── vite.config.ts         # Vite configuration
```

## การพัฒนา

### การเพิ่มฟีเจอร์ใหม่

1. สร้าง component ใน `src/components/`
2. สร้าง view ใน `src/views/`
3. เพิ่ม route ใน `src/router/index.ts`
4. เขียน test ใน `src/tests/`

### การทดสอบ

- **Unit Tests**: ใช้ Vitest + Vue Test Utils
- **Property-Based Tests**: ใช้ Fast-check
- **E2E Tests**: จะเพิ่มในอนาคต

### PWA Features

- ✅ Service Worker
- ✅ Web App Manifest
- ✅ Offline Support
- ✅ Install Prompt
- ✅ Push Notifications (พร้อมใช้งาน)

## การ Deploy

1. Build แอปพลิเคชัน
```bash
npm run build
```

2. Deploy ไฟล์ใน `dist/` ไปยัง hosting service
   - Vercel (แนะนำ)
   - Netlify
   - Firebase Hosting

## การมีส่วนร่วม

1. Fork repository
2. สร้าง feature branch
3. Commit การเปลี่ยนแปลง
4. Push ไปยัง branch
5. สร้าง Pull Request

## License

MIT License

## ติดต่อ

สำหรับคำถามหรือข้อเสนอแนะ กรุณาติดต่อผ่าน GitHub Issues