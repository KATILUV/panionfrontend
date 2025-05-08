"""
Data Analysis Module
Provides tools for analyzing and visualizing data from various sources.
"""

import os
import json
import logging
import base64
from io import BytesIO
from typing import List, Dict, Any, Optional, Union, Tuple
from datetime import datetime

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class DataAnalyzer:
    """Tools for analyzing and visualizing data."""
    
    def __init__(self):
        """Initialize the data analyzer."""
        self.data_dir = "./data/analysis"
        self.plots_dir = "./data/plots"
        self.reports_dir = "./data/reports"
        
        # Create necessary directories
        for directory in [self.data_dir, self.plots_dir, self.reports_dir]:
            os.makedirs(directory, exist_ok=True)
    
    def load_data(self, filepath: str) -> pd.DataFrame:
        """
        Load data from a file into a pandas DataFrame.
        
        Args:
            filepath: Path to the data file (JSON or CSV)
            
        Returns:
            pandas DataFrame containing the data
        """
        logger.info(f"Loading data from {filepath}")
        
        if filepath.endswith('.json'):
            # Load JSON data
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Convert to DataFrame
            if isinstance(data, list):
                df = pd.DataFrame(data)
            elif isinstance(data, dict):
                # Try to convert dict to DataFrame
                df = pd.DataFrame.from_dict(data, orient='index')
            else:
                raise ValueError(f"Unsupported JSON structure in {filepath}")
                
        elif filepath.endswith('.csv'):
            # Load CSV data
            df = pd.read_csv(filepath)
        else:
            raise ValueError(f"Unsupported file format: {filepath}")
        
        logger.info(f"Loaded DataFrame with shape {df.shape}")
        return df
    
    def get_basic_stats(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Get basic statistics about the DataFrame.
        
        Args:
            df: pandas DataFrame to analyze
            
        Returns:
            Dictionary containing basic statistics
        """
        logger.info("Calculating basic statistics")
        
        stats = {
            "shape": df.shape,
            "columns": df.columns.tolist(),
            "data_types": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "missing_values": df.isnull().sum().to_dict(),
            "numeric_summary": {},
            "categorical_summary": {},
            "timestamp": datetime.now().isoformat()
        }
        
        # Get summary statistics for numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            stats["numeric_summary"][col] = {
                "min": float(df[col].min()) if not pd.isna(df[col].min()) else None,
                "max": float(df[col].max()) if not pd.isna(df[col].max()) else None,
                "mean": float(df[col].mean()) if not pd.isna(df[col].mean()) else None,
                "median": float(df[col].median()) if not pd.isna(df[col].median()) else None,
                "std": float(df[col].std()) if not pd.isna(df[col].std()) else None
            }
        
        # Get summary statistics for categorical columns
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        for col in categorical_cols:
            value_counts = df[col].value_counts().head(10).to_dict()  # Top 10 categories
            stats["categorical_summary"][col] = {
                "unique_values": df[col].nunique(),
                "most_common": value_counts
            }
        
        return stats
    
    def generate_histogram(self, df: pd.DataFrame, column: str, bins: int = 10, 
                          title: str = None, x_label: str = None, 
                          y_label: str = "Frequency", 
                          color: str = "skyblue") -> str:
        """
        Generate a histogram for a numeric column.
        
        Args:
            df: pandas DataFrame containing the data
            column: Column name to plot
            bins: Number of bins in the histogram
            title: Plot title
            x_label: X-axis label
            y_label: Y-axis label
            color: Bar color
            
        Returns:
            Base64-encoded PNG image of the plot
        """
        logger.info(f"Generating histogram for column: {column}")
        
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
        
        if not pd.api.types.is_numeric_dtype(df[column]):
            raise ValueError(f"Column '{column}' is not numeric")
        
        plt.figure(figsize=(10, 6))
        plt.hist(df[column].dropna(), bins=bins, color=color, alpha=0.8, edgecolor='black')
        
        plt.title(title or f"Histogram of {column}")
        plt.xlabel(x_label or column)
        plt.ylabel(y_label)
        plt.grid(alpha=0.3)
        
        # Save the plot to a BytesIO object
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode as base64
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Also save to disk
        filename = f"histogram_{column}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(self.plots_dir, filename)
        plt.figure(figsize=(10, 6))
        plt.hist(df[column].dropna(), bins=bins, color=color, alpha=0.8, edgecolor='black')
        plt.title(title or f"Histogram of {column}")
        plt.xlabel(x_label or column)
        plt.ylabel(y_label)
        plt.grid(alpha=0.3)
        plt.savefig(filepath, dpi=100)
        plt.close()
        
        logger.info(f"Saved histogram to {filepath}")
        
        return f"data:image/png;base64,{img_base64}"
    
    def generate_bar_chart(self, df: pd.DataFrame, column: str, 
                          title: str = None, x_label: str = None, 
                          y_label: str = "Count", color: str = "skyblue", 
                          limit: int = 10, sort_by: str = "value") -> str:
        """
        Generate a bar chart for a categorical column.
        
        Args:
            df: pandas DataFrame containing the data
            column: Column name to plot
            title: Plot title
            x_label: X-axis label
            y_label: Y-axis label
            color: Bar color
            limit: Maximum number of categories to show
            sort_by: How to sort the bars ("value" or "count")
            
        Returns:
            Base64-encoded PNG image of the plot
        """
        logger.info(f"Generating bar chart for column: {column}")
        
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
        
        # Get value counts
        value_counts = df[column].value_counts()
        
        # Sort and limit the number of categories
        if sort_by == "value":
            value_counts = value_counts.sort_index().head(limit)
        else:  # sort_by == "count"
            value_counts = value_counts.head(limit)
        
        plt.figure(figsize=(12, 6))
        value_counts.plot.bar(color=color, alpha=0.8, edgecolor='black')
        
        plt.title(title or f"Bar Chart of {column}")
        plt.xlabel(x_label or column)
        plt.ylabel(y_label)
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.grid(axis='y', alpha=0.3)
        
        # Save the plot to a BytesIO object
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode as base64
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Also save to disk
        filename = f"barchart_{column}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(self.plots_dir, filename)
        plt.figure(figsize=(12, 6))
        value_counts.plot.bar(color=color, alpha=0.8, edgecolor='black')
        plt.title(title or f"Bar Chart of {column}")
        plt.xlabel(x_label or column)
        plt.ylabel(y_label)
        plt.xticks(rotation=45, ha='right')
        plt.tight_layout()
        plt.grid(axis='y', alpha=0.3)
        plt.savefig(filepath, dpi=100)
        plt.close()
        
        logger.info(f"Saved bar chart to {filepath}")
        
        return f"data:image/png;base64,{img_base64}"
    
    def generate_scatter_plot(self, df: pd.DataFrame, x_column: str, y_column: str, 
                             title: str = None, x_label: str = None, 
                             y_label: str = None, color: str = "blue", 
                             alpha: float = 0.6) -> str:
        """
        Generate a scatter plot for two numeric columns.
        
        Args:
            df: pandas DataFrame containing the data
            x_column: Column name for X axis
            y_column: Column name for Y axis
            title: Plot title
            x_label: X-axis label
            y_label: Y-axis label
            color: Point color
            alpha: Point transparency
            
        Returns:
            Base64-encoded PNG image of the plot
        """
        logger.info(f"Generating scatter plot for {x_column} vs {y_column}")
        
        if x_column not in df.columns or y_column not in df.columns:
            raise ValueError(f"Columns '{x_column}' or '{y_column}' not found in DataFrame")
        
        if not pd.api.types.is_numeric_dtype(df[x_column]) or not pd.api.types.is_numeric_dtype(df[y_column]):
            raise ValueError(f"Both columns must be numeric")
        
        plt.figure(figsize=(10, 6))
        plt.scatter(df[x_column], df[y_column], color=color, alpha=alpha)
        
        # Calculate and display correlation coefficient
        correlation = df[[x_column, y_column]].corr().iloc[0, 1]
        plt.annotate(f"Correlation: {correlation:.2f}", 
                    xy=(0.05, 0.95), xycoords='axes fraction', 
                    ha='left', va='top', 
                    bbox=dict(boxstyle='round,pad=0.5', fc='white', alpha=0.7))
        
        plt.title(title or f"Scatter Plot of {x_column} vs {y_column}")
        plt.xlabel(x_label or x_column)
        plt.ylabel(y_label or y_column)
        plt.grid(alpha=0.3)
        
        # Save the plot to a BytesIO object
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode as base64
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Also save to disk
        filename = f"scatter_{x_column}_vs_{y_column}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(self.plots_dir, filename)
        plt.figure(figsize=(10, 6))
        plt.scatter(df[x_column], df[y_column], color=color, alpha=alpha)
        plt.annotate(f"Correlation: {correlation:.2f}", 
                    xy=(0.05, 0.95), xycoords='axes fraction', 
                    ha='left', va='top', 
                    bbox=dict(boxstyle='round,pad=0.5', fc='white', alpha=0.7))
        plt.title(title or f"Scatter Plot of {x_column} vs {y_column}")
        plt.xlabel(x_label or x_column)
        plt.ylabel(y_label or y_column)
        plt.grid(alpha=0.3)
        plt.savefig(filepath, dpi=100)
        plt.close()
        
        logger.info(f"Saved scatter plot to {filepath}")
        
        return f"data:image/png;base64,{img_base64}"
    
    def generate_pie_chart(self, df: pd.DataFrame, column: str, 
                          title: str = None, limit: int = 10, 
                          colors: List[str] = None) -> str:
        """
        Generate a pie chart for a categorical column.
        
        Args:
            df: pandas DataFrame containing the data
            column: Column name to plot
            title: Plot title
            limit: Maximum number of categories to show
            colors: List of colors for the pie slices
            
        Returns:
            Base64-encoded PNG image of the plot
        """
        logger.info(f"Generating pie chart for column: {column}")
        
        if column not in df.columns:
            raise ValueError(f"Column '{column}' not found in DataFrame")
        
        # Get value counts
        value_counts = df[column].value_counts().head(limit)
        
        # If there are more categories than the limit, add an "Other" category
        total_count = df[column].value_counts().sum()
        if total_count > value_counts.sum():
            other_count = total_count - value_counts.sum()
            value_counts = pd.concat([value_counts, pd.Series({"Other": other_count})])
        
        plt.figure(figsize=(10, 8))
        value_counts.plot.pie(
            autopct='%1.1f%%',
            shadow=True,
            startangle=90,
            colors=colors,
            explode=[0.05] * len(value_counts)  # Slightly explode all slices
        )
        
        plt.title(title or f"Pie Chart of {column}")
        plt.ylabel('')  # Remove y-label
        plt.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle
        
        # Save the plot to a BytesIO object
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode as base64
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Also save to disk
        filename = f"piechart_{column}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(self.plots_dir, filename)
        plt.figure(figsize=(10, 8))
        value_counts.plot.pie(
            autopct='%1.1f%%',
            shadow=True,
            startangle=90,
            colors=colors,
            explode=[0.05] * len(value_counts)  # Slightly explode all slices
        )
        plt.title(title or f"Pie Chart of {column}")
        plt.ylabel('')  # Remove y-label
        plt.axis('equal')  # Equal aspect ratio ensures that pie is drawn as a circle
        plt.savefig(filepath, dpi=100)
        plt.close()
        
        logger.info(f"Saved pie chart to {filepath}")
        
        return f"data:image/png;base64,{img_base64}"
    
    def generate_time_series(self, df: pd.DataFrame, date_column: str, value_column: str, 
                            title: str = None, x_label: str = "Date", 
                            y_label: str = None, color: str = "green", 
                            marker: str = '-o') -> str:
        """
        Generate a time series plot.
        
        Args:
            df: pandas DataFrame containing the data
            date_column: Column name containing dates/times
            value_column: Column name containing values to plot
            title: Plot title
            x_label: X-axis label
            y_label: Y-axis label
            color: Line color
            marker: Line style and marker
            
        Returns:
            Base64-encoded PNG image of the plot
        """
        logger.info(f"Generating time series plot for {value_column} over {date_column}")
        
        if date_column not in df.columns or value_column not in df.columns:
            raise ValueError(f"Columns '{date_column}' or '{value_column}' not found in DataFrame")
        
        if not pd.api.types.is_numeric_dtype(df[value_column]):
            raise ValueError(f"Value column '{value_column}' must be numeric")
        
        # Try to convert the date column to datetime if it's not already
        if not pd.api.types.is_datetime64_dtype(df[date_column]):
            try:
                date_series = pd.to_datetime(df[date_column])
            except:
                raise ValueError(f"Could not convert column '{date_column}' to datetime")
        else:
            date_series = df[date_column]
        
        # Sort by date
        plot_df = pd.DataFrame({
            'date': date_series,
            'value': df[value_column]
        }).sort_values('date')
        
        plt.figure(figsize=(12, 6))
        plt.plot(plot_df['date'], plot_df['value'], marker, color=color)
        
        plt.title(title or f"Time Series of {value_column}")
        plt.xlabel(x_label)
        plt.ylabel(y_label or value_column)
        plt.grid(alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save the plot to a BytesIO object
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode as base64
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Also save to disk
        filename = f"timeseries_{value_column}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(self.plots_dir, filename)
        plt.figure(figsize=(12, 6))
        plt.plot(plot_df['date'], plot_df['value'], marker, color=color)
        plt.title(title or f"Time Series of {value_column}")
        plt.xlabel(x_label)
        plt.ylabel(y_label or value_column)
        plt.grid(alpha=0.3)
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(filepath, dpi=100)
        plt.close()
        
        logger.info(f"Saved time series plot to {filepath}")
        
        return f"data:image/png;base64,{img_base64}"
    
    def generate_correlation_matrix(self, df: pd.DataFrame, columns: List[str] = None, 
                                   title: str = "Correlation Matrix") -> str:
        """
        Generate a correlation matrix heatmap.
        
        Args:
            df: pandas DataFrame containing the data
            columns: List of columns to include in the correlation matrix (numeric only)
            title: Plot title
            
        Returns:
            Base64-encoded PNG image of the plot
        """
        logger.info("Generating correlation matrix")
        
        # Select numeric columns only
        numeric_df = df.select_dtypes(include=['number'])
        
        if columns:
            # Filter to specified columns
            valid_columns = [col for col in columns if col in numeric_df.columns]
            if not valid_columns:
                raise ValueError("None of the specified columns are numeric")
            numeric_df = numeric_df[valid_columns]
        
        if numeric_df.shape[1] < 2:
            raise ValueError("Need at least 2 numeric columns to create a correlation matrix")
        
        # Calculate correlation matrix
        corr_matrix = numeric_df.corr()
        
        # Generate heatmap
        plt.figure(figsize=(10, 8))
        
        # Create a colormap from green to white to red
        cmap = plt.cm.RdYlGn  # Red-Yellow-Green colormap
        
        # Plot heatmap
        plt.imshow(corr_matrix, cmap=cmap, vmin=-1, vmax=1)
        plt.colorbar(label='Correlation coefficient')
        
        # Add cell values
        for i in range(len(corr_matrix.columns)):
            for j in range(len(corr_matrix.columns)):
                plt.text(j, i, f"{corr_matrix.iloc[i, j]:.2f}", 
                        ha="center", va="center", 
                        color="black" if abs(corr_matrix.iloc[i, j]) < 0.7 else "white")
        
        plt.title(title)
        plt.xticks(range(len(corr_matrix.columns)), corr_matrix.columns, rotation=90)
        plt.yticks(range(len(corr_matrix.columns)), corr_matrix.columns)
        plt.tight_layout()
        
        # Save the plot to a BytesIO object
        buf = BytesIO()
        plt.savefig(buf, format='png', dpi=100)
        plt.close()
        
        # Encode as base64
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')
        
        # Also save to disk
        filename = f"correlation_matrix_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        filepath = os.path.join(self.plots_dir, filename)
        plt.figure(figsize=(10, 8))
        plt.imshow(corr_matrix, cmap=cmap, vmin=-1, vmax=1)
        plt.colorbar(label='Correlation coefficient')
        for i in range(len(corr_matrix.columns)):
            for j in range(len(corr_matrix.columns)):
                plt.text(j, i, f"{corr_matrix.iloc[i, j]:.2f}", 
                        ha="center", va="center", 
                        color="black" if abs(corr_matrix.iloc[i, j]) < 0.7 else "white")
        plt.title(title)
        plt.xticks(range(len(corr_matrix.columns)), corr_matrix.columns, rotation=90)
        plt.yticks(range(len(corr_matrix.columns)), corr_matrix.columns)
        plt.tight_layout()
        plt.savefig(filepath, dpi=100)
        plt.close()
        
        logger.info(f"Saved correlation matrix to {filepath}")
        
        return f"data:image/png;base64,{img_base64}"
    
    def generate_summary_report(self, df: pd.DataFrame, title: str = "Data Analysis Report") -> Dict[str, Any]:
        """
        Generate a comprehensive summary report for a dataset.
        
        Args:
            df: pandas DataFrame containing the data
            title: Report title
            
        Returns:
            Dictionary containing report data and visualizations
        """
        logger.info(f"Generating summary report: {title}")
        
        # Initialize report
        report = {
            "title": title,
            "timestamp": datetime.now().isoformat(),
            "data_summary": {
                "rows": df.shape[0],
                "columns": df.shape[1],
                "column_names": df.columns.tolist()
            },
            "basic_stats": self.get_basic_stats(df),
            "visualizations": {}
        }
        
        # Generate visualizations for the report
        try:
            # For each numeric column, create a histogram
            numeric_cols = df.select_dtypes(include=['number']).columns
            for i, col in enumerate(numeric_cols[:5]):  # Limit to first 5 numeric columns
                report["visualizations"][f"histogram_{col}"] = self.generate_histogram(df, col)
            
            # For each categorical column, create a bar chart
            categorical_cols = df.select_dtypes(include=['object', 'category']).columns
            for i, col in enumerate(categorical_cols[:5]):  # Limit to first 5 categorical columns
                report["visualizations"][f"barchart_{col}"] = self.generate_bar_chart(df, col)
            
            # If we have at least 2 numeric columns, create a correlation matrix
            if len(numeric_cols) >= 2:
                report["visualizations"]["correlation_matrix"] = self.generate_correlation_matrix(
                    df, columns=numeric_cols[:8]  # Limit to first 8 numeric columns
                )
                
                # Also create a scatter plot of the 2 most correlated columns
                corr_matrix = df[numeric_cols].corr()
                np.fill_diagonal(corr_matrix.values, 0)  # Zero out the diagonal
                max_corr_idx = np.unravel_index(np.argmax(np.abs(corr_matrix.values)), corr_matrix.shape)
                col1, col2 = corr_matrix.index[max_corr_idx[0]], corr_matrix.columns[max_corr_idx[1]]
                report["visualizations"][f"scatter_{col1}_vs_{col2}"] = self.generate_scatter_plot(df, col1, col2)
        
        except Exception as e:
            logger.error(f"Error generating visualizations: {str(e)}")
            report["error"] = str(e)
        
        # Save report to disk
        report_filename = f"report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        report_filepath = os.path.join(self.reports_dir, report_filename)
        
        # Remove base64 encoded images from the saved report to reduce file size
        disk_report = report.copy()
        disk_report["visualizations"] = {k: f"Saved as image file" for k in report["visualizations"].keys()}
        
        with open(report_filepath, 'w', encoding='utf-8') as f:
            json.dump(disk_report, f, indent=2)
        
        logger.info(f"Saved summary report to {report_filepath}")
        
        return report

# For testing
if __name__ == "__main__":
    analyzer = DataAnalyzer()
    
    # Create a sample DataFrame
    data = {
        'product': ['Apple', 'Banana', 'Cherry', 'Date', 'Elderberry'] * 10,
        'price': np.random.uniform(1, 10, 50),
        'quantity': np.random.randint(1, 100, 50),
        'rating': np.random.uniform(1, 5, 50),
        'category': np.random.choice(['Fruit', 'Berry', 'Exotic'], 50),
        'date': pd.date_range('2023-01-01', periods=50)
    }
    df = pd.DataFrame(data)
    
    # Generate and save a summary report
    report = analyzer.generate_summary_report(df, "Sample Product Data Analysis")