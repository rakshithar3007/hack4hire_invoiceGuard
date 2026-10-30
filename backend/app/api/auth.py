from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, UserResponse, Token
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.permissions import get_current_active_user, PERMISSIONS, ROLE_EMPLOYEE, ROLE_ADMIN, ROLE_MANAGER
from app.services.audit_service import audit_service

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )
    
    # Public self-registration is strictly restricted to Employee role.
    # Manager and Admin roles can only be granted by an authenticated Administrator.
    role = ROLE_EMPLOYEE
    dept = user_in.department or "General"

    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role=role,
        department=dept,
        approval_limit=0.0,
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    audit_service.log_event(
        db,
        action="USER_REGISTERED",
        user_id=new_user.id,
        details={"name": new_user.name, "email": new_user.email, "role": new_user.role, "department": new_user.department}
    )

    perms = list(PERMISSIONS.get(role, []))
    res = UserResponse.from_orm(new_user)
    res.permissions = perms
    return res

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your user account has been deactivated. Please contact an administrator."
        )
    
    access_token = create_access_token(data={"sub": str(user.id), "role": user.role, "email": user.email})

    audit_service.log_event(
        db,
        action="USER_LOGIN",
        user_id=user.id,
        details={"email": user.email, "role": user.role}
    )

    role_key = (user.role or ROLE_EMPLOYEE).lower()
    perms = list(PERMISSIONS.get(role_key, []))
    user_res = UserResponse.from_orm(user)
    user_res.permissions = perms

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_res
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user)):
    role_key = (current_user.role or ROLE_EMPLOYEE).lower()
    perms = list(PERMISSIONS.get(role_key, []))
    user_res = UserResponse.from_orm(current_user)
    user_res.permissions = perms
    return user_res
