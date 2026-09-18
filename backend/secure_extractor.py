import os
import re
import zipfile
import shutil
import tempfile
import uuid
from typing import Dict, List, Any, Tuple

BLOCKED_DIR_NAMES = {
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    "__pycache__",
    ".venv",
    "venv",
    ".next",
    ".nuxt",
    ".idea",
    ".vscode"
}

SENSITIVE_PATTERNS = [
    ".env",
    "credentials",
    "id_rsa",
    "id_ed25519",
    "secrets.",
    ".pem",
    ".key",
    "service-account"
]

MAX_FILE_COUNT = 2500
MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024  # 50 MB

class SecurityViolationError(Exception):
    pass

class SecureArchiveExtractor:
    """
    Safely extracts uploaded ZIP project archives into isolated workspaces.
    Defends against:
      1. Zip-Slip / directory traversal vulnerabilities (e.g. ../../../etc/passwd)
      2. Zip bomb attacks (max size / file count enforcement)
      3. Junk bloat extraction (node_modules, __pycache__, .git)
      4. Accidental secret exposure (redacts and isolates sensitive files)
    """

    def __init__(self, base_workspace_dir: str = None):
        if not base_workspace_dir:
            base_workspace_dir = os.path.join(tempfile.gettempdir(), "tracelens_workspaces")
        self.base_workspace_dir = os.path.abspath(base_workspace_dir)
        os.makedirs(self.base_workspace_dir, exist_ok=True)

    def extract_zip(self, zip_path_or_file, project_id: str = None) -> Dict[str, Any]:
        if not project_id:
            project_id = f"proj-{uuid.uuid4().hex[:8]}"

        target_dir = os.path.abspath(os.path.join(self.base_workspace_dir, project_id))
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir, ignore_errors=True)
        os.makedirs(target_dir, exist_ok=True)

        extracted_files = []
        skipped_dirs = set()
        sensitive_files = []
        total_size = 0

        if isinstance(zip_path_or_file, bytes):
            import io
            zip_file_obj = io.BytesIO(zip_path_or_file)
        else:
            zip_file_obj = zip_path_or_file

        with zipfile.ZipFile(zip_file_obj, "r") as archive:
            # 1. First pass: validation
            infolist = archive.infolist()
            if len(infolist) > MAX_FILE_COUNT:
                shutil.rmtree(target_dir, ignore_errors=True)
                raise SecurityViolationError(
                    f"Archive exceeds maximum allowed file count ({len(infolist)} > {MAX_FILE_COUNT})"
                )

            for member in infolist:
                raw_name = member.filename
                # Normalize slashes & clean leading slashes/drive letters
                norm_name = raw_name.replace("\\", "/")
                # Strip Windows drive letters (e.g., C:/...) and leading slashes
                clean_name = re.sub(r'^[a-zA-Z]:[/]+', '', norm_name)
                clean_name = clean_name.lstrip("/")

                # Skip root or empty member entries
                if not clean_name or clean_name == ".":
                    continue

                # Check for explicit directory traversal attempts
                parts = [p for p in clean_name.split("/") if p and p != "."]
                if ".." in parts:
                    shutil.rmtree(target_dir, ignore_errors=True)
                    raise SecurityViolationError(
                        f"Zip-Slip path traversal vulnerability detected in member: {raw_name}"
                    )

                # Safe destination path calculation
                safe_rel_path = os.path.join(*parts) if parts else ""
                dest_path = os.path.abspath(os.path.join(target_dir, safe_rel_path))

                # Hard invariant: dest_path MUST reside inside target_dir
                if not dest_path.startswith(target_dir + os.sep) and dest_path != target_dir:
                    shutil.rmtree(target_dir, ignore_errors=True)
                    raise SecurityViolationError(
                        f"Zip-Slip path traversal escaping target directory in member: {raw_name}"
                    )

                # Check total uncompressed size limit
                total_size += member.file_size
                if total_size > MAX_UNCOMPRESSED_BYTES:
                    shutil.rmtree(target_dir, ignore_errors=True)
                    raise SecurityViolationError(
                        f"Archive exceeds maximum allowed size ({round(total_size / (1024*1024), 1)}MB > 50MB)"
                    )

                # Check if path contains blocked directory
                if any(p in BLOCKED_DIR_NAMES for p in parts):
                    for p in parts:
                        if p in BLOCKED_DIR_NAMES:
                            skipped_dirs.add(p)
                    continue

                # Check sensitive files (redact and audit)
                filename_lower = os.path.basename(clean_name).lower()
                is_sensitive = False
                for pattern in SENSITIVE_PATTERNS:
                    if pattern in filename_lower:
                        sensitive_files.append({
                            "relative_path": clean_name,
                            "type": "SECRET_OR_KEY",
                            "redacted": True,
                            "notice": f"Detected sensitive credential/configuration file ({filename_lower}). Values strictly redacted."
                        })
                        is_sensitive = True
                        break

                if is_sensitive:
                    continue

                if not member.is_dir() and not raw_name.endswith("/"):
                    # Ensure parent dir exists
                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                    with archive.open(member) as source, open(dest_path, "wb") as target:
                        shutil.copyfileobj(source, target)
                    extracted_files.append(os.path.relpath(dest_path, target_dir).replace("\\", "/"))

        if not extracted_files and not sensitive_files:
            shutil.rmtree(target_dir, ignore_errors=True)
            raise ValueError("No supported project files found in the archive.")

        # Determine root directory if wrapped inside a single folder
        effective_root = target_dir
        top_entries = [e for e in os.listdir(target_dir) if not e.startswith(".")]
        if len(top_entries) == 1:
            single_child = os.path.join(target_dir, top_entries[0])
            if os.path.isdir(single_child):
                effective_root = single_child

        return {
            "project_id": project_id,
            "target_dir": target_dir,
            "effective_root": effective_root,
            "files_count": len(extracted_files),
            "total_bytes": total_size,
            "extracted_files": extracted_files[:100],  # sample
            "skipped_directories": list(skipped_dirs),
            "sensitive_files_detected": sensitive_files,
            "is_secure": True
        }

    def cleanup_workspace(self, project_id: str):
        target_dir = os.path.join(self.base_workspace_dir, project_id)
        if os.path.exists(target_dir):
            shutil.rmtree(target_dir, ignore_errors=True)

secure_extractor = SecureArchiveExtractor()
