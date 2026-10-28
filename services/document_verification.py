"""Document Verification Service
Handles QR code verification for signed leave documents.
"""

import hashlib
import json
import base64
from datetime import datetime, timezone
from typing import Optional, Dict, Any


def compute_content_hash(signature_path: str, signature_hash: str, case_id: str, signed_at: str) -> str:
    """Compute a content hash for QR code data."""
    hash_input = f"{case_id}:{signed_at}:{signature_hash}:{signature_path}"
    return hashlib.sha256(hash_input.encode('utf-8')).hexdigest()


def decode_qr_payload(qr_data: str) -> Optional[Dict[str, Any]]:
    """Decode a QR code payload. Expected format: JSON base64-encoded."""
    try:
        # Handle data URL format
        if qr_data.startswith('data:'):
            qr_data = qr_data.split(',')[1]
        decoded = base64.b64decode(qr_data).decode('utf-8')
        return json.loads(decoded)
    except Exception:
        return None


class DocumentVerificationService:
    """Service for verifying signed documents via QR codes."""
    
    def __init__(self):
        # In production, this would connect to a database
        # For now, we use an in-memory store for demonstration
        self._verified_documents: Dict[str, Dict[str, Any]] = {}
    
    def register_signed_document(
        self,
        case_id: str,
        signature_path: str,
        signature_hash: str,
        signed_at: str,
        approver: str,
    ) -> str:
        """Register a signed document and return a QR verification token."""
        qr_token = compute_content_hash(signature_path, signature_hash, case_id, signed_at)
        
        self._verified_documents[qr_token] = {
            'case_id': case_id,
            'signature_path': signature_path,
            'signature_hash': signature_hash,
            'signed_at': signed_at,
            'approver': approver,
            'registered_at': datetime.now(timezone.utc).isoformat(),
        }
        
        return qr_token
    
    def verify(self, qr_token: str) -> Dict[str, Any]:
        """Verify a QR code token and return validation result."""
        document = self._verified_documents.get(qr_token)
        
        if not document:
            return {
                'valid': False,
                'message': 'Invalid or expired QR code',
                'case_id': None,
                'signed_at': None,
                'approver': None,
            }
        
        # Check if the document is still valid (not expired, etc.)
        # In production, you might check expiry, revocation, etc.
        
        return {
            'valid': True,
            'message': 'Signature verified successfully',
            'case_id': document['case_id'],
            'signed_at': document['signed_at'],
            'approver': document['approver'],
        }


# Singleton instance
_verification_service: Optional[DocumentVerificationService] = None

def get_document_verification_service() -> DocumentVerificationService:
    global _verification_service
    if _verification_service is None:
        _verification_service = DocumentVerificationService()
    return _verification_service