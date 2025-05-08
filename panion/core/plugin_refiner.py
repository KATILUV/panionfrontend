"""
Plugin Refiner
Handles plugin evolution by analyzing test failures and applying patches.
"""

import logging
import ast
import astor
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import difflib
from dataclasses import dataclass
import json
import yaml
import shutil
from core.plugin.types import PluginMetadata
from core.plugin_types import FailureAnalysis

logger = logging.getLogger(__name__)

@dataclass
class FailureAnalysis:
    """Analysis of a plugin test failure."""
    test_id: str
    failure_type: str  # security, regression, performance
    error_message: str
    affected_code: str
    suggested_fix: str
    confidence: float

class PluginRefiner:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    async def refine_plugin(self, plugin_name: str, test_report: Dict[str, Any]) -> Optional[str]:
        """Refine a plugin based on test results."""
        try:
            self.logger.info(f"Starting plugin refinement for: {plugin_name}")
            
            # Get plugin details
            plugin = self.plugin_manager.get_plugin(plugin_name)
            if not plugin:
                self.logger.error(f"Plugin {plugin_name} not found")
                return None
                
            # Analyze test report
            issues = self._analyze_test_report(test_report)
            if not issues:
                self.logger.info(f"No issues found in test report for {plugin_name}")
                return None
                
            # Generate refinement plan
            plan = await self._generate_refinement_plan(plugin, issues)
            if not plan:
                self.logger.warning(f"Could not generate refinement plan for {plugin_name}")
                return None
                
            # Apply refinements
            try:
                refined_plugin = await self._apply_refinements(plugin, plan)
                if not refined_plugin:
                    self.logger.error(f"Failed to apply refinements to {plugin_name}")
                    return None
                    
                # Test refined plugin
                test_results = await self.plugin_tester.test_plugin(
                    refined_plugin.name,
                    self._get_test_cases(plugin)
                )
                
                if test_results['status'] == 'success':
                    # Cache refined plugin
                    versioned_name = self.plugin_cache.cache_plugin(
                        refined_plugin.name,
                        Path(refined_plugin.__file__).parent,
                        test_results['report'],
                        self._get_dependencies(refined_plugin),
                        f"Refined version of {plugin_name}"
                    )
                    
                    self.logger.info(f"Successfully refined plugin: {versioned_name}")
                    return versioned_name
                else:
                    self.logger.warning(
                        f"Refined plugin failed tests: {test_results['report']}",
                        extra={'test_results': test_results}
                    )
                    return None
                    
            except Exception as e:
                self.logger.error(
                    f"Error applying refinements: {e}",
                    exc_info=True,
                    extra={
                        'plugin_name': plugin_name,
                        'error_type': type(e).__name__,
                        'error_details': str(e)
                    }
                )
                return None
                
        except Exception as e:
            self.logger.error(
                f"Error in plugin refinement: {e}",
                exc_info=True,
                extra={
                    'plugin_name': plugin_name,
                    'error_type': type(e).__name__,
                    'error_details': str(e)
                }
            )
            return None
            
    def _analyze_failures(self,
                         test_results: Dict[str, Any]) -> List[FailureAnalysis]:
        """Analyze test failures and suggest fixes."""
        failures = []
        
        for result in test_results.get("test_results", []):
            if result["status"] == "success":
                continue
                
            # Analyze security failures
            if result.get("security_issues"):
                for issue in result["security_issues"]:
                    failures.append(self._analyze_security_failure(
                        result["test_id"],
                        issue
                    ))
                    
            # Analyze regression failures
            if result.get("regression_status") == "failed":
                failures.append(self._analyze_regression_failure(
                    result["test_id"],
                    result.get("error", "")
                ))
                
            # Analyze performance failures
            if result["status"] == "performance_failure":
                failures.append(self._analyze_performance_failure(
                    result["test_id"],
                    result["duration"],
                    result["memory_usage"]
                ))
                
        return failures
        
    def _analyze_security_failure(self,
                                test_id: str,
                                issue: str) -> FailureAnalysis:
        """Analyze a security failure and suggest a fix."""
        # Map dangerous operations to safer alternatives
        security_fixes = {
            "os.system": "subprocess.run with shell=False",
            "eval": "ast.literal_eval",
            "exec": "importlib.import_module",
            "socket": "requests library",
            "subprocess": "subprocess.run with shell=False"
        }
        
        for dangerous, safe in security_fixes.items():
            if dangerous in issue:
                return FailureAnalysis(
                    test_id=test_id,
                    failure_type="security",
                    error_message=issue,
                    affected_code=dangerous,
                    suggested_fix=safe,
                    confidence=0.9
                )
                
        return FailureAnalysis(
            test_id=test_id,
            failure_type="security",
            error_message=issue,
            affected_code="",
            suggested_fix="Remove dangerous operation",
            confidence=0.5
        )
        
    def _analyze_regression_failure(self,
                                  test_id: str,
                                  error: str) -> FailureAnalysis:
        """Analyze a regression failure and suggest a fix."""
        # Compare with baseline to identify changes
        baseline = plugin_cache.get_plugin_metadata(test_id)
        if not baseline:
            return FailureAnalysis(
                test_id=test_id,
                failure_type="regression",
                error_message=error,
                affected_code="",
                suggested_fix="Restore baseline behavior",
                confidence=0.5
            )
            
        # Analyze differences
        current = plugin_cache.get_plugin_metadata(test_id)
        if current and current.test_results:
            diff = difflib.unified_diff(
                json.dumps(baseline.test_results, indent=2).splitlines(),
                json.dumps(current.test_results, indent=2).splitlines()
            )
            
            return FailureAnalysis(
                test_id=test_id,
                failure_type="regression",
                error_message=error,
                affected_code="\n".join(diff),
                suggested_fix="Restore baseline behavior",
                confidence=0.8
            )
            
        return FailureAnalysis(
            test_id=test_id,
            failure_type="regression",
            error_message=error,
            affected_code="",
            suggested_fix="Restore baseline behavior",
            confidence=0.5
        )
        
    def _analyze_performance_failure(self,
                                   test_id: str,
                                   duration: float,
                                   memory_usage: float) -> FailureAnalysis:
        """Analyze a performance failure and suggest a fix."""
        if duration > 1.0:
            return FailureAnalysis(
                test_id=test_id,
                failure_type="performance",
                error_message=f"Execution time {duration:.2f}s exceeds 1s threshold",
                affected_code="",
                suggested_fix="Optimize slow operations",
                confidence=0.7
            )
            
        if memory_usage > 100:
            return FailureAnalysis(
                test_id=test_id,
                failure_type="performance",
                error_message=f"Memory usage {memory_usage:.2f}MB exceeds 100MB threshold",
                affected_code="",
                suggested_fix="Reduce memory usage",
                confidence=0.7
            )
            
        return FailureAnalysis(
            test_id=test_id,
            failure_type="performance",
            error_message="Performance failure",
            affected_code="",
            suggested_fix="Optimize resource usage",
            confidence=0.5
        )
        
    def _apply_fix(self, tree: ast.AST, failure: FailureAnalysis) -> bool:
        """Apply a fix to the AST."""
        try:
            if failure.failure_type == "security":
                return self._apply_security_fix(tree, failure)
            elif failure.failure_type == "regression":
                return self._apply_regression_fix(tree, failure)
            elif failure.failure_type == "performance":
                return self._apply_performance_fix(tree, failure)
            return False
        except Exception as e:
            logger.error(f"Error applying fix: {e}")
            return False
            
    def _apply_security_fix(self, tree: ast.AST, failure: FailureAnalysis) -> bool:
        """Apply a security fix to the AST."""
        class SecurityFixVisitor(ast.NodeTransformer):
            def __init__(self, failure):
                self.failure = failure
                self.modified = False
                
            def visit_Call(self, node):
                if isinstance(node.func, ast.Name):
                    if node.func.id in self.failure.affected_code:
                        # Replace with safer alternative
                        if node.func.id == "os.system":
                            new_node = ast.Call(
                                func=ast.Attribute(
                                    value=ast.Name(id="subprocess", ctx=ast.Load()),
                                    attr="run",
                                    ctx=ast.Load()
                                ),
                                args=node.args,
                                keywords=[
                                    ast.keyword(arg="shell", value=ast.Constant(value=False))
                                ]
                            )
                            self.modified = True
                            return new_node
                return node
                
        visitor = SecurityFixVisitor(failure)
        visitor.visit(tree)
        return visitor.modified
        
    def _apply_regression_fix(self, tree: ast.AST, failure: FailureAnalysis) -> bool:
        """Apply a regression fix to the AST."""
        try:
            # Get baseline AST
            baseline_plugin = plugin_cache.get_plugin_metadata(failure.test_id)
            if not baseline_plugin:
                logger.warning(f"No baseline found for test {failure.test_id}")
                return False
                
            baseline_path = plugin_cache.cache_dir / baseline_plugin.name / "plugin.py"
            if not baseline_path.exists():
                logger.warning(f"Baseline file not found: {baseline_path}")
                return False
                
            # Parse baseline code
            with open(baseline_path) as f:
                baseline_code = f.read()
            baseline_tree = ast.parse(baseline_code)
            
            # Compare ASTs to find differences
            class ASTDiffVisitor(ast.NodeVisitor):
                def __init__(self):
                    self.differences = []
                    self.current_path = []
                    
                def visit(self, node):
                    self.current_path.append(type(node).__name__)
                    super().visit(node)
                    self.current_path.pop()
                    
                def visit_Call(self, node):
                    if isinstance(node.func, ast.Name):
                        self.differences.append({
                            'type': 'Call',
                            'name': node.func.id,
                            'path': self.current_path.copy()
                        })
                    super().visit_Call(node)
                    
                def visit_Assign(self, node):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            self.differences.append({
                                'type': 'Assign',
                                'name': target.id,
                                'path': self.current_path.copy()
                            })
                    super().visit_Assign(node)
            
            # Find differences
            visitor = ASTDiffVisitor()
            visitor.visit(tree)
            
            # Apply fixes based on differences
            class RegressionFixVisitor(ast.NodeTransformer):
                def __init__(self, differences, baseline_tree):
                    self.differences = differences
                    self.baseline_tree = baseline_tree
                    self.modified = False
                    self.current_path = []
                    
                def visit(self, node):
                    self.current_path.append(type(node).__name__)
                    result = super().visit(node)
                    self.current_path.pop()
                    return result
                    
                def visit_Call(self, node):
                    if isinstance(node.func, ast.Name):
                        # Check if this call is in the differences
                        for diff in self.differences:
                            if (diff['type'] == 'Call' and 
                                diff['name'] == node.func.id and 
                                diff['path'] == self.current_path):
                                # Find matching call in baseline
                                for baseline_node in ast.walk(self.baseline_tree):
                                    if (isinstance(baseline_node, ast.Call) and
                                        isinstance(baseline_node.func, ast.Name) and
                                        baseline_node.func.id == node.func.id):
                                        # Replace with baseline version
                                        self.modified = True
                                        return baseline_node
                    return node
                    
                def visit_Assign(self, node):
                    for target in node.targets:
                        if isinstance(target, ast.Name):
                            # Check if this assignment is in the differences
                            for diff in self.differences:
                                if (diff['type'] == 'Assign' and 
                                    diff['name'] == target.id and 
                                    diff['path'] == self.current_path):
                                    # Find matching assignment in baseline
                                    for baseline_node in ast.walk(self.baseline_tree):
                                        if (isinstance(baseline_node, ast.Assign) and
                                            any(isinstance(t, ast.Name) and t.id == target.id 
                                                for t in baseline_node.targets)):
                                            # Replace with baseline version
                                            self.modified = True
                                            return baseline_node
                    return node
            
            # Apply fixes
            fix_visitor = RegressionFixVisitor(visitor.differences, baseline_tree)
            fixed_tree = fix_visitor.visit(tree)
            
            if fix_visitor.modified:
                # Update the tree
                tree = fixed_tree
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error applying regression fix: {e}")
            return False
        
    def _apply_performance_fix(self, tree: ast.AST, failure: FailureAnalysis) -> bool:
        """Apply a performance fix to the AST."""
        class PerformanceFixVisitor(ast.NodeTransformer):
            def __init__(self, failure):
                self.failure = failure
                self.modified = False
                
            def visit_For(self, node):
                # Add list comprehension for simple loops
                if isinstance(node.target, ast.Name) and isinstance(node.iter, ast.Call):
                    if isinstance(node.iter.func, ast.Name) and node.iter.func.id == "range":
                        new_node = ast.ListComp(
                            elt=node.body[0].value,
                            generators=[
                                ast.comprehension(
                                    target=node.target,
                                    iter=node.iter,
                                    ifs=[],
                                    is_async=0
                                )
                            ]
                        )
                        self.modified = True
                        return new_node
                return node
                
        visitor = PerformanceFixVisitor(failure)
        visitor.visit(tree)
        return visitor.modified
        
    def _get_next_version(self, versioned_name: str) -> str:
        """Get next version number for a refined plugin."""
        base, version = versioned_name.rsplit("_v", 1)
        return f"{base}_v{int(version) + 1}"

# Create singleton instance
plugin_refiner = PluginRefiner() 