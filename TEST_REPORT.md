# BlockLink MVP 0.1 — kiểm chứng ngày 11/11/2026

## Kết quả thực tế

| Kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| Python unit/integration | PASS — 11 tests | Server thật local, validation, đổi trục, scale, quaternion, anchor, sRGB, ACK, path setup |
| JavaScript syntax | PASS | `web/app.js` |
| Python syntax | PASS | Server + script Unreal + bridge_math |
| WebGL trong Chromium headless | PASS | Nhân vật hiển thị thật bằng Three.js r170 |
| 8 động tác | PASS | Lấy frame ở nhiều thời điểm; động tác động có thay đổi; point/sit là pose tĩnh |
| Tua tới / lui | PASS | Quay về cùng thời gian cho cùng dữ liệu frame |
| Đầy đủ nhân vật | PASS ở HTML | 23 mesh; mọi frame có đủ ID, vector hữu hạn, quaternion chuẩn hóa |
| Ngoại hình | PASS | Thân + hai tay áo đổi màu; 4 biểu cảm; 3 bộ phận mũ ẩn/hiện cùng nhau |
| HTML → local relay | PASS | Gửi HTTP thật từ trang, server nhận đầy đủ frame |
| Trạng thái Unreal trên web | PASS với receiver mô phỏng | Chỉ xanh sau ACK; mất ACK chuyển chờ; báo lỗi khi receiver trả lỗi |
| Desktop/mobile | PASS | Kiểm tra ảnh 1440×1000 và 390×844, sửa chồng chữ ở mobile |
| Lỗi JavaScript / tài nguyên bên ngoài | PASS | Không pageerror; không request Internet khi chạy web |
| Unreal Editor thật | NOT_RUN | Môi trường kiểm thử không có Unreal Editor |
| Windows .bat / GPU máy người dùng | NOT_RUN | Chưa chạy trực tiếp trên Windows |

**Không coi ACK mô phỏng hoặc Python syntax PASS là kiểm chứng tích hợp Unreal.**
Script Unreal đã viết và đối chiếu API công khai, nhưng khả năng tạo actor/material,
hiển thị 23 bộ phận, cập nhật viewport và hiệu năng trên version/project của người dùng
cần kiểm chứng bằng bài test trong README_VI.md. Chưa công bố hỗ trợ đã được kiểm chứng cho
một phiên bản Unreal cụ thể; mục tiêu là UE5 Editor 5.3+.

## Lệnh đã chạy

```bash
python3 -m unittest discover -s tests -v
python3 -m py_compile server.py unreal/blocklink_unreal.py unreal/bridge_math.py
node --input-type=module --check < web/app.js
node tests/browser.cjs
```

Browser test chạy bằng Playwright với Chrome Headless Shell 131.0.6778.204, SwiftShader;
đặt `BROWSER_BIN`, `NODE_PATH`, `BL_TEST_OUTPUT` theo môi trường thực thi. Server được
test script mở và đóng trong cùng lần chạy. Không thay đổi mã sản phẩm để mô phỏng kết quả.
Kiểm thử tọa độ bao gồm 120 quaternion ngẫu nhiên có seed để kiểm tra phép đổi cơ sở.

## Giới hạn của MVP

- Local cùng máy; một nguồn web; không yêu cầu AI trong luồng frame.
- Editor preview, không phải Live Link chuẩn Epic, không PIE/runtime/Sequencer/render export.
- Khối cứng; chưa skeletal mesh, IK, vật lý, tự dò đất, tự né vật cản.
- Kích thước/pose/vật liệu nền giống nguồn; ảnh cuối khác do ánh sáng của level.
- HTTP tối đa 30 lần gửi/s, lấy frame mới nhất; chưa đo hoặc đảm bảo 30 FPS ở Unreal.
- Source tab bị ẩn hoặc Unreal hạn chế CPU nền có thể làm chuyển động chậm.
- Material compile lần đầu có thể cần chờ; các asset mới không tự lưu.

## Thành phần phân phối

Mã độc lập được viết cho MVP. Three.js 0.170.0 lấy từ npm chính thức, đóng gói kèm MIT license.
ZIP không chứa repo trước đó, ảnh browser QA, thư mục cache, dependency cài để test,
binary trình duyệt hoặc báo cáo mang trạng thái Unreal đã chạy thành công.
