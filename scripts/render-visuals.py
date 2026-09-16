"""Convert only this course's maintained SVGs; never upload or process user files."""
import argparse
import hashlib
import json
import re
import shutil
import tempfile
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Render the two maintained course images.")
    parser.add_argument("--publish", action="store_true", help="Replace formal PNGs and their manifest after both render.")
    args = parser.parse_args()
    try:
        import cairosvg
        from PIL import Image
    except ImportError as exc:
        raise SystemExit("缺少可选 CairoSVG。维护者按 requirements-visuals.txt 配置；已有课程 PNG 不受影响。") from exc
    root = Path(__file__).resolve().parent.parent
    preview = root / ".lesson-preview"
    preview.mkdir(exist_ok=True)
    output = Path(tempfile.mkdtemp(prefix="visuals-", dir=preview))
    images = []
    # No glob over previous output: removed diagrams cannot reappear in a new run.
    for name, width, height in [("flow", 520, 650), ("evidence", 520, 570)]:
        source, image = f"course/assets/{name}.svg", f"course/assets/{name}.png"
        content = (root / source).read_bytes()
        if re.search(rb"<script|foreignObject|\bonload\s*=|href\s*=|<!ENTITY", content, re.I):
            raise ValueError("仅转换本课程不含脚本或外部资源的受信 SVG；不是通用上传图片服务")
        destination = output / f"{name}.png"
        cairosvg.svg2png(bytestring=content, write_to=str(destination), output_width=width, output_height=height)
        # 机制不依赖颜色；用单色 PNG 保持资源小、便于跨会话交付。
        with Image.open(destination) as original:
            background = Image.new("RGB", original.size, "white")
            background.paste(original, mask=original.getchannel("A") if original.mode == "RGBA" else None)
            monochrome = background.convert("L").point(lambda x: 0 if x < 210 else 255, mode="1")
            monochrome.save(destination, optimize=True)
        data = destination.read_bytes()
        if not data.startswith(b"\x89PNG\r\n\x1a\n"):
            raise ValueError("渲染产物不是 PNG")
        images.append(dict(id=name, source=source, image=image, sourceHash=hashlib.sha256(content).hexdigest(),
                           imageHash=hashlib.sha256(data).hexdigest(), width=width, height=height))
    manifest = dict(version=1, kind="original-mechanism-illustrations", renderer=f"CairoSVG {cairosvg.__version__} + Pillow monochrome", images=images)
    text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    (output / "manifest.json").write_text(text, encoding="utf-8")
    if args.publish:
        for entry in images:
            shutil.copyfile(output / f"{entry['id']}.png", root / entry["image"])
        (root / "course/assets/manifest.json").write_text(text, encoding="utf-8")
    print(f"已生成 {len(images)} 张 PNG：{output}；{'已发布课程图片与清单' if args.publish else '仅本地预览'}。视觉检查须单独完成。")


if __name__ == "__main__":
    main()
