import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.session import Base, get_db
from app.models.models import User, Invoice, Supplier
from app.core.security import get_password_hash, create_access_token
from main import app

# Test database engine
engine_test = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()

    # Seed test users
    admin = User(
        id=1, name="Admin Test", email="admin@test.com",
        password_hash=get_password_hash("Admin@123"), role="admin",
        department="Operations", approval_limit=None, is_active=True
    )
    emp1 = User(
        id=2, name="Alex Emp", email="emp1@test.com",
        password_hash=get_password_hash("Emp@123"), role="employee",
        department="Engineering", approval_limit=0.0, is_active=True
    )
    emp2 = User(
        id=3, name="Bob Emp", email="emp2@test.com",
        password_hash=get_password_hash("Emp@123"), role="employee",
        department="Marketing", approval_limit=0.0, is_active=True
    )
    mgr = User(
        id=4, name="Sarah Mgr", email="mgr@test.com",
        password_hash=get_password_hash("Mgr@123"), role="manager",
        department="Engineering", approval_limit=50000.0, is_active=True
    )
    deactivated = User(
        id=5, name="Deactivated User", email="deact@test.com",
        password_hash=get_password_hash("Deact@123"), role="employee",
        department="General", approval_limit=0.0, is_active=False
    )
    db.add_all([admin, emp1, emp2, mgr, deactivated])
    db.commit()

    # Seed supplier
    sup = Supplier(
        id=1, supplier_name="Test Supplier", gstin="29ABCDE1234F1Z5"
    )
    db.add(sup)
    db.commit()

    # Seed invoices
    # Inv 1: Uploaded by emp1 (Engineering, 25,000)
    inv1 = Invoice(
        id="INV-T1", invoice_number="TEST-001", supplier_id=1,
        total_amount=25000.0, file_path="storage/invoices/INV-1001-ABC.pdf",
        file_name="test1.pdf", file_type="application/pdf",
        processing_status="COMPLETED", validation_status="PASSED",
        fraud_status="LOW", approval_status="PENDING",
        uploaded_by=2, department="Engineering"
    )
    # Inv 2: Uploaded by emp2 (Marketing, 15,000)
    inv2 = Invoice(
        id="INV-T2", invoice_number="TEST-002", supplier_id=1,
        total_amount=15000.0, file_path="storage/invoices/INV-1001-ABC.pdf",
        file_name="test2.pdf", file_type="application/pdf",
        processing_status="COMPLETED", validation_status="PASSED",
        fraud_status="LOW", approval_status="PENDING",
        uploaded_by=3, department="Marketing"
    )
    # Inv 3: High amount (Engineering, 120,000 - exceeds Sarah Mgr limit 50,000)
    inv3 = Invoice(
        id="INV-T3", invoice_number="TEST-003", supplier_id=1,
        total_amount=120000.0, file_path="storage/invoices/INV-1001-ABC.pdf",
        file_name="test3.pdf", file_type="application/pdf",
        processing_status="COMPLETED", validation_status="PASSED",
        fraud_status="LOW", approval_status="PENDING",
        uploaded_by=2, department="Engineering"
    )
    # Inv 4: Uploaded by manager Sarah Mgr herself (Maker-Checker test)
    inv4 = Invoice(
        id="INV-T4", invoice_number="TEST-004", supplier_id=1,
        total_amount=10000.0, file_path="storage/invoices/INV-1001-ABC.pdf",
        file_name="test4.pdf", file_type="application/pdf",
        processing_status="COMPLETED", validation_status="PASSED",
        fraud_status="LOW", approval_status="PENDING",
        uploaded_by=4, department="Engineering"
    )
    db.add_all([inv1, inv2, inv3, inv4])
    db.commit()
    db.close()

    yield
    Base.metadata.drop_all(bind=engine_test)

@pytest.fixture
def client():
    return TestClient(app)

def make_headers(user_id: int, role: str, email: str):
    token = create_access_token(data={"sub": str(user_id), "role": role, "email": email})
    return {"Authorization": f"Bearer {token}"}

# ========================================================
# 3.1 Authentication & Session Tests
# ========================================================
class TestAuthenticationSecurity:
    def test_unauthenticated_request_rejected(self, client):
        res = client.get("/api/invoices")
        assert res.status_code == 401

    def test_invalid_token_rejected(self, client):
        res = client.get("/api/invoices", headers={"Authorization": "Bearer invalid.jwt.token"})
        assert res.status_code == 401

    def test_deactivated_user_blocked(self, client):
        headers = make_headers(5, "employee", "deact@test.com")
        res = client.get("/api/invoices", headers=headers)
        assert res.status_code == 403
        assert "deactivated" in res.json()["detail"].lower()

