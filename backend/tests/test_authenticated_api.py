"""
Engagement Pulse API - Authenticated Tests
Tests that use JWT authentication to verify:
1. Login with admin/consultant credentials
2. Four-blocker overview API
3. Milestone date change API
4. RAG trend API
5. Risk/Issue CRUD operations
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', "https://consultant-hub-58.preview.emergentagent.com").rstrip('/')
API_URL = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "seth.cushing@compassx.com"
ADMIN_PASSWORD = "CompassX2026!"
CONSULTANT_EMAIL = "ashley.clark@compassx.com"
CONSULTANT_PASSWORD = "CompassX2026!"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin JWT token"""
    response = api_client.post(f"{API_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def consultant_token(api_client):
    """Get consultant JWT token"""
    response = api_client.post(f"{API_URL}/auth/login", json={
        "email": CONSULTANT_EMAIL,
        "password": CONSULTANT_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Consultant login failed: {response.status_code} - {response.text}")
    data = response.json()
    return data.get("token")


@pytest.fixture(scope="module")
def admin_user(api_client, admin_token):
    """Get admin user info"""
    response = api_client.get(f"{API_URL}/auth/me", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    if response.status_code != 200:
        pytest.skip("Failed to get admin user info")
    return response.json()


@pytest.fixture(scope="module")
def consultant_user(api_client, consultant_token):
    """Get consultant user info"""
    response = api_client.get(f"{API_URL}/auth/me", headers={
        "Authorization": f"Bearer {consultant_token}"
    })
    if response.status_code != 200:
        pytest.skip("Failed to get consultant user info")
    return response.json()


# ============== LOGIN TESTS ==============
class TestLogin:
    """Test login functionality"""
    
    def test_admin_login_success(self, api_client):
        """Test admin login with valid credentials"""
        response = api_client.post(f"{API_URL}/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"].lower() == ADMIN_EMAIL.lower()
        assert data["user"]["role"] == "ADMIN", f"Expected ADMIN role, got {data['user']['role']}"
        print(f"✓ Admin login successful: {data['user']['name']} ({data['user']['role']})")
    
    def test_consultant_login_success(self, api_client):
        """Test consultant login with valid credentials"""
        response = api_client.post(f"{API_URL}/auth/login", json={
            "email": CONSULTANT_EMAIL,
            "password": CONSULTANT_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["email"].lower() == CONSULTANT_EMAIL.lower()
        assert data["user"]["role"] == "CONSULTANT", f"Expected CONSULTANT role, got {data['user']['role']}"
        print(f"✓ Consultant login successful: {data['user']['name']} ({data['user']['role']})")
    
    def test_login_with_invalid_credentials_fails(self, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{API_URL}/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")
    
    def test_auth_me_with_valid_token(self, api_client, admin_token):
        """Test /api/auth/me returns user info with valid token"""
        response = api_client.get(f"{API_URL}/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "email" in data
        assert "role" in data
        print(f"✓ /api/auth/me returns user: {data['name']}")


# ============== ENGAGEMENT TESTS ==============
class TestEngagements:
    """Test engagement-related endpoints"""
    
    def test_get_engagements_as_admin(self, api_client, admin_token):
        """Test admin can get all engagements"""
        response = api_client.get(f"{API_URL}/engagements", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            eng = data[0]
            assert "engagement_id" in eng
            assert "engagement_name" in eng
            assert "rag_status" in eng
            assert "health_score" in eng
            print(f"✓ Admin can view {len(data)} engagements")
            print(f"  First engagement: {eng['engagement_name']} ({eng['rag_status']})")
        else:
            print("✓ Admin can view engagements (empty list)")
    
    def test_get_engagement_by_id(self, api_client, admin_token):
        """Test fetching engagement by ID (eng_001)"""
        response = api_client.get(f"{API_URL}/engagements/eng_001", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert data["engagement_id"] == "eng_001"
            assert "client" in data
            assert "health_score" in data
            print(f"✓ Got engagement eng_001: {data['engagement_name']}")
        elif response.status_code == 404:
            print("⚠ Engagement eng_001 not found (may need seeding)")
            pytest.skip("eng_001 not found")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


# ============== FOUR-BLOCKER API TEST ==============
class TestFourBlockerAPI:
    """Test the four-blocker overview API"""
    
    def test_four_blocker_returns_correct_structure(self, api_client, admin_token):
        """Test /api/engagements/{id}/four-blocker returns correct data"""
        # First get an engagement
        eng_response = api_client.get(f"{API_URL}/engagements", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert eng_response.status_code == 200
        engagements = eng_response.json()
        
        if len(engagements) == 0:
            pytest.skip("No engagements available")
        
        engagement_id = engagements[0]["engagement_id"]
        
        # Get four-blocker
        response = api_client.get(f"{API_URL}/engagements/{engagement_id}/four-blocker", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Four-blocker failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "engagement_id" in data
        assert "pulse_block" in data
        assert "milestones_block" in data
        assert "risks_block" in data
        assert "issues_block" in data
        
        # Verify pulse block
        assert "summary" in data["pulse_block"]
        
        # Verify milestones block
        ms_block = data["milestones_block"]
        assert "total" in ms_block
        assert "completed" in ms_block
        assert "at_risk" in ms_block
        assert "overdue" in ms_block
        
        # Verify risks block
        risk_block = data["risks_block"]
        assert "total" in risk_block
        assert "open" in risk_block
        assert "high_impact" in risk_block
        
        # Verify issues block
        issue_block = data["issues_block"]
        assert "total" in issue_block
        assert "open" in issue_block
        assert "critical" in issue_block
        
        print(f"✓ Four-blocker API returns correct structure for {engagement_id}")
        print(f"  Milestones: {ms_block['total']} total, {ms_block['completed']} done")
        print(f"  Risks: {risk_block['open']} open, {risk_block['high_impact']} high impact")
        print(f"  Issues: {issue_block['open']} open, {issue_block['critical']} critical")


# ============== MILESTONE DATE CHANGE API TEST ==============
class TestMilestoneDateChangeAPI:
    """Test milestone date change tracking API"""
    
    def test_milestone_change_date_api(self, api_client, admin_token):
        """Test /api/milestones/{id}/change-date works correctly"""
        # Get milestones
        ms_response = api_client.get(f"{API_URL}/milestones", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert ms_response.status_code == 200
        milestones = ms_response.json()
        
        if len(milestones) == 0:
            pytest.skip("No milestones available")
        
        milestone = milestones[0]
        milestone_id = milestone["milestone_id"]
        
        # Change the date
        new_date = (datetime.now() + timedelta(days=14)).isoformat()
        response = api_client.post(f"{API_URL}/milestones/{milestone_id}/change-date", 
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "new_date": new_date,
                "reason": "TEST: Testing date change API"
            }
        )
        assert response.status_code == 200, f"Date change failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert "milestone_id" in data
        assert "date_change_history" in data
        assert len(data["date_change_history"]) > 0, "Date change history should not be empty"
        
        latest_change = data["date_change_history"][-1]
        assert "changed_at" in latest_change
        assert "changed_by_name" in latest_change
        assert "previous_date" in latest_change
        assert "new_date" in latest_change
        assert "reason" in latest_change
        
        print(f"✓ Milestone date change API works for {milestone_id}")
        print(f"  Date change recorded by: {latest_change['changed_by_name']}")
        print(f"  Reason: {latest_change['reason']}")
    
    def test_milestone_date_history_endpoint(self, api_client, admin_token):
        """Test /api/milestones/{id}/date-history endpoint"""
        # Get milestones
        ms_response = api_client.get(f"{API_URL}/milestones", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert ms_response.status_code == 200
        milestones = ms_response.json()
        
        if len(milestones) == 0:
            pytest.skip("No milestones available")
        
        milestone_id = milestones[0]["milestone_id"]
        
        response = api_client.get(f"{API_URL}/milestones/{milestone_id}/date-history", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert "milestone_id" in data
        assert "title" in data
        assert "date_change_history" in data
        
        print(f"✓ Date history endpoint works: {len(data['date_change_history'])} changes recorded")


# ============== RAG TREND API TEST ==============
class TestRAGTrendAPI:
    """Test RAG trend API"""
    
    def test_rag_trend_returns_data(self, api_client, admin_token):
        """Test /api/dashboard/rag-trend/{id} returns RAG trend data"""
        # Get an engagement
        eng_response = api_client.get(f"{API_URL}/engagements", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert eng_response.status_code == 200
        engagements = eng_response.json()
        
        if len(engagements) == 0:
            pytest.skip("No engagements available")
        
        engagement_id = engagements[0]["engagement_id"]
        
        response = api_client.get(f"{API_URL}/dashboard/rag-trend/{engagement_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list), "RAG trend should return a list"
        
        if len(data) > 0:
            trend = data[0]
            assert "week_start_date" in trend
            assert "rag_status" in trend
            print(f"✓ RAG trend API returns {len(data)} weeks of data")
        else:
            print("✓ RAG trend API works (no pulse data yet)")


# ============== RISK CRUD TEST ==============
class TestRiskCRUD:
    """Test Risk CRUD operations"""
    
    def test_create_and_get_risk(self, api_client, admin_token):
        """Test creating and retrieving a risk"""
        # Get an engagement first
        eng_response = api_client.get(f"{API_URL}/engagements", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert eng_response.status_code == 200
        engagements = eng_response.json()
        
        if len(engagements) == 0:
            pytest.skip("No engagements available")
        
        engagement_id = engagements[0]["engagement_id"]
        
        # Create risk
        risk_data = {
            "engagement_id": engagement_id,
            "title": "TEST: API Test Risk",
            "description": "This is a test risk created by API tests",
            "category": "TECH",
            "probability": "MEDIUM",
            "impact": "HIGH",
            "status": "OPEN"
        }
        
        create_response = api_client.post(f"{API_URL}/risks", 
            headers={"Authorization": f"Bearer {admin_token}"},
            json=risk_data
        )
        assert create_response.status_code == 200, f"Create risk failed: {create_response.text}"
        created_risk = create_response.json()
        
        assert "risk_id" in created_risk
        assert created_risk["title"] == risk_data["title"]
        
        risk_id = created_risk["risk_id"]
        print(f"✓ Created risk: {risk_id}")
        
        # Get risks for engagement
        get_response = api_client.get(f"{API_URL}/risks?engagement_id={engagement_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert get_response.status_code == 200
        risks = get_response.json()
        
        # Verify our risk is in the list
        risk_ids = [r["risk_id"] for r in risks]
        assert risk_id in risk_ids, "Created risk should be in the list"
        print(f"✓ Risk found in engagement risks")
        
        # Delete test risk (cleanup)
        delete_response = api_client.delete(f"{API_URL}/risks/{risk_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert delete_response.status_code == 200
        print(f"✓ Test risk deleted")


# ============== ISSUE CRUD TEST ==============
class TestIssueCRUD:
    """Test Issue CRUD operations"""
    
    def test_create_and_get_issue(self, api_client, admin_token):
        """Test creating and retrieving an issue"""
        # Get an engagement first
        eng_response = api_client.get(f"{API_URL}/engagements", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert eng_response.status_code == 200
        engagements = eng_response.json()
        
        if len(engagements) == 0:
            pytest.skip("No engagements available")
        
        engagement_id = engagements[0]["engagement_id"]
        
        # Create issue
        issue_data = {
            "engagement_id": engagement_id,
            "title": "TEST: API Test Issue",
            "description": "This is a test issue created by API tests",
            "severity": "HIGH",
            "status": "OPEN"
        }
        
        create_response = api_client.post(f"{API_URL}/issues", 
            headers={"Authorization": f"Bearer {admin_token}"},
            json=issue_data
        )
        assert create_response.status_code == 200, f"Create issue failed: {create_response.text}"
        created_issue = create_response.json()
        
        assert "issue_id" in created_issue
        assert created_issue["title"] == issue_data["title"]
        
        issue_id = created_issue["issue_id"]
        print(f"✓ Created issue: {issue_id}")
        
        # Get issues for engagement
        get_response = api_client.get(f"{API_URL}/issues?engagement_id={engagement_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert get_response.status_code == 200
        issues = get_response.json()
        
        # Verify our issue is in the list
        issue_ids = [i["issue_id"] for i in issues]
        assert issue_id in issue_ids, "Created issue should be in the list"
        print(f"✓ Issue found in engagement issues")
        
        # Delete test issue (cleanup)
        delete_response = api_client.delete(f"{API_URL}/issues/{issue_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert delete_response.status_code == 200
        print(f"✓ Test issue deleted")


# ============== DASHBOARD SUMMARY TEST ==============
class TestDashboardSummary:
    """Test dashboard summary endpoint"""
    
    def test_dashboard_summary_returns_data(self, api_client, admin_token):
        """Test /api/dashboard/summary returns correct structure"""
        response = api_client.get(f"{API_URL}/dashboard/summary", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "total_engagements" in data
        assert "rag_counts" in data
        assert "missing_pulses_count" in data
        
        print(f"✓ Dashboard summary: {data['total_engagements']} engagements")
        print(f"  RAG: G={data['rag_counts'].get('GREEN', 0)}, A={data['rag_counts'].get('AMBER', 0)}, R={data['rag_counts'].get('RED', 0)}")
        print(f"  Missing pulses: {data['missing_pulses_count']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
