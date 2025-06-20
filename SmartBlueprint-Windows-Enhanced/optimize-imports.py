#!/usr/bin/env python3
"""
SmartBlueprint Pro - Automated Import Optimizer
Removes unused imports and optimizes Python code for production deployment
"""

import ast
import os

class ImportOptimizer:
    def __init__(self):
        self.files_processed = 0
        self.imports_removed = 0
        
    def analyze_file(self, filepath: str) -> Dict[str, Set[str]]:
        """Analyze Python file for used and unused imports"""
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            print(f"Syntax error in {filepath}: {e}")
            return {"used": set(), "unused": set()}
        
        imports = {}
        used_names = set()
        
        # Collect all imports
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    imports[name] = alias.name
            elif isinstance(node, ast.ImportFrom) and node.module:
                for alias in node.names:
                    name = alias.asname if alias.asname else alias.name
                    imports[name] = f"{node.module}.{alias.name}"
        
        # Find used names (including attribute access)
        for node in ast.walk(tree):
            if isinstance(node, ast.Name):
                used_names.add(node.id)
            elif isinstance(node, ast.Attribute):
                # For cases like np.array, sklearn.ensemble
                if isinstance(node.value, ast.Name):
                    used_names.add(node.value.id)
        
        # Determine unused imports
        unused = set()
        for name in imports:
            if name not in used_names:
                unused.add(name)
        
        return {
            "used": used_names & set(imports.keys()),
            "unused": unused,
            "all_imports": imports
        }
    
    def optimize_file(self, filepath: str) -> bool:
        """Remove unused imports from a Python file"""
        analysis = self.analyze_file(filepath)
        
        if not analysis["unused"]:
            return False
        
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # Remove lines containing unused imports
        optimized_lines = []
        removed_count = 0
        
        for line in lines:
            should_remove = False
            
            for unused_import in analysis["unused"]:
                # Check various import patterns
                patterns = [
                    f"import {unused_import}",
                    f"from typing import {unused_import}",
                    f"from {unused_import} import",
                    f"import {unused_import},",
                    f", {unused_import}",
                    f"{unused_import},"
                ]
                
                if any(pattern in line for pattern in patterns):
                    should_remove = True
                    break
            
            if not should_remove:
                optimized_lines.append(line)
            else:
                removed_count += 1
        
        # Write optimized file
        if removed_count > 0:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.writelines(optimized_lines)
            
            self.imports_removed += removed_count
            print(f"✓ Optimized {filepath}: removed {removed_count} unused import lines")
            return True
        
        return False
    
    def optimize_directory(self, directory: str = "."):
        """Optimize all Python files in directory"""
        python_files = []
        
        for root, dirs, files in os.walk(directory):
            # Skip common excluded directories
            dirs[:] = [d for d in dirs if d not in {
                'node_modules', '.git', '__pycache__', '.cache', 
                '.pythonlibs', 'venv', 'env'
            }]
            
            for file in files:
                if file.endswith('.py'):
                    python_files.append(os.path.join(root, file))
        
        print(f"Found {len(python_files)} Python files to analyze...")
        
        for filepath in python_files:
            try:
                if self.optimize_file(filepath):
                    self.files_processed += 1
            except Exception as e:
                print(f"Error processing {filepath}: {e}")
        
        print(f"\n📊 Optimization Complete:")
        print(f"Files processed: {self.files_processed}")
        print(f"Import lines removed: {self.imports_removed}")
        print(f"Code size reduction: ~{self.imports_removed * 25} bytes")

def main():
    optimizer = ImportOptimizer()
    
    # Target specific Python files in SmartBlueprint Pro
    target_files = [
        "ml_inference_service.py",
        "device_scanner.py", 
        "centralized_logging.py",
        "mobile_ping_service.py",
        "advanced_signal_processing.py"
    ]
    
    print("🔧 SmartBlueprint Pro - Import Optimization")
    print("=" * 50)
    
    for filepath in target_files:
        if os.path.exists(filepath):
            analysis = optimizer.analyze_file(filepath)
            if analysis["unused"]:
                print(f"\n📋 {filepath}:")
                print(f"  Unused imports: {', '.join(analysis['unused'])}")
        else:
            print(f"⚠️  File not found: {filepath}")
    
    print(f"\n🚀 Starting optimization...")
    optimizer.optimize_directory()

if __name__ == "__main__":
    main()