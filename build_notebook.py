import json, os, copy

SRC = r'C:\Daon_Master_Project\daon\daon-music-studio-v2\acestep-1-5-xl-turbo-4b-kaggle-t4-gpu.ipynb'
DST_DIR = r'C:\Daon_Master_Project\daon\daon-music-studio-v3'
DST = os.path.join(DST_DIR, 'ACE_Step_XL_Ngrok_Kaggle.ipynb')

os.makedirs(DST_DIR, exist_ok=True)

with open(SRC, 'r', encoding='utf-8') as f:
    nb = json.load(f)

nb = copy.deepcopy(nb)

# ============================================================
# Cell 4 (index 4, code): Add FastAPI/Ngrok deps alongside existing
# ============================================================
cell4_src = nb['cells'][4]['source']
cell4_text = ''.join(cell4_src) if isinstance(cell4_src, list) else cell4_src
cell4_text = cell4_text.replace(
    '!pip install --timeout 120 --retries 5 -q mmgp gradio',
    '!pip install --timeout 120 --retries 5 -q mmgp gradio fastapi uvicorn python-multipart pyngrok'
)
nb['cells'][4]['source'] = [l + '\n' for l in cell4_text.split('\n')[:-1]] + [cell4_text.split('\n')[-1]]

# ============================================================
# Cell 7 (index 7, markdown): Update section title
# ============================================================
nb['cells'][7]['source'] = ["## 📝 Cell 4 — Write API Server Script (Ngrok)\n"]

# ============================================================
# Cell 8 (index 8, code): Replace Gradio UI section with FastAPI
# ============================================================
cell8_src = nb['cells'][8]['source']
cell8_text = ''.join(cell8_src) if isinstance(cell8_src, list) else cell8_src

marker = '# ==== GRADIO UI ===='
marker_pos = cell8_text.find(marker)
if marker_pos == -1:
    raise ValueError("Could not find '# ==== GRADIO UI ====' marker in cell 8!")

keep_part = cell8_text[:marker_pos]

