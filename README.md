# Kinx's Lab | SOJI Studio — Photo Frame Generator

Công cụ web tự động gắn thông số EXIF và thương hiệu cá nhân lên ảnh — chạy hoàn toàn trên trình duyệt, không cần server, không rời khỏi máy bạn một byte nào.

**Live:** https://b2110270-d51c6.web.app

---

## Tính Năng

- Đọc EXIF tự động — trích xuất máy ảnh, ống kính, khẩu độ, tốc độ, ISO, ngày chụp, GPS từ JPEG / HEIC
- 5 template khung ảnh — từ tối giản đến nghệ thuật
- Nhận diện logo hãng — tự động detect và chèn logo Canon, Sony, Fujifilm, Apple, ...
- Watermark cá nhân — upload logo studio của riêng bạn
- Xuất hàng loạt — tải xuống toàn bộ ảnh đã xử lý cùng lúc
- 100% client-side — ảnh không rời khỏi thiết bị của bạn
- Tương thích mọi nền tảng — bao gồm iOS / Safari (sử dụng Stack Blur thay vì `ctx.filter`)

---

## Các Template Khung Ảnh

| Template | Tên file | Mô tả |
|---|---|---|
| iPhone Style | `iphoneFrame.js` | Panel trắng bên dưới, icon máy ảnh trung tâm, EXIF hai bên |
| Cinema Blur | `blurFrame.js` | Nền blur mờ mịn từ chính bức ảnh, text overlay góc dưới |
| Glass Morphism | `glassFrame.js` | Card kính nổi, nền blur, typography lớn |
| Live View | `liveViewFrame.js` | Giả lập màn hình kính ngắm máy ảnh, HUD + histogram thời gian thực |
| Film Negative | `filmFrame.js` | Viền film âm bản, lỗ sprocket, chữ Kodak-style |

### Thêm Template Mới

Tạo file `src/templates/myTemplate.js` theo cấu trúc:

```js
export const myTemplate = {
  name: "my_style",       // ID dùng trong render logic
  label: "My Template",   // Hiển thị trên UI
  font: "Inter, sans-serif",
  layout: {
    paddingPercent: 5,
    // ... các tham số bố cục khác
  }
};
```

Rồi đăng ký trong `App.jsx` tại mảng `TEMPLATES`.

---

## Kiến Trúc Hệ Thống

```
src/
├── App.jsx                        # State trung tâm, điều phối toàn bộ UI
├── index.css                      # Design tokens (CSS variables), Light/Dark mode, Responsive
│
├── components/
│   ├── FrameCanvas.jsx            # Canvas preview realtime
│   ├── TemplateSelector.jsx       # UI chọn template
│   └── Upload.jsx                 # Drag-and-drop upload zone
│
├── templates/
│   ├── iphoneFrame.js
│   ├── blurFrame.js
│   ├── glassFrame.js
│   ├── liveViewFrame.js
│   └── filmFrame.js
│
└── utils/
    ├── extractExif.js             # Đọc EXIF từ file ảnh (dùng exifr)
    ├── formatMetadata.js          # Format chuỗi EXIF (f/2.8, 1/250s, ISO 400, ...)
    ├── imageOptimization.js       # Resize ảnh về max 1920px cho preview
    ├── softwareBlur.js            # Stack Blur cross-browser (thay thế ctx.filter)
    └── generateFrame.js           # Renderer cho chức năng export full-res
```

### Luồng Dữ Liệu

```mermaid
graph TD
    A[Upload ảnh] --> B[extractExif.js]
    A --> C[imageOptimization.js]
    B --> D[App State: photos]
    C --> D

    D --> E[FrameCanvas.jsx - Preview realtime]
    D --> F[generateFrame.js - Export full-res]

    G[User: chọn template, chỉnh font, logo] --> E
    G --> F

    F --> H[Batch download .jpg]
```

---

## Tại Sao Dùng `softwareBlur` Thay Vì `ctx.filter`?

Tất cả trình duyệt trên **iOS** (Safari, Chrome, Edge, Firefox) đều sử dụng WebKit engine và **không hỗ trợ `ctx.filter`** trong Canvas 2D API.

File `src/utils/softwareBlur.js` dùng thuật toán **Stack Blur** (qua thư viện [`stackblur-canvas`](https://github.com/flozz/StackBlur)) để tạo hiệu ứng blur chất lượng cao trên mọi nền tảng:

```js
// Thay vì:
ctx.filter = `blur(45px)`;  // Không hoạt động trên iOS

// Dùng:
softwareBlur(ctx, img, dx, dy, dw, dh, radius, brightness);  // Cross-browser
```

Blur được thực hiện trên canvas thu nhỏ (max 800px) để đảm bảo hiệu năng trên mobile, sau đó scale ngược lên canvas đích.

---

## Hướng Dẫn Phát Triển

**Yêu cầu:** Node.js 18+, npm 9+

```bash
# Cài dependencies
npm install

# Dev server (http://localhost:5173)
npm run dev

# Build production
npm run build

# Deploy lên Firebase
npx firebase-tools deploy --only hosting
```

> Firebase project ID: `b2110270-d51c6`  
> Public directory: `dist` — SPA rewrite về `index.html` (xem `firebase.json`)

---

## Stack Kỹ Thuật

| Thành phần | Công nghệ |
|---|---|
| Framework | React 18 + Vite 7 |
| Canvas Rendering | HTML5 Canvas 2D API |
| Blur cross-platform | stackblur-canvas |
| EXIF parsing | exifr |
| EXIF copy-to-output | piexifjs |
| Styling | Vanilla CSS (Design Tokens) |
| Hosting | Firebase Hosting |
