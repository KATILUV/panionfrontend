"""
Tests for the enhanced reflection system.
"""

import pytest
from datetime import datetime, timedelta
import json
from pathlib import Path
import sqlite3
from core.reflection import ReflectionSystem, Reflection, ReflectionType
from typing import Dict, Any

@pytest.fixture
def reflection_system(tmp_path):
    """Create a reflection system with a temporary database."""
    system = ReflectionSystem()
    system._db_path = tmp_path / "reflections.db"
    system._initialize_database()
    return system

@pytest.fixture
def sample_reflection():
    """Create a sample reflection for testing."""
    return Reflection(
        id="test_reflection_1",
        timestamp=datetime.now().isoformat(),
        context="test_context",
        event="test_event",
        type=ReflectionType.SUCCESS.value,
        content={"message": "Test reflection"},
        metadata={"source": "test"},
        tags=["test", "sample"],
        importance=0.8,
        related_reflections=[],
        version=1
    )

async def test_store_and_get_reflection(reflection_system, sample_reflection):
    """Test storing and retrieving a reflection."""
    # Store reflection
    reflection_id = await reflection_system.store_reflection(sample_reflection)
    assert reflection_id == sample_reflection.id

    # Get reflection
    retrieved = await reflection_system.get_reflection(reflection_id)
    assert retrieved is not None
    assert retrieved.id == sample_reflection.id
    assert retrieved.context == sample_reflection.context
    assert retrieved.type == sample_reflection.type
    assert retrieved.content == sample_reflection.content

async def test_search_reflections(reflection_system, sample_reflection):
    """Test searching reflections with various filters."""
    # Store test reflection
    await reflection_system.store_reflection(sample_reflection)

    # Test context filter
    results = await reflection_system.search_reflections(context="test_context")
    assert len(results) == 1
    assert results[0].id == sample_reflection.id

    # Test type filter
    results = await reflection_system.search_reflections(reflection_type=ReflectionType.SUCCESS.value)
    assert len(results) == 1
    assert results[0].id == sample_reflection.id

    # Test tags filter
    results = await reflection_system.search_reflections(tags=["test"])
    assert len(results) == 1
    assert results[0].id == sample_reflection.id

    # Test importance filter
    results = await reflection_system.search_reflections(min_importance=0.7)
    assert len(results) == 1
    assert results[0].id == sample_reflection.id

async def test_update_reflection(reflection_system, sample_reflection):
    """Test updating a reflection."""
    # Store initial reflection
    await reflection_system.store_reflection(sample_reflection)

    # Update reflection
    sample_reflection.content = {"message": "Updated reflection"}
    sample_reflection.importance = 0.9
    success = await reflection_system.update_reflection(sample_reflection)
    assert success

    # Verify update
    updated = await reflection_system.get_reflection(sample_reflection.id)
    assert updated.content == {"message": "Updated reflection"}
    assert updated.importance == 0.9
    assert updated.version == 2

async def test_delete_reflection(reflection_system, sample_reflection):
    """Test deleting a reflection."""
    # Store reflection
    await reflection_system.store_reflection(sample_reflection)

    # Delete reflection
    success = await reflection_system.delete_reflection(sample_reflection.id)
    assert success

    # Verify deletion
    deleted = await reflection_system.get_reflection(sample_reflection.id)
    assert deleted is None

async def test_reflection_stats(reflection_system, sample_reflection):
    """Test reflection statistics."""
    # Store test reflection
    await reflection_system.store_reflection(sample_reflection)

    # Get stats
    stats = await reflection_system.get_reflection_stats()
    assert stats["total_reflections"] == 1
    assert stats["by_type"][ReflectionType.SUCCESS.value] == 1
    assert stats["by_context"]["test_context"] == 1
    assert stats["by_time"]["last_24h"] == 1
    assert stats["avg_importance"] == 0.8

