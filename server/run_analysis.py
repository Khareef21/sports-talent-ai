import sys, json
sys.path.insert(0, r'C:\Users\NAZEER\Desktop\sports-talent-ai\server')
from app.core.pose_engine import analyze_vertical_jump
p = r'C:\Users\NAZEER\Downloads\vertical_jump_5sec.mp4'
try:
    res = analyze_vertical_jump(p)
    print(json.dumps(res, indent=2))
except Exception as e:
    import traceback
    print('EXCEPTION:', type(e).__name__, str(e))
    try:
        if hasattr(e, 'quality_checks'):
            print('QUALITY_CHECKS:', json.dumps(e.quality_checks, indent=2))
    except Exception:
        pass
    traceback.print_exc()
