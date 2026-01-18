# 🎮 Drag and Drop Game - Hệ Thống Quản Lý & Trò Chơi Trực Tuyến

Chào mừng bạn đến với dự án **Drag and Drop Game**! Đây là một nền tảng trò chơi giáo dục/giải trí cho phép người quản trị tạo các màn chơi tương tác (ghép chữ từ hình ảnh) và người chơi tham gia vào các phòng thi đấu trực tuyến.

---

## 🚀 Tính năng chính

### 🛠️ Dành cho Quản trị viên (Admin Dashboard)
*   **Xác thực & Phân quyền:** Hệ thống đăng nhập/đăng ký với cơ chế phê duyệt tài khoản (ROOT user mới có quyền duyệt admin mới).
*   **Quản lý Phòng chơi (Room Management):**
    *   Tạo phòng chơi mới.
    *   Xem danh sách người chơi trong phòng theo thời gian thực (bảng xếp hạng Score).
    *   Kích hoạt trạng thái phòng (Bắt đầu/Kết thúc).
*   **Quản lý Màn chơi (Level Management):**
    *   Upload hình ảnh câu hỏi.
    *   Thiết lập đáp án, gợi ý và giới hạn thời gian (Time Limit).
    *   Tùy chỉnh thứ tự các màn chơi trong mỗi phòng.

### 🕹️ Dành cho Người chơi (Client)
*   **Sảnh chờ (Lobby):** Xem danh sách các phòng đang chờ hoặc đang diễn ra.
*   **Trình chơi Game:**
    *   Giao diện kéo thả hiện đại để sắp xếp các chữ cái thành đáp án đúng.
    *   Tính điểm dựa trên thời gian hoàn thành.
    *   Tự động chuyển màn khi trả lời đúng.
    *   Bảng xếp hạng cá nhân sau khi kết thúc.

---

## 🛠️ Công nghệ sử dụng

### Backend
*   **Ngôn ngữ:** Java 21
*   **Framework:** Spring Boot 4.0.1
*   **Database:** MySQL (Spring Data JPA)
*   **Lưu trữ:** Local storage (Hệ thống lưu file tự động tạo thư mục `uploads/`)

### Frontend
*   **Giao diện:** HTML5, CSS3 (Vanilla CSS với phong cách Glassmorphism/Modern UI).
*   **Logic:** Javascript (Vanilla JS), Fetch API, CSS Grid/Flexbox.
*   **Fonts:** Google Fonts (Outfit, Inter).

---

## 📋 Yêu cầu hệ thống
*   **JDK 21** trở lên.
*   **Maven 3.6+**.
*   **MySQL Server**.

---

## ⚙️ Cài đặt & Chạy ứng dụng

### 1. Cấu hình Cơ sở dữ liệu
Tạo database MySQL và cập nhật file `src/main/resources/application.properties`:
```properties
spring.datasource.url=jdbc:mysql://localhost:3306/dragdrop_db
spring.datasource.username=YOUR_USERNAME
spring.datasource.password=YOUR_PASSWORD
spring.jpa.hibernate.ddl-auto=update
```

### 2. Chạy ứng dụng bằng Maven
Mở terminal tại thư mục gốc và chạy:
```bash
./mvnw spring-boot:run
```

Sau khi chạy thành công, ứng dụng sẽ có tại: `http://localhost:8080`

### 3. Tài khoản mặc định
Khi khởi tạo lần đầu, bạn có thể đăng ký tài khoản mới. Lưu ý:
*   Tài khoản đầu tiên nên được set role `ROOT` thủ công trong database để có quyền duyệt các Admin khác.

---

## 📁 Cấu trúc thư mục
```text
DragAndDrop/
├── src/main/java/com/game/dragdrop/
│   ├── controller/      # Xử lý API (Auth, Admin, Room, Game)
│   ├── model/           # Các thực thể database (User, Level, Room...)
│   ├── service/         # Logic nghiệp vụ (Storage, Game logic)
│   └── repository/      # Giao tiếp database
├── src/main/resources/
│   ├── static/          # Giao diện Frontend
│   │   ├── admin/       # Dashboard cho quản lý
│   │   ├── client/      # Giao diện người chơi
│   │   └── uploads/     # Nơi lưu hình ảnh màn chơi
│   └── application.properties # Cấu hình hệ thống
└── pom.xml              # Quản lý dependencies
```

---