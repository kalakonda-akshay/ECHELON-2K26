import io
import os
import zipfile
from backend.secure_extractor import secure_extractor

def test_safe_zip_extraction():
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zf:
        zf.writestr('app/main.py', 'print("hello world")')
        zf.writestr('app/utils.py', 'def add(a, b): return a + b')
        zf.writestr('README.md', '# Test Project')
    
    zip_buffer.seek(0)
    result = secure_extractor.extract_zip(zip_buffer.read(), 'test-safe-proj')
    assert result['project_id'] == 'test-safe-proj'
    assert result['files_count'] >= 3
    secure_extractor.cleanup_workspace('test-safe-proj')

def test_zip_slip_prevention():
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zf:
        zf.writestr('../../etc/passwd', 'root:x:0:0:root:/root:/bin/bash')
    
    zip_buffer.seek(0)
    try:
        secure_extractor.extract_zip(zip_buffer.read(), 'test-slip-proj')
        assert False, 'Should have raised SecurityViolationError'
    except Exception as e:
        assert 'path traversal' in str(e).lower()
    secure_extractor.cleanup_workspace('test-slip-proj')

def test_sensitive_files_redaction():
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w') as zf:
        zf.writestr('.env', 'SECRET=xyz')
        zf.writestr('safe.py', 'pass')
    
    zip_buffer.seek(0)
    result = secure_extractor.extract_zip(zip_buffer.read(), 'test-secret-proj')
    assert len(result['sensitive_files_detected']) >= 1
    assert not os.path.exists(os.path.join(result['target_dir'], '.env'))
    secure_extractor.cleanup_workspace('test-secret-proj')

if __name__ == '__main__':
    test_safe_zip_extraction()
    print('PASS: safe_zip_extraction')
    test_zip_slip_prevention()
    print('PASS: zip_slip_prevention')
    test_sensitive_files_redaction()
    print('PASS: sensitive_files_redaction')
    print('ALL SECURE EXTRACTOR TESTS PASSED')
