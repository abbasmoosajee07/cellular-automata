import subprocess
import shutil
import os
import sys

def run(cmd, cwd=None):
    """Run a command and exit on failure."""
    print(f"▶ Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd)
    if result.returncode != 0:
        print("❌ Command failed")
        sys.exit(result.returncode)

def main():
    project_root = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(project_root, "pkg")
    target_dir = os.path.join(project_root, "dist")

    # Detect flags
    is_release = "--release" in sys.argv
    should_serve = "--serve" in sys.argv

    # 1. Build the WASM module
    cmd = ["wasm-pack", "build", "--target", "web"]
    if is_release:
        cmd.append("--release")
        print("🔧 Building in RELEASE mode (optimized, smaller WASM)...")
    else:
        print("🧪 Building in DEBUG mode (fast, unoptimized)...")

    run(cmd)

    # 2. Copy WASM build output to dist/
    os.makedirs(target_dir, exist_ok=True)
    for f in os.listdir(output_dir):
        src = os.path.join(output_dir, f)
        dst = os.path.join(target_dir, f)
        print(f"📦 Copying {f} → dist/")
        shutil.copy2(src, dst)

    # 3. (Optional) Serve the output for local testing
    if should_serve:
        print("🚀 Serving on http://localhost:8000 (Ctrl+C to stop)")
        run(["python", "-m", "http.server", "8000"])

if __name__ == "__main__":
    main()
