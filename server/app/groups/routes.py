"""
Group management routes
"""
from flask import jsonify, request, g
from bson import ObjectId
import re
from . import groups_bp
from app.auth import requires_auth
from data import (
    create_group, get_user_groups, get_group_by_name, is_group_admin, is_group_member,
    add_group_member, remove_group_member, promote_to_admin, demote_admin,
    update_group_properties, delete_group, generate_invite_code, get_group_invite_codes,
    revoke_invite_code, validate_invite_code, use_invite_code, create_join_request,
    get_pending_join_requests, approve_join_request, deny_join_request, search_groups,
    get_group_settings, update_group_settings, get_user_join_requests
)

def validate_group_name(name: str) -> bool:
    """Validate group name format (alphanumeric, hyphens, underscores only)"""
    return bool(re.match(r'^[a-zA-Z0-9_-]+$', name)) and len(name) >= 3 and len(name) <= 50

@groups_bp.route("/groups", methods=["GET"])
@requires_auth
def list_user_groups():
    """List all groups that the current user belongs to"""
    try:
        groups = get_user_groups(g.user_sub)
        return jsonify(groups), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch groups", "details": str(e)}), 500

@groups_bp.route("/groups", methods=["POST"])
@requires_auth
def create_new_group():
    """Create a new group"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        name = data.get("name", "").strip()
        display_name = data.get("displayName", "").strip()
        description = data.get("description", "").strip()
        
        if not name or not display_name:
            return jsonify({"error": "Name and display name are required"}), 400
        
        if not validate_group_name(name):
            return jsonify({"error": "Invalid group name. Use 3-50 characters, alphanumeric, hyphens, underscores only"}), 400
        
        # Check if group name already exists
        existing = get_group_by_name(name)
        if existing:
            return jsonify({"error": "Group name already exists"}), 409
        
        group_id = create_group(name, display_name, description, g.user_sub)
        return jsonify({"message": "Group created successfully", "groupId": str(group_id)}), 201
        
    except Exception as e:
        return jsonify({"error": "Failed to create group", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>", methods=["GET"])
@requires_auth
def get_group_details(group_name):
    """Get group details (only if user is a member)"""
    try:
        if not is_group_member(group_name, g.user_sub):
            return jsonify({"error": "Access denied"}), 403
        
        group = get_group_by_name(group_name)
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        return jsonify(group), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch group", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>", methods=["PATCH"])
@requires_auth
def update_group(group_name):
    """Update group properties (admin only)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Only allow updating certain fields
        allowed_updates = {}
        if "displayName" in data:
            allowed_updates["displayName"] = data["displayName"].strip()
        if "description" in data:
            allowed_updates["description"] = data["description"].strip()
        if "properties" in data:
            allowed_updates["properties"] = data["properties"]
        
        if not allowed_updates:
            return jsonify({"error": "No valid fields to update"}), 400
        
        success = update_group_properties(group_name, allowed_updates, g.user_sub)
        if success:
            return jsonify({"message": "Group updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update group"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to update group", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>", methods=["DELETE"])
@requires_auth
def delete_group_route(group_name):
    """Delete group (admin only, must be empty)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        success = delete_group(group_name, g.user_sub)
        if success:
            return jsonify({"message": "Group deleted successfully"}), 200
        else:
            return jsonify({"error": "Cannot delete group with files or failed to delete"}), 400
            
    except Exception as e:
        return jsonify({"error": "Failed to delete group", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/members", methods=["GET"])
@requires_auth
def list_group_members(group_name):
    """List group members (members only)"""
    try:
        if not is_group_member(group_name, g.user_sub):
            return jsonify({"error": "Access denied"}), 403
        
        group = get_group_by_name(group_name)
        if not group:
            return jsonify({"error": "Group not found"}), 404
        
        # Return member list with admin status
        members = []
        for member_sub in group.get("members", []):
            members.append({
                "sub": member_sub,
                "isAdmin": member_sub in group.get("admins", [])
            })
        
        return jsonify({"members": members}), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch members", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/members", methods=["POST"])
@requires_auth
def invite_member(group_name):
    """Invite/add member to group (any member can invite)"""
    try:
        if not is_group_member(group_name, g.user_sub):
            return jsonify({"error": "Access denied"}), 403
        
        data = request.get_json()
        if not data or "userSub" not in data:
            return jsonify({"error": "userSub is required"}), 400
        
        user_sub = data["userSub"].strip()
        if not user_sub:
            return jsonify({"error": "Invalid userSub"}), 400
        
        success = add_group_member(group_name, user_sub, g.user_sub)
        if success:
            return jsonify({"message": "Member added successfully"}), 200
        else:
            return jsonify({"error": "Failed to add member"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to add member", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/members/<user_sub>", methods=["DELETE"])
@requires_auth
def remove_member(group_name, user_sub):
    """Remove member from group (admin only, or self-removal)"""
    try:
        if not (is_group_admin(group_name, g.user_sub) or user_sub == g.user_sub):
            return jsonify({"error": "Access denied"}), 403
        
        success = remove_group_member(group_name, user_sub, g.user_sub)
        if success:
            return jsonify({"message": "Member removed successfully"}), 200
        else:
            return jsonify({"error": "Failed to remove member"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to remove member", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/admins", methods=["POST"])
@requires_auth
def promote_member(group_name):
    """Promote member to admin (admin only)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        data = request.get_json()
        if not data or "userSub" not in data:
            return jsonify({"error": "userSub is required"}), 400
        
        user_sub = data["userSub"].strip()
        if not user_sub:
            return jsonify({"error": "Invalid userSub"}), 400
        
        success = promote_to_admin(group_name, user_sub, g.user_sub)
        if success:
            return jsonify({"message": "Member promoted to admin"}), 200
        else:
            return jsonify({"error": "Failed to promote member"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to promote member", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/admins/<user_sub>", methods=["DELETE"])
@requires_auth
def demote_admin_route(group_name, user_sub):
    """Demote admin to member (admin only, can't demote self)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        success = demote_admin(group_name, user_sub, g.user_sub)
        if success:
            return jsonify({"message": "Admin demoted to member"}), 200
        else:
            return jsonify({"error": "Failed to demote admin"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to demote admin", "details": str(e)}), 500

# ===== INVITE CODE ROUTES =====

@groups_bp.route("/groups/<group_name>/invite-codes", methods=["POST"])
@requires_auth
def create_invite_code(group_name):
    """Create invite code for group (admin only)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        expires_days = data.get("expiresInDays")
        max_uses = data.get("maxUses")
        
        # Validate inputs
        if expires_days is not None and (not isinstance(expires_days, int) or expires_days < 1):
            return jsonify({"error": "expiresInDays must be a positive integer"}), 400
        
        if max_uses is not None and (not isinstance(max_uses, int) or max_uses < 1):
            return jsonify({"error": "maxUses must be a positive integer"}), 400
        
        code = generate_invite_code(group_name, g.user_sub, expires_days, max_uses)
        if code:
            return jsonify({
                "code": code,
                "expiresInDays": expires_days,
                "maxUses": max_uses
            }), 201
        else:
            return jsonify({"error": "Failed to create invite code"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to create invite code", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/invite-codes", methods=["GET"])
@requires_auth
def list_invite_codes(group_name):
    """List invite codes for group (admin only)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        codes = get_group_invite_codes(group_name, g.user_sub)
        return jsonify({"inviteCodes": codes}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch invite codes", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/invite-codes/<code>", methods=["DELETE"])
@requires_auth
def revoke_invite_code_route(group_name, code):
    """Revoke invite code (admin only)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        success = revoke_invite_code(group_name, code, g.user_sub)
        if success:
            return jsonify({"message": "Invite code revoked"}), 200
        else:
            return jsonify({"error": "Failed to revoke invite code"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to revoke invite code", "details": str(e)}), 500

@groups_bp.route("/groups/join-by-code", methods=["POST"])
@requires_auth
def join_by_code():
    """Join group using invite code (any authenticated user)"""
    try:
        data = request.get_json()
        if not data or "code" not in data:
            return jsonify({"error": "Code is required"}), 400
        
        code = data["code"].strip()
        if not code:
            return jsonify({"error": "Invalid code"}), 400
        
        result = use_invite_code(code, g.user_sub)
        if result:
            return jsonify({
                "message": "Successfully joined group",
                "groupName": result["groupName"],
                "displayName": result["displayName"]
            }), 200
        else:
            return jsonify({"error": "Invalid or expired invite code"}), 400
            
    except Exception as e:
        return jsonify({"error": "Failed to join group", "details": str(e)}), 500

# ===== JOIN REQUEST ROUTES =====

@groups_bp.route("/groups/search", methods=["GET"])
@requires_auth
def search_groups_route():
    """Search for discoverable groups"""
    try:
        query = request.args.get("q", "").strip()
        groups = search_groups(query, g.user_sub)
        return jsonify({"groups": groups}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to search groups", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/join-requests", methods=["POST"])
@requires_auth
def request_to_join(group_name):
    """Request to join group"""
    try:
        # Get user info from auth context
        user_name = g.user_name or g.user_email or "Unknown User"
        user_email = g.user_email or "unknown@example.com"
        
        print(f"DEBUG: Creating join request for user_sub={g.user_sub}, group={group_name}")
        
        success = create_join_request(group_name, g.user_sub, user_name, user_email)
        if success:
            return jsonify({"message": "Join request submitted"}), 200
        else:
            # Check why it failed
            if is_group_member(group_name, g.user_sub):
                return jsonify({"error": "You are already a member of this group"}), 400
            else:
                return jsonify({"error": "Join request already pending or group not discoverable"}), 400
            
    except Exception as e:
        print(f"DEBUG: Exception in request_to_join: {e}")
        return jsonify({"error": "Failed to submit join request", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/join-requests", methods=["GET"])
@requires_auth
def list_join_requests(group_name):
    """List pending join requests (admin only)"""
    try:
        print(f"DEBUG: list_join_requests called for group={group_name}, user_sub={g.user_sub}")
        is_admin = is_group_admin(group_name, g.user_sub)
        print(f"DEBUG: is_group_admin result: {is_admin}")
        
        if not is_admin:
            return jsonify({"error": "Admin access required"}), 403
        
        requests = get_pending_join_requests(group_name, g.user_sub)
        print(f"DEBUG: Found {len(requests)} pending requests")
        return jsonify({"joinRequests": requests}), 200
        
    except Exception as e:
        print(f"DEBUG: Exception in list_join_requests: {e}")
        return jsonify({"error": "Failed to fetch join requests", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/join-requests/<user_sub>/approve", methods=["POST"])
@requires_auth
def approve_join_request_route(group_name, user_sub):
    """Approve join request (admin only)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        success = approve_join_request(group_name, user_sub, g.user_sub)
        if success:
            return jsonify({"message": "Join request approved"}), 200
        else:
            return jsonify({"error": "Failed to approve join request"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to approve join request", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/join-requests/<user_sub>/deny", methods=["POST"])
@requires_auth
def deny_join_request_route(group_name, user_sub):
    """Deny join request (admin only)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        success = deny_join_request(group_name, user_sub, g.user_sub)
        if success:
            return jsonify({"message": "Join request denied"}), 200
        else:
            return jsonify({"error": "Failed to deny join request"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to deny join request", "details": str(e)}), 500

# ===== GROUP SETTINGS ROUTES =====

@groups_bp.route("/groups/<group_name>/settings", methods=["GET"])
@requires_auth
def get_group_settings_route(group_name):
    """Get group settings"""
    try:
        if not is_group_member(group_name, g.user_sub):
            return jsonify({"error": "Access denied"}), 403
        
        settings = get_group_settings(group_name)
        if settings:
            return jsonify({"settings": settings}), 200
        else:
            return jsonify({"error": "Group not found"}), 404
            
    except Exception as e:
        return jsonify({"error": "Failed to fetch group settings", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/settings", methods=["PATCH"])
@requires_auth
def update_group_settings_route(group_name):
    """Update group settings (admin only)"""
    try:
        if not is_group_admin(group_name, g.user_sub):
            return jsonify({"error": "Admin access required"}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Validate settings
        allowed_settings = {}
        if "isDiscoverable" in data:
            allowed_settings["isDiscoverable"] = bool(data["isDiscoverable"])
        if "autoApprove" in data:
            allowed_settings["autoApprove"] = bool(data["autoApprove"])
        
        if not allowed_settings:
            return jsonify({"error": "No valid settings to update"}), 400
        
        success = update_group_settings(group_name, allowed_settings, g.user_sub)
        if success:
            return jsonify({"message": "Group settings updated"}), 200
        else:
            return jsonify({"error": "Failed to update group settings"}), 500
            
    except Exception as e:
        return jsonify({"error": "Failed to update group settings", "details": str(e)}), 500

# ===== USER JOIN REQUEST STATUS =====

@groups_bp.route("/groups/my-join-requests", methods=["GET"])
@requires_auth
def get_my_join_requests():
    """Get current user's join request status across all groups"""
    try:
        requests = get_user_join_requests(g.user_sub)
        return jsonify({"joinRequests": requests}), 200
        
    except Exception as e:
        return jsonify({"error": "Failed to fetch join requests", "details": str(e)}), 500

@groups_bp.route("/groups/<group_name>/join-requests/withdraw", methods=["POST"])
@requires_auth
def withdraw_join_request_route(group_name):
    """Withdraw a join request"""
    try:
        success = withdraw_join_request(group_name, g.user_sub)
        if success:
            return jsonify({"message": "Join request withdrawn"}), 200
        else:
            return jsonify({"error": "No pending request found to withdraw"}), 400
    except Exception as e:
        return jsonify({"error": "Failed to withdraw join request", "details": str(e)}), 500

