import subprocess
import shutil
import os
import sys

def run(cmd, cwd=None):
    print(f"▶ Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        print("❌ Command failed")
        sys.exit(result.returncode)

def main():
    project_root = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(project_root, "pkg")   # wasm-pack output (keep name)
    target_dir = os.path.join(project_root, "dist")  # deploy folder
    pkg_target = os.path.join(target_dir, "pkg")     # copy pkg → dist/pkg

    # 1. Build the WASM module
    if "--release" in sys.argv:
        run(["wasm-pack", "build", "--release", "--target", "web"])
    else:
        run(["wasm-pack", "build", "--target", "web"])

    # 2. Prepare dist folder
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
    os.makedirs(target_dir, exist_ok=True)

    # 3. Copy WASM pkg to dist/pkg
    print("📦 Copying pkg → dist/pkg/")
    shutil.copytree(output_dir, pkg_target)

    # 4. Copy root HTML/CSS/JS/assets
    assets = ["index.html", "styles.css", "scripts", "grids", "renderer", "assets"]
    for asset in assets:
        src = os.path.join(project_root, asset)
        dst = os.path.join(target_dir, asset)
        if os.path.exists(src):
            if os.path.isdir(src):
                shutil.copytree(src, dst)
                print(f"📂 Copying folder {asset} → dist/")
            else:
                shutil.copy2(src, dst)
                print(f"📄 Copying file {asset} → dist/")

    # 5. (Optional) Serve dist folder
    if "--serve" in sys.argv:
        print("🚀 Serving on http://localhost:8000")
        os.chdir(target_dir)
        run(["python", "-m", "http.server", "8000"], cwd=target_dir)

if __name__ == "__main__":
    main()
