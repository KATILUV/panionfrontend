"""Plugin template package

This package contains template implementations of various types of plugins.
These templates can be used as starting points for creating new plugins.
"""

# Import template classes
# These imports will vary based on the actual template files present
try:
    from .basic_plugin import BasicPlugin
except ImportError:
    pass

try:
    from .data_processing_plugin import DataProcessingPlugin
except ImportError:
    pass

try:
    from .service_plugin import ServicePlugin
except ImportError:
    pass

try:
    from .text_analysis_plugin import TextAnalysisPlugin
except ImportError:
    pass

try:
    from .utility_plugin import UtilityPlugin
except ImportError:
    pass

try:
    from .web_scraping_plugin import WebScrapingPlugin
except ImportError:
    pass

# Export template classes
__all__ = [
    'BasicPlugin',
    'DataProcessingPlugin',
    'ServicePlugin',
    'TextAnalysisPlugin',
    'UtilityPlugin',
    'WebScrapingPlugin'
]