# ========================================================
# 3.2 Object-Level Security Tests
# ========================================================
class TestObjectLevelSecurity:
    def test_employee_can_only_view_own_invoices(self, client):
        headers = make_headers(2, "employee", "emp1@test.com")
        res = client.get("/api/invoices", headers=headers)
        assert res.status_code == 200
        invoices = res.json()
        assert len(invoices) > 0
        # All returned invoices must belong to emp1 (id 2)
        for inv in invoices:
            assert inv["uploaded_by"] == 2

    def test_employee_cannot_access_other_employee_invoice(self, client):
        headers = make_headers(2, "employee", "emp1@test.com")
        # INV-T2 belongs to emp2 (id 3)
        res = client.get("/api/invoices/INV-T2", headers=headers)
        assert res.status_code == 403

    def test_manager_cannot_access_other_department_invoice(self, client):
        # Sarah Mgr is Engineering. INV-T2 is Marketing.
        headers = make_headers(4, "manager", "mgr@test.com")
        res = client.get("/api/invoices/INV-T2", headers=headers)
        assert res.status_code == 403

    def test_admin_can_access_any_invoice(self, client):
        headers = make_headers(1, "admin", "admin@test.com")
        res1 = client.get("/api/invoices/INV-T1", headers=headers)
        assert res1.status_code == 200
        res2 = client.get("/api/invoices/INV-T2", headers=headers)
        assert res2.status_code == 200

# ========================================================
# 3.3 Maker-Checker & Approval Limits Tests
# ========================================================
class TestApprovalSecurity:
    def test_employee_cannot_approve(self, client):
        headers = make_headers(2, "employee", "emp1@test.com")
        res = client.post("/api/invoices/INV-T1/approve", json={"reason": "Self approve attempt"}, headers=headers)
        assert res.status_code == 403

    def test_manager_cannot_approve_own_uploaded_invoice_maker_checker(self, client):
        # INV-T4 was uploaded by Sarah Mgr (id 4)
        headers = make_headers(4, "manager", "mgr@test.com")
        res = client.post("/api/invoices/INV-T4/approve", json={"reason": "Manager self-approve"}, headers=headers)
        assert res.status_code == 403
        assert "maker-checker" in res.json()["detail"].lower()

    def test_manager_cannot_approve_above_approval_limit(self, client):
        # INV-T3 is ₹120,000. Sarah Mgr limit is ₹50,000.
        headers = make_headers(4, "manager", "mgr@test.com")
        res = client.post("/api/invoices/INV-T3/approve", json={"reason": "Valid reason override"}, headers=headers)
        assert res.status_code == 403
        assert "exceeds your approval limit" in res.json()["detail"].lower()

    def test_manager_can_approve_within_limit_and_scope(self, client):
        # INV-T1 is ₹25,000 (within ₹50,000 limit and in Engineering)
        headers = make_headers(4, "manager", "mgr@test.com")
        res = client.post("/api/invoices/INV-T1/approve", json={"reason": "Verified and within limit"}, headers=headers)
        assert res.status_code == 200
        assert res.json()["decision"] == "APPROVED"

# ========================================================
# 3.4 Privilege Escalation & User Admin Tests
# ========================================================
class TestPrivilegeEscalation:
    def test_employee_cannot_access_user_management(self, client):
        headers = make_headers(2, "employee", "emp1@test.com")
        res = client.get("/api/users", headers=headers)
        assert res.status_code == 403

    def test_manager_cannot_change_roles(self, client):
        headers = make_headers(4, "manager", "mgr@test.com")
        res = client.put("/api/users/2/role", json={"role": "admin"}, headers=headers)
        assert res.status_code == 403

    def test_cannot_demote_last_active_admin(self, client):
        headers = make_headers(1, "admin", "admin@test.com")
        res = client.put("/api/users/1/role", json={"role": "employee"}, headers=headers)
        assert res.status_code == 400
        assert "last remaining active administrator" in res.json()["detail"].lower()

# ========================================================
# 3.5 Role Dashboard Isolation Tests
# ========================================================
class TestRoleDashboardIsolation:
    def test_employee_can_access_employee_dashboard(self, client):
        headers = make_headers(2, "employee", "emp1@test.com")
        res = client.get("/api/dashboard/employee", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "employee_info" in data
        assert "kpis" in data
        assert data["employee_info"]["email"] == "emp1@test.com"

    def test_employee_forbidden_from_admin_dashboard(self, client):
        headers = make_headers(2, "employee", "emp1@test.com")
        res = client.get("/api/dashboard/admin", headers=headers)
        assert res.status_code == 403

    def test_manager_can_access_manager_dashboard(self, client):
        headers = make_headers(4, "manager", "mgr@test.com")
        res = client.get("/api/dashboard/manager", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "manager_info" in data
        assert "pending_queue" in data
        assert data["manager_info"]["email"] == "mgr@test.com"

    def test_manager_forbidden_from_admin_dashboard(self, client):
        headers = make_headers(4, "manager", "mgr@test.com")
        res = client.get("/api/dashboard/admin", headers=headers)
        assert res.status_code == 403

    def test_admin_can_access_admin_dashboard(self, client):
        headers = make_headers(1, "admin", "admin@test.com")
        res = client.get("/api/dashboard/admin", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert "system_health" in data
        assert "total_users" in data["kpis"]
