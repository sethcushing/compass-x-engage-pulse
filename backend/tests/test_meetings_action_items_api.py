"""
Engagement Pulse API - Meeting and Action Item Tests
Tests for the new Meeting and Action Item CRUD endpoints:
1. Meeting CRUD: GET/POST/PUT/DELETE /api/meetings
2. ActionItem CRUD: GET/POST/PUT/DELETE /api/action-items
3. Four-blocker includes meetings_block and action_items_block
4. Marking meeting as complete opens action item flow
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

# Known engagement ID from seed data
TEST_ENGAGEMENT_ID = "eng_001"


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
def auth_headers(admin_token):
    """Auth headers with Bearer token"""
    return {"Authorization": f"Bearer {admin_token}"}


# ============== MEETING CRUD TESTS ==============
class TestMeetingCRUD:
    """Test Meeting CRUD operations"""
    
    def test_create_meeting(self, api_client, auth_headers):
        """Test POST /api/meetings creates a meeting"""
        meeting_data = {
            "engagement_id": TEST_ENGAGEMENT_ID,
            "title": "TEST: Client Kickoff Call",
            "meeting_type": "CLIENT_CALL",
            "date": "2026-01-20",
            "time": "10:00 AM",
            "attendees": "John, Jane, Client",
            "notes": "Initial project kickoff",
            "status": "SCHEDULED"
        }
        
        response = api_client.post(f"{API_URL}/meetings", headers=auth_headers, json=meeting_data)
        assert response.status_code == 200, f"Create meeting failed: {response.text}"
        
        data = response.json()
        assert "meeting_id" in data
        assert data["title"] == meeting_data["title"]
        assert data["meeting_type"] == "CLIENT_CALL"
        assert data["status"] == "SCHEDULED"
        assert data["date"] == "2026-01-20"
        
        print(f"✓ Created meeting: {data['meeting_id']} - {data['title']}")
        
        # Store meeting_id for later tests
        TestMeetingCRUD.created_meeting_id = data["meeting_id"]
        return data["meeting_id"]
    
    def test_get_meetings_by_engagement(self, api_client, auth_headers):
        """Test GET /api/meetings?engagement_id returns meetings"""
        response = api_client.get(f"{API_URL}/meetings?engagement_id={TEST_ENGAGEMENT_ID}", headers=auth_headers)
        assert response.status_code == 200, f"Get meetings failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        # Find our created meeting
        meeting_ids = [m["meeting_id"] for m in data]
        if hasattr(TestMeetingCRUD, 'created_meeting_id'):
            assert TestMeetingCRUD.created_meeting_id in meeting_ids
            print(f"✓ Found created meeting in list of {len(data)} meetings")
        else:
            print(f"✓ GET meetings returns {len(data)} meetings for {TEST_ENGAGEMENT_ID}")
    
    def test_update_meeting(self, api_client, auth_headers):
        """Test PUT /api/meetings/{id} updates a meeting"""
        if not hasattr(TestMeetingCRUD, 'created_meeting_id'):
            pytest.skip("No meeting created to update")
        
        meeting_id = TestMeetingCRUD.created_meeting_id
        update_data = {
            "title": "TEST: Updated Kickoff Call",
            "status": "COMPLETED",
            "notes": "Meeting completed successfully"
        }
        
        response = api_client.put(f"{API_URL}/meetings/{meeting_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200, f"Update meeting failed: {response.text}"
        
        data = response.json()
        assert data["title"] == "TEST: Updated Kickoff Call"
        assert data["status"] == "COMPLETED"
        
        print(f"✓ Updated meeting {meeting_id} to COMPLETED status")
    
    def test_delete_meeting(self, api_client, auth_headers):
        """Test DELETE /api/meetings/{id} deletes a meeting"""
        if not hasattr(TestMeetingCRUD, 'created_meeting_id'):
            pytest.skip("No meeting created to delete")
        
        meeting_id = TestMeetingCRUD.created_meeting_id
        
        response = api_client.delete(f"{API_URL}/meetings/{meeting_id}", headers=auth_headers)
        assert response.status_code == 200, f"Delete meeting failed: {response.text}"
        
        data = response.json()
        assert "deleted" in data["message"].lower() or "message" in data
        
        print(f"✓ Deleted meeting {meeting_id}")
        
        # Verify it's gone
        get_response = api_client.get(f"{API_URL}/meetings?engagement_id={TEST_ENGAGEMENT_ID}", headers=auth_headers)
        meetings = get_response.json()
        meeting_ids = [m["meeting_id"] for m in meetings]
        assert meeting_id not in meeting_ids, "Meeting should be deleted"
        
        print(f"✓ Verified meeting {meeting_id} is no longer in list")


# ============== ACTION ITEM CRUD TESTS ==============
class TestActionItemCRUD:
    """Test Action Item CRUD operations"""
    
    def test_create_action_item_standalone(self, api_client, auth_headers):
        """Test POST /api/action-items creates a standalone action item (no meeting link)"""
        action_item_data = {
            "engagement_id": TEST_ENGAGEMENT_ID,
            "description": "TEST: Follow up with client on requirements",
            "owner": "Seth Cushing",
            "due_date": "2026-01-25",
            "status": "OPEN",
            "priority": "HIGH"
        }
        
        response = api_client.post(f"{API_URL}/action-items", headers=auth_headers, json=action_item_data)
        assert response.status_code == 200, f"Create action item failed: {response.text}"
        
        data = response.json()
        assert "action_item_id" in data
        assert data["description"] == action_item_data["description"]
        assert data["status"] == "OPEN"
        assert data["priority"] == "HIGH"
        assert data.get("meeting_id") is None, "Standalone action item should have no meeting_id"
        
        print(f"✓ Created standalone action item: {data['action_item_id']}")
        
        TestActionItemCRUD.standalone_action_item_id = data["action_item_id"]
        return data["action_item_id"]
    
    def test_create_action_item_linked_to_meeting(self, api_client, auth_headers):
        """Test POST /api/action-items with meeting_id creates linked action item"""
        # First create a meeting
        meeting_data = {
            "engagement_id": TEST_ENGAGEMENT_ID,
            "title": "TEST: Meeting for action items",
            "meeting_type": "INTERNAL_SYNC",
            "date": "2026-01-21",
            "status": "COMPLETED"
        }
        meeting_response = api_client.post(f"{API_URL}/meetings", headers=auth_headers, json=meeting_data)
        assert meeting_response.status_code == 200
        meeting_id = meeting_response.json()["meeting_id"]
        TestActionItemCRUD.test_meeting_id = meeting_id
        
        # Create action item linked to meeting
        action_item_data = {
            "engagement_id": TEST_ENGAGEMENT_ID,
            "meeting_id": meeting_id,
            "description": "TEST: Action item from meeting",
            "owner": "Team Lead",
            "due_date": "2026-01-28",
            "status": "OPEN",
            "priority": "MEDIUM"
        }
        
        response = api_client.post(f"{API_URL}/action-items", headers=auth_headers, json=action_item_data)
        assert response.status_code == 200, f"Create linked action item failed: {response.text}"
        
        data = response.json()
        assert data["meeting_id"] == meeting_id
        assert data["description"] == action_item_data["description"]
        
        print(f"✓ Created action item {data['action_item_id']} linked to meeting {meeting_id}")
        
        TestActionItemCRUD.linked_action_item_id = data["action_item_id"]
    
    def test_get_action_items_by_engagement(self, api_client, auth_headers):
        """Test GET /api/action-items?engagement_id returns action items"""
        response = api_client.get(f"{API_URL}/action-items?engagement_id={TEST_ENGAGEMENT_ID}", headers=auth_headers)
        assert response.status_code == 200, f"Get action items failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ GET action items returns {len(data)} items for {TEST_ENGAGEMENT_ID}")
        
        # Verify our created items are in the list
        action_item_ids = [ai["action_item_id"] for ai in data]
        if hasattr(TestActionItemCRUD, 'standalone_action_item_id'):
            assert TestActionItemCRUD.standalone_action_item_id in action_item_ids
            print(f"  - Found standalone action item")
        if hasattr(TestActionItemCRUD, 'linked_action_item_id'):
            assert TestActionItemCRUD.linked_action_item_id in action_item_ids
            print(f"  - Found linked action item")
    
    def test_update_action_item_status(self, api_client, auth_headers):
        """Test PUT /api/action-items/{id} updates status to DONE"""
        if not hasattr(TestActionItemCRUD, 'standalone_action_item_id'):
            pytest.skip("No action item created to update")
        
        action_item_id = TestActionItemCRUD.standalone_action_item_id
        update_data = {"status": "DONE"}
        
        response = api_client.put(f"{API_URL}/action-items/{action_item_id}", headers=auth_headers, json=update_data)
        assert response.status_code == 200, f"Update action item failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "DONE"
        
        print(f"✓ Updated action item {action_item_id} to DONE")
    
    def test_delete_action_item(self, api_client, auth_headers):
        """Test DELETE /api/action-items/{id} deletes an action item"""
        if not hasattr(TestActionItemCRUD, 'standalone_action_item_id'):
            pytest.skip("No action item to delete")
        
        action_item_id = TestActionItemCRUD.standalone_action_item_id
        
        response = api_client.delete(f"{API_URL}/action-items/{action_item_id}", headers=auth_headers)
        assert response.status_code == 200, f"Delete action item failed: {response.text}"
        
        print(f"✓ Deleted standalone action item {action_item_id}")
    
    def test_cleanup_linked_action_item_and_meeting(self, api_client, auth_headers):
        """Cleanup: Delete linked action item and test meeting"""
        if hasattr(TestActionItemCRUD, 'linked_action_item_id'):
            api_client.delete(f"{API_URL}/action-items/{TestActionItemCRUD.linked_action_item_id}", headers=auth_headers)
            print(f"✓ Cleaned up linked action item")
        
        if hasattr(TestActionItemCRUD, 'test_meeting_id'):
            api_client.delete(f"{API_URL}/meetings/{TestActionItemCRUD.test_meeting_id}", headers=auth_headers)
            print(f"✓ Cleaned up test meeting")


# ============== FOUR-BLOCKER WITH MEETINGS/ACTIONS TESTS ==============
class TestFourBlockerMeetingsActions:
    """Test that four-blocker includes meetings_block and action_items_block"""
    
    def test_four_blocker_includes_meetings_block(self, api_client, auth_headers):
        """Test /api/engagements/{id}/four-blocker has meetings_block"""
        response = api_client.get(f"{API_URL}/engagements/{TEST_ENGAGEMENT_ID}/four-blocker", headers=auth_headers)
        assert response.status_code == 200, f"Four-blocker failed: {response.text}"
        
        data = response.json()
        
        # Verify meetings_block exists
        assert "meetings_block" in data, "Four-blocker should have meetings_block"
        meetings_block = data["meetings_block"]
        
        assert "total" in meetings_block
        assert "upcoming" in meetings_block
        assert "completed" in meetings_block
        assert "summary" in meetings_block
        
        print(f"✓ Four-blocker has meetings_block:")
        print(f"  Total: {meetings_block['total']}, Upcoming: {meetings_block['upcoming']}, Completed: {meetings_block['completed']}")
    
    def test_four_blocker_includes_action_items_block(self, api_client, auth_headers):
        """Test /api/engagements/{id}/four-blocker has action_items_block"""
        response = api_client.get(f"{API_URL}/engagements/{TEST_ENGAGEMENT_ID}/four-blocker", headers=auth_headers)
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify action_items_block exists
        assert "action_items_block" in data, "Four-blocker should have action_items_block"
        action_items_block = data["action_items_block"]
        
        assert "total" in action_items_block
        assert "open" in action_items_block
        assert "overdue" in action_items_block
        
        print(f"✓ Four-blocker has action_items_block:")
        print(f"  Total: {action_items_block['total']}, Open: {action_items_block['open']}, Overdue: {action_items_block['overdue']}")


# ============== MEETING TYPES VALIDATION ==============
class TestMeetingTypes:
    """Test all meeting types are supported"""
    
    @pytest.mark.parametrize("meeting_type", [
        "CLIENT_CALL",
        "INTERNAL_SYNC",
        "STEERING_COMMITTEE",
        "WORKSHOP",
        "REVIEW",
        "OTHER"
    ])
    def test_create_meeting_with_various_types(self, api_client, auth_headers, meeting_type):
        """Test creating meetings with all valid meeting types"""
        meeting_data = {
            "engagement_id": TEST_ENGAGEMENT_ID,
            "title": f"TEST: {meeting_type} Meeting",
            "meeting_type": meeting_type,
            "date": "2026-01-22",
            "status": "SCHEDULED"
        }
        
        response = api_client.post(f"{API_URL}/meetings", headers=auth_headers, json=meeting_data)
        assert response.status_code == 200, f"Create {meeting_type} meeting failed: {response.text}"
        
        data = response.json()
        assert data["meeting_type"] == meeting_type
        
        # Cleanup
        api_client.delete(f"{API_URL}/meetings/{data['meeting_id']}", headers=auth_headers)
        
        print(f"✓ Meeting type {meeting_type} works correctly")


# ============== ACTION ITEM STATUSES AND PRIORITIES ==============
class TestActionItemStatusesPriorities:
    """Test all action item statuses and priorities"""
    
    @pytest.mark.parametrize("status", ["OPEN", "IN_PROGRESS", "DONE"])
    def test_action_item_statuses(self, api_client, auth_headers, status):
        """Test creating action items with all valid statuses"""
        action_item_data = {
            "engagement_id": TEST_ENGAGEMENT_ID,
            "description": f"TEST: Action item with status {status}",
            "status": status,
            "priority": "MEDIUM"
        }
        
        response = api_client.post(f"{API_URL}/action-items", headers=auth_headers, json=action_item_data)
        assert response.status_code == 200, f"Create action item with status {status} failed: {response.text}"
        
        data = response.json()
        assert data["status"] == status
        
        # Cleanup
        api_client.delete(f"{API_URL}/action-items/{data['action_item_id']}", headers=auth_headers)
        
        print(f"✓ Action item status {status} works correctly")
    
    @pytest.mark.parametrize("priority", ["LOW", "MEDIUM", "HIGH"])
    def test_action_item_priorities(self, api_client, auth_headers, priority):
        """Test creating action items with all valid priorities"""
        action_item_data = {
            "engagement_id": TEST_ENGAGEMENT_ID,
            "description": f"TEST: Action item with priority {priority}",
            "status": "OPEN",
            "priority": priority
        }
        
        response = api_client.post(f"{API_URL}/action-items", headers=auth_headers, json=action_item_data)
        assert response.status_code == 200, f"Create action item with priority {priority} failed: {response.text}"
        
        data = response.json()
        assert data["priority"] == priority
        
        # Cleanup
        api_client.delete(f"{API_URL}/action-items/{data['action_item_id']}", headers=auth_headers)
        
        print(f"✓ Action item priority {priority} works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
