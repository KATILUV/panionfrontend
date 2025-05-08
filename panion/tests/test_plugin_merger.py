"""
Tests for the plugin merger system.
"""

import pytest
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock
import ast
import astor
from datetime import datetime
from core.plugin_merger import PluginMerger, Feature
from core.plugin.types import PluginMetadata

@pytest.fixture
def plugin_merger():
    """Create a plugin merger instance."""
    return PluginMerger(min_success_rate=0.8)

@pytest.fixture
def mock_plugin_cache():
    """Create a mock plugin cache."""
    with patch("core.plugin_merger.plugin_cache") as mock:
        mock.get_plugin = Mock()
        mock.get_plugin_metadata = Mock()
        yield mock

@pytest.fixture
def mock_plugin_tester():
    """Create a mock plugin tester."""
    with patch("core.plugin_merger.plugin_tester") as mock:
        mock.test_plugin = AsyncMock()
        yield mock

@pytest.fixture
def test_plugin_dir(tmp_path):
    """Create a test plugin directory."""
    plugin_dir = tmp_path / "test_plugin"
    plugin_dir.mkdir()
    return plugin_dir

@pytest.fixture
def version1_code():
    """Create code for version 1 of a plugin."""
    return """
import requests
import json

def fetch_data(url):
    response = requests.get(url)
    return response.json()

def process_data(data):
    return {"processed": data}
    """

@pytest.fixture
def version2_code():
    """Create code for version 2 of a plugin."""
    return """
import requests
import json
from typing import Dict

def fetch_data(url: str) -> Dict:
    response = requests.get(url, timeout=10)
    return response.json()

def analyze_data(data):
    return {"analysis": data}
    """

@pytest.fixture
def version3_code():
    """Create code for version 3 of a plugin."""
    return """
import requests
import json
from typing import Dict, Any

def fetch_data(url: str) -> Dict[str, Any]:
    response = requests.get(url, timeout=10, verify=True)
    return response.json()

def process_data(data):
    return {"processed": data}

def analyze_data(data):
    return {"analysis": data}
    """

@pytest.fixture
def sample_plugin_code():
    """Create sample plugin code for testing."""
    return """
def feature1():
    return "Feature 1"

class Feature2:
    def method1(self):
        return "Method 1"
        
    def method2(self):
        return "Method 2"
    """

@pytest.fixture
def sample_metadata():
    """Create sample plugin metadata."""
    return PluginMetadata(
        name="test_plugin",
        version="1.0.0",
        created_at="2024-01-01",
        last_used="2024-01-01",
        success_rate=0.9,
        test_results={"passed": 9, "failed": 1},
        dependencies=["dep1", "dep2"],
        description="Test plugin",
        author="Test Author",
        tags=["test"]
    )

@pytest.mark.asyncio
async def test_extract_features(plugin_merger, mock_plugin_cache, sample_plugin_code, sample_metadata):
    """Test feature extraction from plugin version."""
    # Setup mocks
    mock_plugin_cache.get_plugin.return_value = Path("/tmp/test_plugin")
    mock_plugin_cache.get_plugin_metadata.return_value = sample_metadata
    
    # Create temporary plugin file
    plugin_dir = Path("/tmp/test_plugin")
    plugin_dir.mkdir(exist_ok=True)
    plugin_file = plugin_dir / "plugin.py"
    plugin_file.write_text(sample_plugin_code)
    
    # Extract features
    features = await plugin_merger.extract_features("test_plugin_1.0.0")
    
    # Verify features
    assert len(features) == 3  # One function and two methods
    assert any(f.name == "feature1" for f in features)
    assert any(f.name == "method1" for f in features)
    assert any(f.name == "method2" for f in features)
    
    # Verify feature metadata
    for feature in features:
        assert feature.success_rate == 0.9
        assert feature.dependencies == ["dep1", "dep2"]
        assert feature.version == "test_plugin_1.0.0"

@pytest.mark.asyncio
async def test_find_similar_features(plugin_merger):
    """Test finding similar features."""
    # Create sample features
    feature1 = Feature(
        name="feature1",
        code="def feature1(): return 1",
        success_rate=0.9,
        test_results={},
        dependencies=[],
        version="1.0.0"
    )
    
    feature2 = Feature(
        name="feature1",
        code="def feature1(): return 1",  # Identical code
        success_rate=0.8,
        test_results={},
        dependencies=[],
        version="2.0.0"
    )
    
    feature3 = Feature(
        name="feature2",
        code="def feature2(): return 2",  # Different code
        success_rate=0.9,
        test_results={},
        dependencies=[],
        version="1.0.0"
    )
    
    # Find similar features
    similar_pairs = plugin_merger.find_similar_features([feature1, feature2, feature3])
    
    # Verify results
    assert len(similar_pairs) == 1
    assert similar_pairs[0][0].version == "1.0.0"
    assert similar_pairs[0][1].version == "2.0.0"

