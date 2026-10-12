# CrabSense 3D

Mod Minecraft Fabric **1.21.11** mô hình hệ thống RAS nuôi cua: hộp nuôi, drum filter, bể, bơm, kệ, và phụ kiện ống PVC.

Namespace trong game: `crabsense_ras`.

## Chạy gì

| Việc | Dùng |
| --- | --- |
| Sửa hình khối / xem 3D | Blockbench + file `.bbmodel` trong `preview/` |
| Đưa model vào game | JSON trong `src/main/resources/assets/crabsense_ras/` |
| Logic block (nối ống, xoay T/L, drum tick) | Java trong `src/main/java/com/crabsense/ras/` |
| Build jar | `gradlew.bat build` → `build/libs/` |
| Chơi luôn | copy `release-mods/crabsense-ras-1.0.0.jar` vào `.minecraft/mods` cùng Fabric API |

Cần Java 21, Fabric Loader ≥ 0.19.5, Minecraft `1.21.11`.

## Cấu trúc thư mục

```
├── src/main/java/...          logic block / renderer
├── src/main/resources/...     model, texture, blockstate, lang (cái game đọc)
├── preview/                   nguồn Blockbench + ảnh render (không load trực tiếp trong game)
├── tools/                     script sinh model, kiểm tra asset, nói chuyện Blockbench MCP
├── release-mods/              jar đã build sẵn
├── gradle*                    build Fabric Loom
└── README.md
```

`build/`, `.gradle/`, `run/` bị ignore — không commit.

---

### `src/main/java/com/crabsense/ras/`

| File | Dùng để |
| --- | --- |
| `RasMod.java` | Đăng ký mod, gọi `RasBlocks` / `RasBlockEntities` |
| `block/RasBlocks.java` | Khai báo mọi block + item: tank, pump, rack, crab_box, drum_filter, pvc_tee, pvc_elbow, pvc_cap |
| `block/CrabBoxBlock.java` | Hai hộp kề nhau thì ống xả đáy nối đáy, xả mặt nối mặt |
| `block/DrumFilterBlock.java` + `DrumFilterBlockEntity.java` | Drum + tick phun rửa |
| `block/PvcFittingBlock.java` | Tê / co 90 / nút bịt; tự lấy DN từ ống cạnh; click để xoay nhánh |
| `block/PipeSize.java` | DN27 (xả mặt hộp), DN34 (xả đáy hộp), DN60 (drum) |
| `block/PipeSizes.java` | Đo click gần cổng nào trên hộp để chọn DN |
| `block/PipeBend.java` | Nhánh T/L: trái / phải / lên |
| `client/RasModClient.java` | Đăng ký renderer phía client |
| `client/DrumFilterRenderer.java` + `DrumFilterModel.java` | Lưới drum (animation texture, không xoay mesh runtime) |

---

### `src/main/resources/assets/crabsense_ras/`

Đây là phần **Minecraft thật sự dùng**.

| Thư mục | Dùng để |
| --- | --- |
| `blockstates/` | Chọn model theo hướng, DN, hộp kề nhau. `crab_box.json` là multipart (thân hộp + ống). `pvc_*.json` là T/L/bịt |
| `models/block/` | Hình khối từng chi tiết |
| `models/item/` | Icon trong túi đồ |
| `items/` | Định nghĩa item 1.21.4+ (thiếu thì inventory bị texture thiếu) |
| `textures/block/` | PNG pixel. `drum_mesh.png` + `.mcmeta` = lưới chạy |
| `lang/en_us.json`, `vi_vn.json` | Tên block/item |
| `icon.png` | Icon mod |

**Model block quan trọng**

| File / pattern | Là gì |
| --- | --- |
| `models/block/crab_box.json` | Thân hộp, cửa lưới, 2 ống xả |
| `crab_box_pipe_drops.json` | Đoạn đứng từ cổng xuống manifold |
| `crab_box_pipe_bottom_*.json` | Ống ngang **xả đáy DN34** (n/s luôn thò ra; e/w khi có hộp kề) |
| `crab_box_pipe_surface_*.json` | Ống ngang **xả mặt DN27** |
| `drum_filter.json` | Drum trong game |
| `pvc_tee.json` / `pvc_elbow.json` / `pvc_cap.json` | Mẫu mặc định DN34 (inventory) |
| `pvc_*_dn27.json` | Gắn ống mặt hộp |
| `pvc_*_dn34.json` | Gắn ống đáy hộp |
| `pvc_*_dn60.json` | Gắn drum |
| `pvc_*_dnXX_box_<hướng>_<bend>.json` | Khi đặt sát hộp: hạ model xuống đúng ống, không treo giữa khối |

