# BlockLink MVP 0.1 — HTML / Three.js ↔ Unreal Editor

MVP độc lập, không phụ thuộc hoặc sửa repo nào. Một nhân vật khối có đủ đầu, thân, tay,
chân, giày, mắt, miệng, mũ. 8 động tác: đứng yên, đi bộ, chạy, nhảy, vẫy tay, chỉ tay,
nhảy múa, ngồi. Đổi áo, biểu cảm, mũ; tua/dừng và chỉnh tốc độ. Unreal nhận toàn bộ
transform của từng bộ phận, không chỉ một hình ảnh của nhân vật.

**Phạm vi:** xem nhân vật đồng bộ trong level Unreal do bạn mở. Chạy trong Editor,
không cần bấm Play. Chưa có skeletal animation, va chạm/IK, Live Link chuẩn Epic,
thu vào Sequencer, xuất phim hay chạy trong game đóng gói. Đây là cầu nối HTTP local
riêng, không phải plugin iClone và không gọi AI/MCP trên từng frame.

## 1. Chạy HTML trên Windows

1. Giải nén toàn bộ ZIP, ví dụ `C:\BlockLinkMVP`. Không chạy trực tiếp trong cửa sổ ZIP.
2. Cần Python 3.9 trở lên trên Windows. Nếu chưa có: https://www.python.org/downloads/windows/
   Khi cài, chọn **Add Python to PATH**. Python nhúng trong Unreal không thay thế bước này.
3. Nhấp đúp **START_WINDOWS.bat**. Giữ cửa sổ đen đang chạy.
4. Trang tự mở tại **http://127.0.0.1:8765**. Nếu chưa mở, nhập địa chỉ đó vào Chrome/Edge.
5. Thử các động tác, đổi áo/mũ/mặt, tua thời gian. Kéo chuột để xoay góc nhìn.

Không cần Node, npm hoặc pip. Three.js và giấy phép đã được đóng gói; không cần tải CDN.
Không mở `index.html` bằng double-click/file:// vì ES module và bridge cần HTTP.
macOS/Linux: `python3 server.py` hoặc `sh START_MAC_LINUX.sh`.

## 2. Hiện nhân vật trong môi trường Unreal bạn chọn

Thiết kế cho API Unreal Engine 5 Editor (5.3+); chưa chạy kiểm chứng trên bản Unreal cụ thể.
Nên thử trong bản sao project hoặc level thử nghiệm. Bộ nhận thêm actor và material riêng.

1. Mở project Unreal và level có môi trường bạn muốn dùng.
2. Edit → Plugins: bật **Python Editor Script Plugin** và **Editor Scripting Utilities**.
   Khởi động lại Unreal nếu được yêu cầu.
3. Mở **Window → Developer Tools → Output Log** (hoặc tìm Output Log trong menu Tools tùy phiên bản).
4. Trên trang HTML, bấm **Hướng dẫn kết nối → Sao chép lệnh Python**.
   Lệnh được tạo đúng đường dẫn nơi bạn đã giải nén, kể cả đường dẫn có khoảng trắng.
5. Trong ô nhập của Output Log, chọn chế độ **Python**, dán lệnh rồi Enter.
6. Trở về trang HTML, bấm **Link Unreal**.
7. Khi Unreal nhận và áp dụng dữ liệu, web báo **Đang đồng bộ với Unreal** và hiển thị số frame xác nhận.
8. Trong Outliner tìm **BlockLink_MVP → BL_Anchor_MOVE_ME**. Chọn nó, nhấn **F** để tìm vị trí.
   Di chuyển/ xoay anchor để đặt bàn chân lên mặt đất tại nơi bạn muốn. Không scale anchor.

Anchor được tạo tại vị trí actor đang được chọn khi frame đầu đến; nếu không chọn gì,
anchor đặt ở tọa độ 0,0,0. Tọa độ actor sàn thường ở tâm mesh, không phải mặt trên;
hãy chỉnh độ cao anchor bằng gizmo. Nhân vật không tự dò đất hoặc xử lý vật cản.

Bật **Realtime** của viewport bằng Ctrl+R. Để hai cửa sổ cạnh nhau và giữ tab HTML hiển thị.
Trong Editor Preferences, nếu cần, tắt **Use Less CPU when in Background** để Unreal không giảm nhịp
khi bạn bấm trên web. Tab web bị ẩn/thu nhỏ có thể bị trình duyệt giảm tốc độ.

## 3. Bài test khoảng 3 phút

| Thao tác trên HTML | Kết quả cần thấy ở Unreal |
|---|---|
| Vẫy tay | Cùng cánh tay nâng lên và cùng nhịp chuyển động |
| Nhảy | Toàn thân nhảy lên; tay, chân giữ đúng tư thế |
| Dừng rồi tua đến 2.35 giây | Nhân vật giữ đúng tư thế tại mốc đó |
| Đổi áo đỏ | Thân và hai tay áo đổi đỏ |
| Ngạc nhiên / Buồn | Mắt và các đoạn miệng đổi tương ứng |
| Tắt mũ | Cả mũ và huy hiệu trên mũ biến mất |
| Xoay nhân vật | Toàn bộ nhân vật xoay cùng nhau |
| Bật di chuyển | Nhân vật chuyển động quanh vị trí neo |
| Di chuyển/ xoay BL_Anchor_MOVE_ME | Cả nhân vật chuyển vị trí/ hướng trong level |
| Ngắt link | Unreal giữ tư thế cuối, web tiếp tục xem được |
| Link lại | Unreal tiếp tục nhận dữ liệu mới |

