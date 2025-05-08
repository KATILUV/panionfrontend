# Test Suite

The tests directory contains all test cases for the Panion system, including unit tests, integration tests, and system tests.

## Directory Structure

```
tests/
├── unit/              # Unit tests
│   ├── core/         # Core system tests
│   ├── plugins/      # Plugin tests
│   └── utils/        # Utility tests
├── integration/       # Integration tests
│   ├── system/       # System integration tests
│   └── plugins/      # Plugin integration tests
└── system/           # System-wide tests
    ├── performance/  # Performance tests
    └── stress/       # Stress tests
```

## Test Categories

### Unit Tests (`unit/`)
- Individual component testing
- Mock dependencies
- Fast execution
- High coverage

### Integration Tests (`integration/`)
- Component interaction testing
- Real dependencies
- System behavior verification
- End-to-end flows

### System Tests (`system/`)
- Full system testing
- Performance benchmarks
- Stress testing
- Load testing

## Running Tests

1. **All Tests**
   ```bash
   python -m pytest tests/
   ```

2. **Specific Categories**
   ```bash
   # Unit tests
   python -m pytest tests/unit/
   
   # Integration tests
   python -m pytest tests/integration/
   
   # System tests
   python -m pytest tests/system/
   ```

3. **Specific Test Files**
   ```bash
   python -m pytest tests/unit/core/test_plugin.py
   ```

## Test Guidelines

1. **Test Structure**
   ```python
   import pytest
   from core.plugin.base import Plugin
   
   class TestPlugin:
       @pytest.fixture
       def plugin(self):
           return Plugin()
       
       def test_plugin_initialization(self, plugin):
           assert plugin.state == "uninitialized"
   ```

2. **Best Practices**
   - Use descriptive test names
   - One assertion per test
   - Use fixtures for setup
   - Clean up after tests
   - Mock external dependencies
   - Test edge cases

3. **Coverage**
   ```bash
   # Run tests with coverage
   python -m pytest --cov=core tests/
   
   # Generate coverage report
   python -m pytest --cov=core --cov-report=html tests/
   ```

## Test Categories

### Core Tests
- Plugin system tests
- Memory system tests
- Goal system tests
- Interface tests

### Plugin Tests
- Plugin lifecycle tests
- Plugin security tests
- Plugin integration tests
- Plugin performance tests

### System Tests
- End-to-end tests
- Performance benchmarks
- Stress tests
- Load tests

## Continuous Integration

1. **GitHub Actions**
   ```yaml
   name: Tests
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Run tests
           run: python -m pytest tests/
   ```

2. **Test Reports**
   - Test coverage reports
   - Performance metrics
   - Test duration
   - Failure analysis

## Debugging Tests

1. **Using pytest**
   ```bash
   # Run with debug output
   python -m pytest -v tests/
   
   # Run with print statements
   python -m pytest -s tests/
   ```

2. **Using IDE**
   - Set breakpoints
   - Step through code
   - Inspect variables
   - View call stack 