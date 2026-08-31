from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
def login(creds: LoginRequest):
    """
    Officer authentication endpoint for GeM Procurement platform (Section 4.1).
    """
    if not creds.email or not creds.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Officer ID/Email and Password are required."
        )

    # For hackathon prototype: Accept officer credentials
    return {
        "token": "nic-officer-session-token-2026",
        "officer": {
            "id": "off-001",
            "name": "Rajesh Kumar",
            "role": "Sr. Procurement Officer",
            "email": creds.email if "@" in creds.email else "rajesh.kumar@nic.in"
        }
    }