@pytest.mark.asyncio
async def test_merge_features(plugin_merger, tmp_path):
    """Test merging features into a new plugin."""
    # Create sample features
    features = [
        Feature(
            name="feature1",
            code="def feature1(): return 1",
            success_rate=0.9,
            test_results={},
            dependencies=["dep1"],
            version="1.0.0"
        ),
        Feature(
            name="feature2",
            code="def feature2(): return 2",
            success_rate=0.8,
            test_results={},
            dependencies=["dep2"],
            version="2.0.0"
        ),
        Feature(
            name="feature3",
            code="def feature3(): return 3",
            success_rate=0.7,  # Below threshold
            test_results={},
            dependencies=["dep3"],
            version="3.0.0"
        )
    ]
    
    # Merge features
    success = await plugin_merger.merge_features(features, tmp_path)
    
    # Verify results
    assert success
    assert (tmp_path / "plugin.py").exists()
    assert (tmp_path / "requirements.txt").exists()
    
    # Verify merged code
    merged_code = (tmp_path / "plugin.py").read_text()
    assert "def feature1(): return 1" in merged_code
    assert "def feature2(): return 2" in merged_code
    assert "def feature3(): return 3" not in merged_code  # Below threshold
    
    # Verify dependencies
    deps = (tmp_path / "requirements.txt").read_text().splitlines()
    assert "dep1" in deps
    assert "dep2" in deps
    assert "dep3" not in deps

@pytest.mark.asyncio
async def test_merge_versions(plugin_merger, mock_plugin_cache, mock_plugin_tester, tmp_path):
    """Test merging multiple plugin versions."""
    # Setup mocks
    mock_plugin_cache.get_plugin.return_value = tmp_path
    mock_plugin_cache.get_plugin_metadata.return_value = PluginMetadata(
        name="test_plugin",
        version="1.0.0",
        created_at="2024-01-01",
        last_used="2024-01-01",
        success_rate=0.9,
        test_results={"passed": 9, "failed": 1},
        dependencies=["dep1"],
        description="Test plugin",
        author="Test Author",
        tags=["test"]
    )
    mock_plugin_tester.test_plugin.return_value = {"passed": True}
    
    # Create sample plugin files
    for version in ["1.0.0", "2.0.0"]:
        plugin_dir = tmp_path / f"plugin_{version}"
        plugin_dir.mkdir(exist_ok=True)
        plugin_file = plugin_dir / "plugin.py"
        plugin_file.write_text(f"def feature{version}(): return {version}")
    
    # Merge versions
    new_version = await plugin_merger.merge_versions(
        ["plugin_1.0.0", "plugin_2.0.0"],
        tmp_path / "merged"
    )
    
    # Verify results
    assert new_version is not None
    assert new_version.startswith("merged_")
    assert (tmp_path / "merged" / "plugin.py").exists()
    assert (tmp_path / "merged" / "requirements.txt").exists()

@pytest.mark.asyncio
async def test_merge_versions_test_failure(plugin_merger, mock_plugin_cache, mock_plugin_tester, tmp_path):
    """Test merging versions when tests fail."""
    # Setup mocks
    mock_plugin_cache.get_plugin.return_value = tmp_path
    mock_plugin_cache.get_plugin_metadata.return_value = PluginMetadata(
        name="test_plugin",
        version="1.0.0",
        created_at="2024-01-01",
        last_used="2024-01-01",
        success_rate=0.9,
        test_results={"passed": 9, "failed": 1},
        dependencies=["dep1"],
        description="Test plugin",
        author="Test Author",
        tags=["test"]
    )
    mock_plugin_tester.test_plugin.return_value = {"passed": False}
    
    # Create sample plugin files
    for version in ["1.0.0", "2.0.0"]:
        plugin_dir = tmp_path / f"plugin_{version}"
        plugin_dir.mkdir(exist_ok=True)
        plugin_file = plugin_dir / "plugin.py"
        plugin_file.write_text(f"def feature{version}(): return {version}")
    
    # Merge versions
    new_version = await plugin_merger.merge_versions(
        ["plugin_1.0.0", "plugin_2.0.0"],
        tmp_path / "merged"
    )
    
    # Verify results
    assert new_version is None  # Should return None when tests fail

def test_extract_features(merger, test_plugin_dir, version1_code):
    """Test feature extraction."""
    # Create version 1
    v1_dir = plugin_cache.cache_dir / "test_plugin_v1"
    v1_dir.mkdir()
    (v1_dir / "plugin.py").write_text(version1_code)
    
    # Add metadata
    plugin_cache.metadata["test_plugin_v1"] = {
        "name": "test_plugin",
        "version": "test_plugin_v1",
        "created_at": datetime.now().isoformat(),
        "last_used": datetime.now().isoformat(),
        "success_rate": 0.8,
        "test_results": {"total_tests": 10, "passed": 8},
        "dependencies": ["requests==2.28.1"],
        "description": "Test plugin v1"
    }
    
    # Extract features
    features = merger.extract_features("test_plugin_v1")
    
    assert len(features) == 2
    assert any(f.name == "fetch_data" for f in features)
    assert any(f.name == "process_data" for f in features)
    assert all(f.success_rate == 0.8 for f in features)

