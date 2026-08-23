import sys, json
sys.path.insert(0, r'C:\Users\NAZEER\Desktop\sports-talent-ai\server')
from app.core.pose_engine import inspect_video_quality, analyze_vertical_jump
p = r'C:\Users\NAZEER\Downloads\vertical_jump_5sec.mp4'
print('Running quality check...')
q = inspect_video_quality(p)
print('QUALITY:', json.dumps(q, indent=2))
print('\nRunning analyze_vertical_jump...')
try:
    m = analyze_vertical_jump(p)
    print(json.dumps(m, indent=2))
except Exception as e:
    print('EXCEPTION:', type(e).__name__, str(e))
    try:
        if hasattr(e, 'quality_checks'):
            print('QUALITY_CHECKS:', json.dumps(e.quality_checks, indent=2))
    except Exception:
        pass
