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
    update_group_properties, delete_group
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