fastapi_code = '''# ==== FASTAPI API SERVER (Ngrok 원격 접속용 — Gradio UI 대체) ====
import json as _json
import uuid as _uuid
import threading
import os
import sys
import gc
import traceback
import psutil
import torch
from typing import Optional
from fastapi import FastAPI, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import uvicorn

app = FastAPI(title="Daon Music Studio API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_tasks = {}
_lock = threading.Lock()


@app.get("/health")
def api_health():
    try:
        vram = torch.cuda.mem_get_info()[0] / 1024**3
    except Exception:
        vram = 0.0
    try:
        ram_avail = psutil.virtual_memory().available / 1024**3
    except Exception:
        ram_avail = 0.0
    return {
        "status": "ok",
        "model": "다온 음악 생성 스튜디오",
        "vram_free_gb": round(vram, 2),
        "ram_free_gb": round(ram_avail, 2)
    }


def _run_task(task_id, params, audio_ref_path, audio_ref_timbre_path):
    with _lock:
        task = _tasks[task_id]
        task["status"] = "processing"
        
        n = max(1, min(4, int(params.get("num_tracks", 1))))
        base_seed = int(params["seed"])
        if base_seed < 0:
            import random
            base_seed = random.randint(0, 2**32 - 1)
            
        results = []
        statuses = []
        
        for i in range(n):
            track_seed = base_seed + i
            label = f"Track {i+1}/{n}"
            
            def prog(frac, desc=""):
                total_frac = (i + frac) / n
                task["progress"] = round(total_frac * 100, 1)
                if desc:
                    task["desc"] = desc
                else:
                    task["desc"] = f"{label}: Generating..."

            task["desc"] = f"{label}: Starting..."
            print(f"\\n>>> FastAPI Task {task_id} | {label} (seed={track_seed})")
            sys.stdout.flush()
            
            try:
                result_path, used_seed = _generate_single(
                    lyrics=params["lyrics"],
                    caption=params["caption"],
                    duration=params["duration"],
                    seed=track_seed,
                    num_steps=params["num_steps"],
                    guidance_scale=params["guidance_scale"],
                    temperature=params["temperature"],
                    bpm=params["bpm"],
                    keyscale=params["keyscale"],
                    timesignature=params["timesignature"],
                    language=params["language"],
                    negative_prompt=params["negative_prompt"],
                    audio_scale=params["audio_scale"],
                    shift=params["shift"],
                    infer_method=params["infer_method"],
                    audio_ref=audio_ref_path,
                    audio_ref_timbre=audio_ref_timbre_path,
                    audio_task=params["audio_task"],
                    progress_fn=prog,
                    progress_offset=0.0,
                    progress_scale=1.0,
                    track_label=label,
                )
                if result_path:
                    results.append({
                        "track_num": i + 1,
                        "seed": used_seed,
                        "file_path": result_path,
                        "filename": os.path.basename(result_path)
                    })
                    statuses.append(f"✅ {label}: seed={used_seed}")
                    print(f"  ✅ {label} saved: {result_path}")
                else:
                    statuses.append(f"❌ {label}: Generation failed (returned None)")
            except Exception as e:
                traceback.print_exc()
                statuses.append(f"❌ {label}: {str(e)}")
                gc.collect()
                torch.cuda.empty_cache()
            sys.stdout.flush()
                
        # Clean up temporary uploaded files
        if audio_ref_path and os.path.exists(audio_ref_path):
            try:
                os.remove(audio_ref_path)
            except:
                pass
        if audio_ref_timbre_path and os.path.exists(audio_ref_timbre_path):
            try:
                os.remove(audio_ref_timbre_path)
            except:
                pass
                
        if len(results) > 0:
            task["status"] = "completed"
            task["results"] = results
            task["progress"] = 100.0
            task["desc"] = "\\n".join(statuses)
            print(f"✅ Task {task_id} completed: {len(results)}/{n} tracks generated.")
        else:
            task["status"] = "error"
            task["error"] = "\\n".join(statuses)
            task["desc"] = "Generation failed."
            print(f"❌ Task {task_id} failed.")
        sys.stdout.flush()


@app.post("/generate")
async def api_generate(
    lyrics: str = Form("[Instrumental]"),
    caption: str = Form("pop, upbeat, energetic"),
    duration: int = Form(60),
    seed: int = Form(-1),
    num_steps: int = Form(8),
    guidance_scale: float = Form(7.0),
    temperature: float = Form(1.0),
    bpm: str = Form(""),
    keyscale: str = Form(""),
    timesignature: str = Form(""),
    language: str = Form(""),
    negative_prompt: str = Form(""),
    audio_scale: float = Form(1.0),
    shift: float = Form(1.0),
    infer_method: str = Form("ode"),
    audio_task: str = Form("Text (Lyrics) ➔ Audio"),
    num_tracks: int = Form(1),
    audio_ref: Optional[UploadFile] = File(None),
    audio_ref_timbre: Optional[UploadFile] = File(None),
):
    task_id = str(_uuid.uuid4())
    _tasks[task_id] = {
        "status": "queued",
        "progress": 0.0,
        "desc": "대기 중...",
        "results": [],
        "error": None,
    }
    
    audio_ref_path = None
    if audio_ref and audio_ref.filename:
        import tempfile
        suffix = os.path.splitext(audio_ref.filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await audio_ref.read())
            audio_ref_path = tmp.name
            
    audio_ref_timbre_path = None
    if audio_ref_timbre and audio_ref_timbre.filename:
        import tempfile
        suffix = os.path.splitext(audio_ref_timbre.filename)[1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await audio_ref_timbre.read())
            audio_ref_timbre_path = tmp.name
            
    params = {
        "lyrics": lyrics,
        "caption": caption,
        "duration": duration,
        "seed": seed,
        "num_steps": num_steps,
        "guidance_scale": guidance_scale,
        "temperature": temperature,
        "bpm": bpm,
        "keyscale": keyscale,
        "timesignature": timesignature,
        "language": language,
        "negative_prompt": negative_prompt,
        "audio_scale": audio_scale,
        "shift": shift,
        "infer_method": infer_method,
        "audio_task": audio_task,
        "num_tracks": num_tracks,
    }
    
    threading.Thread(
        target=_run_task, 
        args=(task_id, params, audio_ref_path, audio_ref_timbre_path), 
        daemon=True
    ).start()
    
    return {"task_id": task_id, "status": "queued"}


@app.get("/status/{task_id}")
def api_status(task_id: str):
    task = _tasks.get(task_id)
    if not task:
        return JSONResponse({"error": "Task not found"}, status_code=404)
    r = {
        "task_id": task_id,
        "status": task["status"],
        "progress": task["progress"],
        "desc": task["desc"]
    }
    if task["status"] == "completed":
        r["results"] = [
            {"track_num": item["track_num"], "seed": item["seed"]}
            for item in task["results"]
        ]
    elif task["status"] == "error":
        r["error"] = task["error"]
    return r


@app.get("/result/{task_id}/{track_num}")
def api_result(task_id: str, track_num: int):
    task = _tasks.get(task_id)
    if not task:
        return JSONResponse({"error": "Task not found"}, status_code=404)
    if task["status"] != "completed":
        return JSONResponse({"error": "Not ready", "status": task["status"]}, status_code=400)
        
    track_result = None
    for r in task.get("results", []):
        if r["track_num"] == track_num:
            track_result = r
            break
            
    if not track_result or not os.path.exists(track_result["file_path"]):
        return JSONResponse({"error": f"Result file for track {track_num} not found"}, status_code=404)
        
    fn = track_result["filename"]
    mt = "audio/mpeg" if fn.endswith(".mp3") else "audio/wav"
    return FileResponse(track_result["file_path"], media_type=mt, filename=fn)


# ==== NGROK SETUP & LAUNCH ====
_ngrok_token = os.environ.get("NGROK_TOKEN", "")
if _ngrok_token:
    from pyngrok import ngrok
    ngrok.set_auth_token(_ngrok_token)
    for _tun in ngrok.get_tunnels():
        ngrok.disconnect(_tun.public_url)
    _pub = ngrok.connect(8000).public_url
    print(f"\\n{'='*55}")
    print(f"\\U0001f680 NGROK URL: {_pub}")
    print(f"{'='*55}")
else:
    print("\\n⚠️ NGROK_TOKEN not set! Local only: http://localhost:8000")

print(f"\\nAPI Endpoints:")
print(f"  GET  /health                  ➔ Server health check")
print(f"  POST /generate                ➔ Start music generation")
print(f"  GET  /status/{{task_id}}        ➔ Check progress")
print(f"  GET  /result/{{task_id}}/{{num}}  ➔ Download audio track")
print(f"\\nStarting API server on port 8000...")
sys.stdout.flush()

uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
'''

