# 3Js_link_Unreal

# BlockLink MVP 0.1

MVP độc lập: điều khiển nhân vật trên **HTML / Three.js**, đồng bộ hình khối, tư thế và ngoại hình vào **level Unreal Engine do bạn chọn**.

## Tải và chạy

**[Tải BlockLink_MVP_v0.1.zip](downloads/BlockLink_MVP_v0.1.zip)** → giải nén → chạy `START_WINDOWS.bat` (cần Python 3.9+). Trang mở ở http://127.0.0.1:8765.

1. Thử nhân vật trong trình duyệt: 8 động tác, đổi áo, biểu cảm, bật/tắt mũ, dừng và tua.
2. Mở project và level môi trường của bạn trong Unreal Editor.
3. Trên web, chọn **Hướng dẫn kết nối** để bật plugin và sao chép lệnh Python đúng đường dẫn.
4. Bấm **Link Unreal**; đợi trạng thái xác nhận Unreal đã áp dụng dữ liệu.
5. Di chuyển hoặc xoay `BL_Anchor_MOVE_ME` trong Outliner để đặt nhân vật trong level.

Không cần Node/npm/pip để sử dụng. Three.js đã đóng gói, không tải CDN khi chạy. HTML, relay và Unreal phải chạy trên cùng máy.

## Phạm vi đã làm

- Nhân vật khối 23 bộ phận, gồm mặt, mũ, áo, quần và giày.
- Đứng, đi bộ, chạy, nhảy, vẫy tay, chỉ tay, nhảy múa và ngồi.
- 4 biểu cảm; đổi màu thân và tay áo; tua thời gian, điều chỉnh tốc độ.
- Relay local Python, bộ nhận Unreal Editor và ACK để báo trạng thái thật từ receiver.
- Hướng dẫn tiếng Việt, test tự động và mã nguồn đầy đủ.

**Đã kiểm thử HTML và local relay. Chưa chạy kiểm chứng bộ nhận trong Unreal Editor thật.** Mục tiêu API: UE5 Editor 5.3+. Cần thử trên phiên bản Unreal và môi trường của bạn.

MVP dùng cho **Editor preview**; chưa gồm PIE/runtime, Live Link chuẩn Epic, skeletal animation, va chạm/IK, Sequencer hoặc xuất phim. Ánh sáng và màu nhìn thấy cuối cùng phụ thuộc level Unreal.

## Tài liệu

- **[Hướng dẫn đầy đủ bằng tiếng Việt](README_VI.md)**
- **[Báo cáo kiểm thử và giới hạn](TEST_REPORT.md)**
- [Bộ nhận Unreal](unreal/blocklink_unreal.py)
- [Giao diện Three.js](web/app.js)

## Kiểm thử

```bash
python -m unittest discover -s tests -v
```

11 kiểm thử Python đã đạt. Test trình duyệt trong `tests/browser.cjs` cần Node và Playwright; hướng dẫn ở đầu file. ACK mô phỏng trong test không được coi là kiểm chứng Unreal thật.

## Giấy phép

Mã MVP: [MIT](LICENSE). Three.js r170: [MIT](web/vendor/THREE-LICENSE.txt).