def test_find_similar_features(merger, version1_code, version2_code):
    """Test finding similar features."""
    # Create features
    features = [
        Feature(
            name="fetch_data",
            code=version1_code,
            success_rate=0.8,
            test_results={},
            dependencies=["requests"],
            version="v1"
        ),
        Feature(
            name="fetch_data",
            code=version2_code,
            success_rate=0.9,
            test_results={},
            dependencies=["requests"],
            version="v2"
        )
    ]
    
    # Find similar features
    similar_pairs = merger.find_similar_features(features)
    
    assert len(similar_pairs) == 1
    assert similar_pairs[0][0].version == "v1"
    assert similar_pairs[0][1].version == "v2"

def test_merge_features(merger, version1_code, version2_code, version3_code):
    """Test merging features."""
    # Create features from all versions
    features = [
        Feature(
            name="fetch_data",
            code=version1_code,
            success_rate=0.8,
            test_results={},
            dependencies=["requests"],
            version="v1"
        ),
        Feature(
            name="fetch_data",
            code=version2_code,
            success_rate=0.9,
            test_results={},
            dependencies=["requests"],
            version="v2"
        ),
        Feature(
            name="process_data",
            code=version3_code,
            success_rate=0.95,
            test_results={},
            dependencies=["requests"],
            version="v3"
        )
    ]
    
    # Merge features
    merged_code = merger.merge_features(features)
    
    # Check merged code
    assert "import requests" in merged_code
    assert "import json" in merged_code
    assert "from typing import Dict" in merged_code
    assert "def fetch_data" in merged_code
    assert "def process_data" in merged_code
    assert "timeout=10" in merged_code  # From v2
    assert "verify=True" in merged_code  # From v3

@pytest.mark.asyncio
async def test_merge_versions(merger, test_plugin_dir, version1_code, version2_code, version3_code):
    """Test merging plugin versions."""
    # Create three versions
    versions = []
    for i, code in enumerate([version1_code, version2_code, version3_code]):
        version = f"test_plugin_v{i+1}"
        version_dir = plugin_cache.cache_dir / version
        version_dir.mkdir()
        (version_dir / "plugin.py").write_text(code)
        
        # Add metadata
        plugin_cache.metadata[version] = {
            "name": "test_plugin",
            "version": version,
            "created_at": datetime.now().isoformat(),
            "last_used": datetime.now().isoformat(),
            "success_rate": 0.8 + (i * 0.1),  # Increasing success rates
            "test_results": {"total_tests": 10, "passed": 8 + i},
            "dependencies": ["requests==2.28.1"],
            "description": f"Test plugin v{i+1}"
        }
        versions.append(version)
    
    # Merge versions
    merged_version = await merger.merge_versions("test_plugin")
    
    assert merged_version is not None
    assert merged_version == "test_plugin_v4"
    
    # Check merged plugin
    merged_dir = plugin_cache.cache_dir / merged_version
    assert merged_dir.exists()
    assert (merged_dir / "plugin.py").exists()
    
    # Check metadata
    assert merged_version in plugin_cache.metadata
    metadata = plugin_cache.metadata[merged_version]
    assert metadata["name"] == "test_plugin"
    assert "Merged version" in metadata["description"]

@pytest.mark.asyncio
async def test_merge_versions_insufficient(merger, test_plugin_dir, version1_code):
    """Test merging with insufficient versions."""
    # Create single version
    version = "test_plugin_v1"
    version_dir = plugin_cache.cache_dir / version
    version_dir.mkdir()
    (version_dir / "plugin.py").write_text(version1_code)
    
    # Add metadata
    plugin_cache.metadata[version] = {
        "name": "test_plugin",
        "version": version,
        "created_at": datetime.now().isoformat(),
        "last_used": datetime.now().isoformat(),
        "success_rate": 0.8,
        "test_results": {"total_tests": 10, "passed": 8},
        "dependencies": ["requests==2.28.1"],
        "description": "Test plugin v1"
    }
    
    # Try to merge
    merged_version = await merger.merge_versions("test_plugin")
    assert merged_version is None

@pytest.mark.asyncio
async def test_merge_versions_no_features(merger, test_plugin_dir):
    """Test merging versions with no features."""
    # Create empty versions
    for i in range(2):
        version = f"test_plugin_v{i+1}"
        version_dir = plugin_cache.cache_dir / version
        version_dir.mkdir()
        (version_dir / "plugin.py").write_text("")
        
        # Add metadata
        plugin_cache.metadata[version] = {
            "name": "test_plugin",
            "version": version,
            "created_at": datetime.now().isoformat(),
            "last_used": datetime.now().isoformat(),
            "success_rate": 0.8,
            "test_results": {"total_tests": 10, "passed": 8},
            "dependencies": ["requests==2.28.1"],
            "description": f"Test plugin v{i+1}"
        }
    
    # Try to merge
    merged_version = await merger.merge_versions("test_plugin")
    assert merged_version is None 