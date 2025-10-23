import pandas as pd
import os

data_path = os.path.join('data', 'data.xlsx')

try:
    excel_file = pd.ExcelFile(data_path)
    
    print(f"Excel file loaded successfully from: {data_path}")
    print(f"\nNumber of sheets: {len(excel_file.sheet_names)}")
    print(f"Sheet names: {excel_file.sheet_names}")
    
    all_data = {}
    
    for sheet_name in excel_file.sheet_names:
        df = pd.read_excel(data_path, sheet_name=sheet_name)
        all_data[sheet_name] = df
        
        print(f"\n{'='*50}")
        print(f"Sheet: {sheet_name}")
        print(f"Shape: {df.shape} (rows: {df.shape[0]}, columns: {df.shape[1]})")
        print(f"Columns: {list(df.columns)}")
        print(f"\nFirst 5 rows:")
        print(df.head())
        print(f"\nData types:")
        print(df.dtypes)
        print(f"\nBasic statistics:")
        print(df.describe())
    
    print(f"\n{'='*50}")
    print("All data loaded into 'all_data' dictionary")
    print("Access sheets using: all_data['sheet_name']")
    
except FileNotFoundError:
    print(f"Error: File not found at {data_path}")
except Exception as e:
    print(f"Error loading Excel file: {e}")