**Texture**

| File | Gắn vào |
| --- | --- |
| `crab_box.png`, `box_flat.png`, `crab_box_dark.png` | Thân / đáy hộp |
| `door_flat.png` | Cửa lưới |
| `drum_housing.png`, `drum_mesh.png`, `drum_metal.png`, `drum_pvc.png`, `drum_waste.png`, `drum_water.png`, `drum_motor.png` | Drum |
| `tank.png`, `pump.png`, `rack.png` | Bể, bơm, kệ |

---

### Block trong game

| Block | Việc |
| --- | --- |
| `crab_box` | Hộp nuôi. Cửa lưới một mặt. Xả mặt DN27, xả đáy DN34, ống thò hai đầu để tự gắn T/L/bịt |
| `drum_filter` | Trống lọc; IN/OUT DN60, xả cặn DN34 |
| `tank` | Bể |
| `pump` | Bơm |
| `rack` | Kệ (placeholder) |
| `pvc_tee` | Tê. Đặt sát ống thì tự DN. Click xoay nhánh |
| `pvc_elbow` | Co 90°. Cùng cách DN + xoay |
| `pvc_cap` | Nút bịt đầu ống |

Cỡ ống (khớp CAD RAS): hộp mặt **27**, hộp đáy **34**, drum **60**.

---

### `preview/`

Nguồn 3D để mở bằng Blockbench. Game **không** đọc `.bbmodel`.

| File | Dùng để |
| --- | --- |
| `crab_box_fixed.bbmodel` | Hộp cua đang làm |
| `drum_filter.bbmodel` | Drum đủ chi tiết |
| `rotary_drum_filter.bbmodel` | Bản drum khác / exploded |
| `tank.bbmodel`, `pump.bbmodel`, `rack.bbmodel` | Bể, bơm, kệ |
| `renders/` | Ảnh chụp các góc |
| `viewer/*.html` | Xem nhanh trên trình duyệt |
| `assets/` | Bản export cũ, tham khảo |

Sửa xong `.bbmodel` thì export Java Block JSON vào `src/main/resources/...` rồi build lại.

---

### `tools/`

Script máy, không vào jar (trừ khi copy tay).

| Script | Dùng để |
| --- | --- |
| `bb_mcp.mjs` | Gọi Blockbench MCP (`localhost:3000/bb-mcp`) |
| `gen_crab_pipe_models.mjs` | Sinh ống manifold dưới hộp |
| `gen_pvc_fittings.mjs` | Sinh T / co / bịt theo DN và hướng |
| `check_assets.ps1` | Kiểm tra mỗi block đủ blockstate + model + item + lang + texture |
| `check_pipe_dn.mjs` | Kiểm tra DN34 > DN27 > và drum 60 |
| `bb_build_drum*.mjs`, `drum_spray.mjs` | Dựng / preview drum |
| Các `fix_*.mjs`, `stretch_*.mjs` | Sửa hộp lúc làm Blockbench |

---

### `release-mods/`

| File | Dùng để |
| --- | --- |
| `crabsense-ras-1.0.0.jar` | Mod đưa vào `mods/` |
| `fabric-api-0.141.6+1.21.11.jar` | Dependency đi kèm bản 1.21.11 |

Build mới: `gradlew.bat build`, lấy jar trong `build/libs/`.

---

## Luồng sửa model

1. Mở `preview/*.bbmodel` trong Blockbench.
2. Export / ghi JSON vào `src/main/resources/assets/crabsense_ras/models/block/`.
3. `powershell -File tools/check_assets.ps1`
4. `gradlew.bat build` rồi copy jar vào `mods/`.
5. Thoát Minecraft hẳn rồi vào lại.

Sửa logic ống / xoay phụ kiện thì sửa Java, không sửa JSON cho xong.
