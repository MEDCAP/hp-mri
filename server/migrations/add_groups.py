#!/usr/bin/env python3
"""
Migration script to add group-based access control
- Creates groups collection with indexes
- Adds ownerId field to existing mrdfiles
- Sets groupName to null for private files
"""

import os
import sys
from datetime import datetime
from pymongo import MongoClient
from bson import ObjectId

# Add the parent directory to the path so we can import from the app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DevelopmentConfig, ProductionConfig

def get_mongo_client():
    """Get MongoDB client based on environment"""
    FLASK_ENV = os.getenv("FLASK_ENV", default="development")
    
    if FLASK_ENV == "development":
        config = DevelopmentConfig()
    else:
        config = ProductionConfig()
    
    return MongoClient(config.MONGO_URI)

def create_groups_collection(db):
    """Create groups collection with proper indexes"""
    print("Creating groups collection...")
    
    # Create the groups collection
    groups_collection = db.groups
    
    # Create indexes
    print("Creating indexes...")
    
    # Index on members array for fast user group lookups
    groups_collection.create_index("members")
    print("✓ Created index on members")
    
    # Unique index on group name
    groups_collection.create_index("name", unique=True)
    print("✓ Created unique index on name")
    
    # Index on createdBy for admin queries
    groups_collection.create_index("createdBy")
    print("✓ Created index on createdBy")
    
    print("Groups collection and indexes created successfully!")

def update_mrdfiles_collection(db):
    """Update mrdfiles collection - leave legacy files untagged (public to all)"""
    print("Updating mrdfiles collection...")
    
    mrdfiles_collection = db.mrdfiles
    
    # Add indexes for the new fields
    print("Creating indexes on mrdfiles...")
    
    # Index on ownerId for private file queries
    mrdfiles_collection.create_index("ownerId")
    print("✓ Created index on ownerId")
    
    # Index on groupName for group file queries
    mrdfiles_collection.create_index("groupName")
    print("✓ Created index on groupName")
    
    # Compound index for efficient user file queries
    mrdfiles_collection.create_index([
        ("groupName", 1),
        ("studyDate", -1),
        ("studyTime", -1)
    ])
    print("✓ Created compound index on groupName, studyDate, studyTime")
    
    # Note: We're NOT updating existing files - they remain untagged and public
    print("✓ Legacy files will remain untagged and accessible to all users")
    print("mrdfiles collection updated successfully!")

def create_sample_groups(db):
    """Create some sample groups for testing"""
    print("Creating sample groups...")
    
    groups_collection = db.groups
    
    sample_groups = [
        {
            "name": "public",
            "displayName": "Public",
            "description": "Public group - all authenticated users can access files in this group",
            "createdAt": datetime.utcnow(),
            "createdBy": "system",
            "members": [],  # Empty - all users have implicit access
            "admins": ["system"],
            "properties": {"isPublic": True}
        },
        {
            "name": "research-team",
            "displayName": "Research Team",
            "description": "Main research collaboration group",
            "createdAt": datetime.utcnow(),
            "createdBy": "sample-admin-sub",
            "members": ["sample-admin-sub", "sample-user-sub"],
            "admins": ["sample-admin-sub"],
            "properties": {}
        },
        {
            "name": "lab-members",
            "displayName": "Lab Members",
            "description": "All lab members group",
            "createdAt": datetime.utcnow(),
            "createdBy": "sample-admin-sub",
            "members": ["sample-admin-sub", "sample-user-sub", "sample-user2-sub"],
            "admins": ["sample-admin-sub"],
            "properties": {}
        }
    ]
    
    for group in sample_groups:
        try:
            groups_collection.insert_one(group)
            print(f"✓ Created sample group: {group['displayName']}")
        except Exception as e:
            print(f"⚠ Could not create sample group {group['name']}: {e}")

def main():
    """Run the migration"""
    print("Starting group-based access control migration...")
    print("=" * 50)
    
    try:
        # Connect to MongoDB
        client = get_mongo_client()
        db = client.get_database("medcap_dev")
        
        # Test connection
        client.admin.command('ping')
        print("✓ Connected to MongoDB")
        
        # Run migrations
        create_groups_collection(db)
        print()
        update_mrdfiles_collection(db)
        print()
        
        # Ask if user wants to create sample groups
        create_samples = input("Create sample groups for testing? (y/n): ").lower().strip()
        if create_samples == 'y':
            create_sample_groups(db)
        
        print()
        print("=" * 50)
        print("Migration completed successfully!")
        print()
        print("Next steps:")
        print("1. Update your Cognito user pool to include group attributes")
        print("2. Test the new group-based access control")
        print("3. Create real groups through the UI")
        print("4. Map existing ownerName values to actual Cognito subs")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        sys.exit(1)
    finally:
        client.close()

if __name__ == "__main__":
    main()

