"""
Engagement Pulse API Backend Tests
Tests for all API endpoints: engagements, pulses, milestones, risks, issues, dashboard

Note: Most endpoints require Google OAuth authentication which cannot be automated.
These tests verify:
1. API connectivity and health
2. Authentication is properly enforced
3. Seed data endpoint works
4. Response structure validation for protected endpoints
"""

import pytest
import requests
import os
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL')
if not BASE_URL:
    BASE_URL = "https://engagement-track-1.preview.emergentagent.com"

BASE_URL = BASE_URL.rstrip('/')
API_URL = f"{BASE_URL}/api"


# ============== FIXTURES ==============
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ============== API HEALTH TESTS ==============
class TestAPIHealth:
    """Basic API health and connectivity tests"""
    
    def test_api_root_responds(self, api_client):
        """Test that API root endpoint responds"""
        response = api_client.get(f"{API_URL}/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Engagement Pulse API" in data["message"]
        print(f"✓ API Root: {data}")
    
    def test_invalid_endpoint_returns_404(self, api_client):
        """Test that invalid endpoint returns 404"""
        response = api_client.get(f"{API_URL}/invalid-endpoint-xyz")
        assert response.status_code == 404
        print("✓ Invalid endpoint returns 404")


# ============== SEED DATA TESTS ==============
class TestSeedData:
    """Seed data endpoint tests"""
    
    def test_seed_data_endpoint_works(self, api_client):
        """Test seed data endpoint exists and works"""
        response = api_client.post(f"{API_URL}/seed-data")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # Either data already seeded or newly seeded
        assert "seeded" in data or "success" in data.get("message", "").lower() or "already" in data.get("message", "").lower()
        print(f"✓ Seed data endpoint: {data}")


# ============== AUTH TESTS ==============
class TestAuthEndpoints:
    """Authentication endpoint tests"""
    
    def test_auth_me_requires_authentication(self, api_client):
        """Test GET /api/auth/me requires authentication"""
        response = api_client.get(f"{API_URL}/auth/me")
        assert response.status_code == 401
        print("✓ /api/auth/me correctly requires authentication")
    
    def test_auth_logout_works_without_session(self, api_client):
        """Test POST /api/auth/logout can be called without session"""
        response = api_client.post(f"{API_URL}/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "logged out" in data["message"].lower()
        print(f"✓ /api/auth/logout: {data}")


# ============== ENGAGEMENTS ENDPOINT TESTS ==============
class TestEngagementsEndpoint:
    """Tests for /api/engagements endpoint"""
    
    def test_get_engagements_requires_auth(self, api_client):
        """Test GET /api/engagements requires authentication"""
        response = api_client.get(f"{API_URL}/engagements")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        print("✓ GET /api/engagements correctly requires authentication")
    
    def test_get_engagements_with_invalid_token_returns_401(self, api_client):
        """Test GET /api/engagements with invalid token returns 401"""
        headers = {"Authorization": "Bearer invalid_token_123"}
        response = api_client.get(f"{API_URL}/engagements", headers=headers)
        assert response.status_code == 401
        print("✓ Invalid token rejected for GET /api/engagements")
    
    def test_get_engagement_by_id_requires_auth(self, api_client):
        """Test GET /api/engagements/{id} requires authentication"""
        response = api_client.get(f"{API_URL}/engagements/eng_001")
        assert response.status_code == 401
        print("✓ GET /api/engagements/{id} correctly requires authentication")
    
    def test_create_engagement_requires_auth(self, api_client):
        """Test POST /api/engagements requires authentication"""
        payload = {
            "client_id": "client_001",
            "engagement_name": "Test Engagement",
            "engagement_code": "TEST-001",
            "start_date": datetime.now().isoformat()
        }
        response = api_client.post(f"{API_URL}/engagements", json=payload)
        assert response.status_code == 401
        print("✓ POST /api/engagements correctly requires authentication")
    
    def test_update_engagement_requires_auth(self, api_client):
        """Test PUT /api/engagements/{id} requires authentication"""
        payload = {"engagement_name": "Updated Name"}
        response = api_client.put(f"{API_URL}/engagements/eng_001", json=payload)
        assert response.status_code == 401
        print("✓ PUT /api/engagements/{id} correctly requires authentication")
    
    def test_delete_engagement_requires_auth(self, api_client):
        """Test DELETE /api/engagements/{id} requires authentication"""
        response = api_client.delete(f"{API_URL}/engagements/eng_001")
        assert response.status_code == 401
        print("✓ DELETE /api/engagements/{id} correctly requires authentication")


# ============== PULSES ENDPOINT TESTS ==============
class TestPulsesEndpoint:
    """Tests for /api/pulses endpoint"""
    
    def test_get_pulses_requires_auth(self, api_client):
        """Test GET /api/pulses requires authentication"""
        response = api_client.get(f"{API_URL}/pulses")
        assert response.status_code == 401
        print("✓ GET /api/pulses correctly requires authentication")
    
    def test_get_pulses_with_engagement_filter_requires_auth(self, api_client):
        """Test GET /api/pulses?engagement_id=... requires authentication"""
        response = api_client.get(f"{API_URL}/pulses?engagement_id=eng_001")
        assert response.status_code == 401
        print("✓ GET /api/pulses with filter correctly requires authentication")
    
    def test_get_current_week_pulse_requires_auth(self, api_client):
        """Test GET /api/pulses/current-week/{engagement_id} requires authentication"""
        response = api_client.get(f"{API_URL}/pulses/current-week/eng_001")
        assert response.status_code == 401
        print("✓ GET /api/pulses/current-week/{id} correctly requires authentication")
    
    def test_get_pulse_by_id_requires_auth(self, api_client):
        """Test GET /api/pulses/{id} requires authentication"""
        response = api_client.get(f"{API_URL}/pulses/pulse_001")
        assert response.status_code == 401
        print("✓ GET /api/pulses/{id} correctly requires authentication")
    
    def test_create_pulse_requires_auth(self, api_client):
        """Test POST /api/pulses requires authentication"""
        payload = {
            "engagement_id": "eng_001",
            "rag_status_this_week": "GREEN",
            "what_went_well": "Test pulse",
            "delivered_this_week": "Test deliverable"
        }
        response = api_client.post(f"{API_URL}/pulses", json=payload)
        assert response.status_code == 401
        print("✓ POST /api/pulses correctly requires authentication")
    
    def test_update_pulse_requires_auth(self, api_client):
        """Test PUT /api/pulses/{id} requires authentication"""
        payload = {"what_went_well": "Updated test"}
        response = api_client.put(f"{API_URL}/pulses/pulse_001", json=payload)
        assert response.status_code == 401
        print("✓ PUT /api/pulses/{id} correctly requires authentication")


# ============== MILESTONES ENDPOINT TESTS ==============
class TestMilestonesEndpoint:
    """Tests for /api/milestones endpoint"""
    
    def test_get_milestones_requires_auth(self, api_client):
        """Test GET /api/milestones requires authentication"""
        response = api_client.get(f"{API_URL}/milestones")
        assert response.status_code == 401
        print("✓ GET /api/milestones correctly requires authentication")
    
    def test_get_milestones_with_engagement_filter_requires_auth(self, api_client):
        """Test GET /api/milestones?engagement_id=... requires authentication"""
        response = api_client.get(f"{API_URL}/milestones?engagement_id=eng_001")
        assert response.status_code == 401
        print("✓ GET /api/milestones with filter correctly requires authentication")
    
    def test_create_milestone_requires_auth(self, api_client):
        """Test POST /api/milestones requires authentication"""
        payload = {
            "engagement_id": "eng_001",
            "title": "Test Milestone",
            "due_date": datetime.now().isoformat()
        }
        response = api_client.post(f"{API_URL}/milestones", json=payload)
        assert response.status_code == 401
        print("✓ POST /api/milestones correctly requires authentication")
    
    def test_update_milestone_requires_auth(self, api_client):
        """Test PUT /api/milestones/{id} requires authentication"""
        payload = {"title": "Updated Milestone"}
        response = api_client.put(f"{API_URL}/milestones/ms_001", json=payload)
        assert response.status_code == 401
        print("✓ PUT /api/milestones/{id} correctly requires authentication")
    
    def test_delete_milestone_requires_auth(self, api_client):
        """Test DELETE /api/milestones/{id} requires authentication"""
        response = api_client.delete(f"{API_URL}/milestones/ms_001")
        assert response.status_code == 401
        print("✓ DELETE /api/milestones/{id} correctly requires authentication")


# ============== RISKS ENDPOINT TESTS ==============
class TestRisksEndpoint:
    """Tests for /api/risks endpoint"""
    
    def test_get_risks_requires_auth(self, api_client):
        """Test GET /api/risks requires authentication"""
        response = api_client.get(f"{API_URL}/risks")
        assert response.status_code == 401
        print("✓ GET /api/risks correctly requires authentication")
    
    def test_get_risks_with_engagement_filter_requires_auth(self, api_client):
        """Test GET /api/risks?engagement_id=... requires authentication"""
        response = api_client.get(f"{API_URL}/risks?engagement_id=eng_001")
        assert response.status_code == 401
        print("✓ GET /api/risks with filter correctly requires authentication")
    
    def test_get_risks_with_status_filter_requires_auth(self, api_client):
        """Test GET /api/risks?status=OPEN requires authentication"""
        response = api_client.get(f"{API_URL}/risks?status=OPEN")
        assert response.status_code == 401
        print("✓ GET /api/risks with status filter correctly requires authentication")
    
    def test_create_risk_requires_auth(self, api_client):
        """Test POST /api/risks requires authentication"""
        payload = {
            "engagement_id": "eng_001",
            "title": "Test Risk",
            "description": "Test risk description",
            "category": "TECH",
            "probability": "MEDIUM",
            "impact": "HIGH"
        }
        response = api_client.post(f"{API_URL}/risks", json=payload)
        assert response.status_code == 401
        print("✓ POST /api/risks correctly requires authentication")
    
    def test_update_risk_requires_auth(self, api_client):
        """Test PUT /api/risks/{id} requires authentication"""
        payload = {"title": "Updated Risk"}
        response = api_client.put(f"{API_URL}/risks/risk_001", json=payload)
        assert response.status_code == 401
        print("✓ PUT /api/risks/{id} correctly requires authentication")
    
    def test_delete_risk_requires_auth(self, api_client):
        """Test DELETE /api/risks/{id} requires authentication"""
        response = api_client.delete(f"{API_URL}/risks/risk_001")
        assert response.status_code == 401
        print("✓ DELETE /api/risks/{id} correctly requires authentication")


# ============== ISSUES ENDPOINT TESTS ==============
class TestIssuesEndpoint:
    """Tests for /api/issues endpoint"""
    
    def test_get_issues_requires_auth(self, api_client):
        """Test GET /api/issues requires authentication"""
        response = api_client.get(f"{API_URL}/issues")
        assert response.status_code == 401
        print("✓ GET /api/issues correctly requires authentication")
    
    def test_get_issues_with_engagement_filter_requires_auth(self, api_client):
        """Test GET /api/issues?engagement_id=... requires authentication"""
        response = api_client.get(f"{API_URL}/issues?engagement_id=eng_001")
        assert response.status_code == 401
        print("✓ GET /api/issues with filter correctly requires authentication")
    
    def test_get_issues_with_status_filter_requires_auth(self, api_client):
        """Test GET /api/issues?status=OPEN requires authentication"""
        response = api_client.get(f"{API_URL}/issues?status=OPEN")
        assert response.status_code == 401
        print("✓ GET /api/issues with status filter correctly requires authentication")
    
    def test_get_issues_with_severity_filter_requires_auth(self, api_client):
        """Test GET /api/issues?severity=CRITICAL requires authentication"""
        response = api_client.get(f"{API_URL}/issues?severity=CRITICAL")
        assert response.status_code == 401
        print("✓ GET /api/issues with severity filter correctly requires authentication")
    
    def test_create_issue_requires_auth(self, api_client):
        """Test POST /api/issues requires authentication"""
        payload = {
            "engagement_id": "eng_001",
            "title": "Test Issue",
            "description": "Test issue description",
            "severity": "MEDIUM"
        }
        response = api_client.post(f"{API_URL}/issues", json=payload)
        assert response.status_code == 401
        print("✓ POST /api/issues correctly requires authentication")
    
    def test_update_issue_requires_auth(self, api_client):
        """Test PUT /api/issues/{id} requires authentication"""
        payload = {"title": "Updated Issue"}
        response = api_client.put(f"{API_URL}/issues/issue_001", json=payload)
        assert response.status_code == 401
        print("✓ PUT /api/issues/{id} correctly requires authentication")
    
    def test_delete_issue_requires_auth(self, api_client):
        """Test DELETE /api/issues/{id} requires authentication"""
        response = api_client.delete(f"{API_URL}/issues/issue_001")
        assert response.status_code == 401
        print("✓ DELETE /api/issues/{id} correctly requires authentication")


# ============== DASHBOARD ENDPOINT TESTS ==============
class TestDashboardEndpoint:
    """Tests for /api/dashboard/summary endpoint"""
    
    def test_get_dashboard_summary_requires_auth(self, api_client):
        """Test GET /api/dashboard/summary requires authentication"""
        response = api_client.get(f"{API_URL}/dashboard/summary")
        assert response.status_code == 401
        print("✓ GET /api/dashboard/summary correctly requires authentication")
    
    def test_get_dashboard_summary_with_invalid_token_returns_401(self, api_client):
        """Test GET /api/dashboard/summary with invalid token returns 401"""
        headers = {"Authorization": "Bearer invalid_token_xyz"}
        response = api_client.get(f"{API_URL}/dashboard/summary", headers=headers)
        assert response.status_code == 401
        print("✓ Invalid token rejected for GET /api/dashboard/summary")
    
    def test_get_rag_trend_requires_auth(self, api_client):
        """Test GET /api/dashboard/rag-trend/{engagement_id} requires authentication"""
        response = api_client.get(f"{API_URL}/dashboard/rag-trend/eng_001")
        assert response.status_code == 401
        print("✓ GET /api/dashboard/rag-trend/{id} correctly requires authentication")


# ============== OTHER ENDPOINTS TESTS ==============
class TestOtherEndpoints:
    """Tests for other API endpoints"""
    
    def test_get_clients_requires_auth(self, api_client):
        """Test GET /api/clients requires authentication"""
        response = api_client.get(f"{API_URL}/clients")
        assert response.status_code == 401
        print("✓ GET /api/clients correctly requires authentication")
    
    def test_get_users_requires_auth(self, api_client):
        """Test GET /api/users requires authentication"""
        response = api_client.get(f"{API_URL}/users")
        assert response.status_code == 401
        print("✓ GET /api/users correctly requires authentication")
    
    def test_get_contacts_requires_auth(self, api_client):
        """Test GET /api/contacts requires authentication"""
        response = api_client.get(f"{API_URL}/contacts")
        assert response.status_code == 401
        print("✓ GET /api/contacts correctly requires authentication")
    
    def test_get_activity_logs_requires_auth(self, api_client):
        """Test GET /api/activity-logs requires authentication"""
        response = api_client.get(f"{API_URL}/activity-logs")
        assert response.status_code == 401
        print("✓ GET /api/activity-logs correctly requires authentication")


# ============== ENDPOINT EXISTENCE TESTS ==============
class TestEndpointExistence:
    """Verify all expected endpoints exist (may return 401 or 404)"""
    
    def test_engagements_endpoint_exists(self, api_client):
        """Verify /api/engagements endpoint exists"""
        response = api_client.get(f"{API_URL}/engagements")
        # Should be 401 (requires auth) not 404 (not found)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/engagements endpoint exists")
    
    def test_pulses_endpoint_exists(self, api_client):
        """Verify /api/pulses endpoint exists"""
        response = api_client.get(f"{API_URL}/pulses")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/pulses endpoint exists")
    
    def test_milestones_endpoint_exists(self, api_client):
        """Verify /api/milestones endpoint exists"""
        response = api_client.get(f"{API_URL}/milestones")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/milestones endpoint exists")
    
    def test_risks_endpoint_exists(self, api_client):
        """Verify /api/risks endpoint exists"""
        response = api_client.get(f"{API_URL}/risks")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/risks endpoint exists")
    
    def test_issues_endpoint_exists(self, api_client):
        """Verify /api/issues endpoint exists"""
        response = api_client.get(f"{API_URL}/issues")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/issues endpoint exists")
    
    def test_dashboard_summary_endpoint_exists(self, api_client):
        """Verify /api/dashboard/summary endpoint exists"""
        response = api_client.get(f"{API_URL}/dashboard/summary")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ /api/dashboard/summary endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
