"""
One-time script to seed static agents directly into the storage files.
Run this to populate the data directory without restarting the backend.
"""
import json
import os
import sys
from datetime import datetime

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.storage.static_agents_seed import STATIC_AGENTS

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "agents")
INDEX_PATH = os.path.join(DATA_DIR, "_index.json")


def main():
    # Load existing index
    if os.path.exists(INDEX_PATH):
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            index = json.load(f)
    else:
        index = {}

    now = datetime.utcnow().isoformat()
    seeded = 0

    for agent_data in STATIC_AGENTS:
        agent_id = agent_data["id"]
        agent_path = os.path.join(DATA_DIR, f"{agent_id}.json")

        # Skip if already exists
        if os.path.exists(agent_path):
            # But update agent_type and route if needed
            with open(agent_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            needs_update = False
            if existing.get("agent_type") != "static":
                existing["agent_type"] = "static"
                needs_update = True
            if agent_data.get("route") and existing.get("route") != agent_data["route"]:
                existing["route"] = agent_data["route"]
                needs_update = True
            if needs_update:
                with open(agent_path, "w", encoding="utf-8") as f:
                    json.dump(existing, f, indent=2, default=str, ensure_ascii=False)
                # Update index too
                if agent_id in index:
                    index[agent_id]["agent_type"] = "static"
                print(f"  Updated: {agent_id} ({agent_data['name']})")
            else:
                print(f"  Skipped (exists): {agent_id} ({agent_data['name']})")
            continue

        # Create full agent definition
        agent_def = {
            "id": agent_id,
            "name": agent_data["name"],
            "description": agent_data["description"],
            "long_description": None,
            "icon": agent_data["icon"],
            "category": agent_data["category"],
            "status": "active",
            "agent_type": "static",
            "metadata": {
                "created_at": "2024-01-01 00:00:00",
                "updated_at": now,
                "created_by": "system",
                "version": "1.0.0",
                "tags": agent_data.get("tags", [])
            },
            "tools": [],
            "ui_layout": {
                "layout_mode": "sections",
                "show_header": True,
                "header_title": agent_data["name"],
                "header_subtitle": agent_data["description"],
                "header_icon": None,
                "dashboard_config": {"columns": 12, "rowHeight": 80, "gap": 12},
                "widgets": [],
                "sections": [],
                "show_sidebar": False,
                "sidebar_sections": [],
                "sidebar_position": "left",
                "sidebar_width": "300px",
                "show_footer": False,
                "footer_content": None,
                "show_actions": True,
                "actions": [],
                "primary_color": None,
                "secondary_color": None,
                "custom_css": None
            },
            "ai_behavior": {
                "system_prompt": f"You are the {agent_data['name']} agent. {agent_data['description']}",
                "user_prompt": None,
                "personality_traits": [],
                "tone": "professional",
                "default_provider": "mistral",
                "default_model": None,
                "temperature": 0.7,
                "max_tokens": 2048,
                "response_format": None,
                "include_sources": False,
                "include_confidence": False,
                "context_window": 10,
                "include_system_context": True,
                "enable_moderation": False,
                "enable_classification": True,
                "content_filters": [],
                "task_prompts": {}
            },
            "workflows": [],
            "route": agent_data.get("route"),
            "requires_auth": False,
            "allowed_roles": []
        }

        # Write agent file
        with open(agent_path, "w", encoding="utf-8") as f:
            json.dump(agent_def, f, indent=2, default=str, ensure_ascii=False)

        # Add to index
        index[agent_id] = {
            "id": agent_id,
            "name": agent_data["name"],
            "description": agent_data["description"],
            "icon": agent_data["icon"],
            "category": agent_data["category"],
            "status": "active",
            "agent_type": "static",
            "created_at": "2024-01-01T00:00:00",
            "updated_at": now,
            "version": "1.0.0",
            "tags": agent_data.get("tags", [])
        }

        seeded += 1
        print(f"  Created: {agent_id} ({agent_data['name']})")

    # Also ensure existing custom agents have agent_type in index
    for agent_id, meta in index.items():
        if "agent_type" not in meta:
            meta["agent_type"] = "dynamic"

    # Save updated index
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, default=str, ensure_ascii=False)

    print(f"\nDone! Seeded {seeded} static agents. Total in index: {len(index)}")


if __name__ == "__main__":
    main()