new_cell8 = keep_part + fastapi_code
lines = new_cell8.split('\n')
source_list = []
for i, line in enumerate(lines):
    if i < len(lines) - 1:
        source_list.append(line + '\n')
    else:
        if line:
            source_list.append(line)

nb['cells'][8]['source'] = source_list

# ============================================================
# Cell 9 (index 9, markdown): Update section title
# ============================================================
nb['cells'][9]['source'] = ["## 🚀 Cell 5 — Set Ngrok Token & Launch!\n"]

# ============================================================
# Cell 10 (index 10, code): Add NGROK_TOKEN env var setup
# ============================================================
nb['cells'][10]['source'] = [
    "# Cell 5: Set Ngrok Token & Launch!\n",
    "import os\n",
    "\n",
    "# ==========================================\n",
    "# 🔥 여기에 본인의 Ngrok 토큰을 입력하세요!\n",
    "# ==========================================\n",
    'NGROK_TOKEN = "YOUR_NGROK_TOKEN_HERE"\n',
    "\n",
    'if NGROK_TOKEN == "YOUR_NGROK_TOKEN_HERE":\n',
    '    print("❌ ERROR: Ngrok 토큰을 입력해주세요!")\n',
    "else:\n",
    '    os.environ["NGROK_TOKEN"] = NGROK_TOKEN\n',
    "    !cd /kaggle/working && python -u run_acestep_xl.py 2>&1\n",
]

# ============================================================
# Save
# ============================================================
with open(DST, 'w', encoding='utf-8') as f:
    json.dump(nb, f, indent=1, ensure_ascii=False)

print(f"Notebook saved to: {DST}")
print(f"File size: {os.path.getsize(DST)} bytes")