async def test_multiple_reflections(reflection_system):
    """Test handling multiple reflections."""
    # Create multiple reflections
    reflections = []
    for i in range(5):
        reflection = Reflection(
            id=f"test_reflection_{i}",
            timestamp=datetime.now().isoformat(),
            context=f"test_context_{i}",
            event=f"test_event_{i}",
            type=ReflectionType.SUCCESS.value,
            content={"message": f"Test reflection {i}"},
            metadata={"source": "test"},
            tags=["test", f"sample_{i}"],
            importance=0.5 + (i * 0.1),
            related_reflections=[],
            version=1
        )
        reflections.append(reflection)
        await reflection_system.store_reflection(reflection)

    # Test search with limit
    results = await reflection_system.search_reflections(limit=3)
    assert len(results) == 3

    # Test search with multiple tags
    results = await reflection_system.search_reflections(tags=["test", "sample_0"])
    assert len(results) == 1
    assert results[0].id == "test_reflection_0"

async def test_reflection_relationships(reflection_system):
    """Test reflection relationships."""
    # Create parent reflection
    parent = Reflection(
        id="parent_reflection",
        timestamp=datetime.now().isoformat(),
        context="test_context",
        event="parent_event",
        type=ReflectionType.SUCCESS.value,
        content={"message": "Parent reflection"},
        metadata={"source": "test"},
        tags=["test", "parent"],
        importance=0.8,
        related_reflections=[],
        version=1
    )
    await reflection_system.store_reflection(parent)

    # Create child reflection
    child = Reflection(
        id="child_reflection",
        timestamp=datetime.now().isoformat(),
        context="test_context",
        event="child_event",
        type=ReflectionType.SUCCESS.value,
        content={"message": "Child reflection"},
        metadata={"source": "test"},
        tags=["test", "child"],
        importance=0.6,
        related_reflections=[parent.id],
        version=1
    )
    await reflection_system.store_reflection(child)

    # Update parent with child reference
    parent.related_reflections = [child.id]
    await reflection_system.update_reflection(parent)

    # Verify relationships
    retrieved_parent = await reflection_system.get_reflection(parent.id)
    retrieved_child = await reflection_system.get_reflection(child.id)
    assert child.id in retrieved_parent.related_reflections
    assert parent.id in retrieved_child.related_reflections

async def test_reflection_versioning(reflection_system, sample_reflection):
    """Test reflection versioning."""
    # Store initial reflection
    await reflection_system.store_reflection(sample_reflection)

    # Make multiple updates
    for i in range(3):
        sample_reflection.content = {"message": f"Updated reflection {i}"}
        sample_reflection.importance = 0.8 + (i * 0.1)
        await reflection_system.update_reflection(sample_reflection)

    # Verify final version
    final = await reflection_system.get_reflection(sample_reflection.id)
    assert final.version == 4
    assert final.content == {"message": "Updated reflection 2"}
    assert final.importance == 1.0

async def test_error_handling(reflection_system):
    """Test error handling in reflection operations."""
    # Test invalid reflection ID
    result = await reflection_system.get_reflection("nonexistent_id")
    assert result is None

    # Test invalid update
    invalid_reflection = Reflection(
        id="nonexistent_id",
        timestamp=datetime.now().isoformat(),
        context="test_context",
        event="test_event",
        type=ReflectionType.SUCCESS.value,
        content={},
        metadata={},
        tags=[],
        importance=0.5,
        related_reflections=[],
        version=1
    )
    success = await reflection_system.update_reflection(invalid_reflection)
    assert not success

    # Test invalid delete
    success = await reflection_system.delete_reflection("nonexistent_id")
    assert not success

class EnhancedPluginTester:
    async def test_plugin(self, plugin: Dict[str, Any]) -> Dict[str, Any]:
        results = {
            "sandbox": await self._run_sandbox_tests(plugin),
            "regression": await self._run_regression_tests(plugin),
            "performance": await self._run_performance_tests(plugin),
            "security": await self._run_security_checks(plugin)
        }
        
        return {
            "status": "success" if all(r["status"] == "success" for r in results.values()) else "failure",
            "results": results
        }

class EnhancedReflectionSystem:
    async def store_reflection(self, reflection: Dict[str, Any]):
        # Store with metadata for future lookup
        await self.memory_manager.store(
            f"reflection:{reflection['task_id']}",
            reflection,
            metadata={
                "error_type": reflection["error_type"],
                "confidence": reflection["confidence"],
                "timestamp": datetime.now()
            }
        )
        
    async def find_similar_failures(self, error_type: str, confidence: float):
        # Find similar past failures
        return await self.memory_manager.search(
            "reflection:*",
            {
                "error_type": error_type,
                "confidence": {"$gte": confidence}
            }
        ) 