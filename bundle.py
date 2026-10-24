import os

base_dir = r"d:/โปรเจ็คทั้งหมด/Auu"
index_path = os.path.join(base_dir, "index.html")
style_path = os.path.join(base_dir, "style.css")
app_path = os.path.join(base_dir, "app.js")
out_path = os.path.join(base_dir, "KHelps_SLA_Dashboard_Single.html")

with open(index_path, "r", encoding="utf-8") as f:
    html = f.read()
with open(style_path, "r", encoding="utf-8") as f:
    css = f.read()
with open(app_path, "r", encoding="utf-8") as f:
    js = f.read()

html = html.replace('<link rel="stylesheet" href="style.css">', f"<style>\n{css}\n</style>")
html = html.replace('<script src="app.js"></script>', f"<script>\n{js}\n</script>")

with open(out_path, "w", encoding="utf-8") as f:
    f.write(html)

print("Bundled successfully! Size:", len(html), "bytes")