Hình học, màu nền vật liệu, biểu cảm và tư thế được đồng bộ. Màu nhìn thấy trên màn hình
có thể khác do đèn, exposure, tone mapping, bóng và môi trường trong Unreal. Đây là hành vi mong đợi:
Unreal render nhân vật thật sự trong level, không ghép ảnh từ HTML.

## 4. Dừng, dọn nhân vật và đổi level

Chạy các lệnh sau trong **Python** của Output Log:

Dừng nhận nhưng giữ nhân vật:
```python
import builtins; builtins._blocklink_mvp.stop()
```

Dừng và xóa đúng các actor mà phiên kết nối tạo:
```python
import builtins; builtins._blocklink_mvp.stop(remove=True)
```

Khi đổi level, dừng trước, mở level mới rồi chạy lại lệnh setup. Chạy lại setup sẽ dọn
actor của phiên trước còn được theo dõi và tạo phiên mới. Không xóa actor của môi trường.

Material được tạo trong `/Game/BlockLinkMVP`, actor nằm trong thư mục Outliner `BlockLink_MVP`.
Không tự lưu level/project. Nếu bạn Save level, actor sẽ được lưu và vẫn còn ở lần mở sau;
đó là bản tĩnh. Khi bắt đầu phiên mới sau khi mở lại project, xóa thư mục actor BlockLink_MVP
cũ trong Outliner nếu không muốn có hai bản nhân vật. Chỉ xóa đúng thư mục tạo bởi MVP.

## 5. Xử lý khi chưa kết nối

| Hiện tượng | Kiểm tra |
|---|---|
| Không tìm thấy Python | Cài Python 3.9+, thêm PATH, chạy lại BAT |
| Cổng 8765 đang bận | Đóng cửa sổ BlockLink cũ; chỉ chạy một server |
| Web “Đang chờ Unreal” | Chạy lệnh setup trong Output Log ở chế độ Python; nhìn lỗi trong log |
| Web “Unreal đã kết nối” nhưng chưa áp dụng | Bật Realtime, đưa Unreal ra foreground; chờ compile material lần đầu |
| Web báo lỗi Unreal | Sao chép nguyên dòng lỗi; sửa nguyên nhân rồi chạy lại setup |
| Nhân vật ở xa/ dưới mặt đất | Tìm BL_Anchor_MOVE_ME, nhấn F và di chuyển anchor |
| Bấm Play mà không chạy | MVP dùng Editor Python, thử ở chế độ Editor, không PIE |
| Không còn nhận khi đổi level | Chạy lại setup trong level mới |
| Mất một bộ phận do xóa tay trong Outliner | Chạy lại setup để tạo đầy đủ |
| Trình duyệt không hiện 3D | Bật hardware acceleration, kiểm tra driver GPU |

Chỉ hỗ trợ **HTML, Python relay và Unreal chạy trên cùng máy** ở cổng 8765.
Mỗi tab web là một nguồn điều khiển; chỉ bấm Link ở một tab. Không cần mở firewall Internet.

## 6. Cấu trúc và giao thức

- `web/`: giao diện và nhân vật Three.js tự dựng; vendor Three.js r170 (MIT).
- `server.py`: server local bằng thư viện chuẩn Python, chỉ bind 127.0.0.1.
- `unreal/blocklink_unreal.py`: nhận trong thread nền, áp dụng qua Slate tick ở thread Editor.
- `unreal/bridge_math.py`: đổi tọa độ, quaternion và màu sRGB → linear.
- `tests/`: kiểm thử dữ liệu, biến đổi tọa độ và trình duyệt.
- `TEST_REPORT.md`: phạm vi đã kiểm thử và phần chưa được kiểm chứng.

Frame: `{version:1, time, animation, parts:[{id,p:[x,y,z],q:[x,y,z,w],s:[sx,sy,sz],color:'#rrggbb',visible:true}]}`.
`p`, `q`, `s` là world transform trong hệ Three.js; `s` là kích thước khối unit cube.
Đổi trục `UE(X,Y,Z) = Three(Z,X,Y)`, 1 đơn vị = 35 cm; nhân vật cao khoảng 1.87 m khi đội mũ.
Đổi quaternion bằng phép đổi cơ sở tương ứng; áp dụng thêm vị trí và quaternion của anchor.
Cube Unreal mặc định rộng 100 cm nên scale mesh = kích thước đổi trục × 35 / 100.
Browser gửi tối đa 30 frame/s, một request đang gửi tại một thời điểm. Receiver giữ frame mới nhất,
bỏ frame cũ nếu chậm, không phát lại hàng đợi. ACK chỉ cập nhật sau khi áp dụng toàn bộ frame.
Đây là preview gần thời gian thực, không đồng bộ frame chính xác cho render phim.

## 7. Kiểm thử và nguồn API

Python (không cần Unreal): `python -m unittest discover -s tests -v`.
Browser test dành cho lập trình viên: cần Node và Playwright; xem đầu file `tests/browser.cjs`.
Test nhận thực tế trong Unreal vẫn cần thực hiện theo bảng ở mục 3.

- https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/EditorActorSubsystem
- https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/MaterialEditingLibrary
- https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/module/unreal
- https://dev.epicgames.com/documentation/en-us/unreal-engine/python-api/class/Transform
- https://threejs.org/

Mã riêng của MVP được cung cấp theo MIT, xem LICENSE. Three.js có giấy phép riêng trong web/vendor.
