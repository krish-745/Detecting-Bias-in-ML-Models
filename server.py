from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io
import operator

# Import your math functions
from diagnostics import detect_proxy, check_ratio, check_data_desert, check_intersection

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"],
)

class DiagnosticRequest(BaseModel):
    csv_data: str
    config: dict

# --- The Smart Binner ---
ops = {'>=': operator.ge, '<=': operator.le, '>': operator.gt, '<': operator.lt, '==': operator.eq, '!=': operator.ne}

def create_binned_column(df, col, priv_val, unpriv_val):
    temp_col = f"{col}_binned"
    df[temp_col] = "Other"

    # Safely force the column to numeric. If it's a text column like 'Race', it safely becomes NaN
    col_numeric = pd.to_numeric(df[col], errors='coerce')

    def get_mask(condition):
        cond_str = str(condition).strip()
        if not cond_str: # Catch empty inputs
            return pd.Series([False]*len(df), index=df.index)

        # 1. Check for math operators (>=, <, etc)
        for op_str, op_func in ops.items():
            if cond_str.startswith(op_str):
                try:
                    val = float(cond_str[len(op_str):].strip())
                    return op_func(col_numeric, val) & col_numeric.notna()
                except ValueError:
                    pass
        
        # 2. Check for exact numeric match (if they just typed "40")
        try:
            return col_numeric == float(cond_str)
        except ValueError:
            # 3. Fallback to exact text match (strips spaces just in case)
            return df[col].astype(str).str.strip() == cond_str

    df.loc[get_mask(unpriv_val), temp_col] = "Unprivileged"
    df.loc[get_mask(priv_val), temp_col] = "Privileged" 
    return temp_col
# -----------------------------

@app.post("/api/diagnostics")
async def run_diagnostics(req: DiagnosticRequest):
    df = pd.read_csv(io.StringIO(req.csv_data))
    
    # --- THE DATA CLEANER ---
    # The Adult dataset has hidden spaces everywhere. This strips them out of all text columns.
    df_obj = df.select_dtypes(['object'])
    if not df_obj.empty:
        df[df_obj.columns] = df_obj.apply(lambda x: x.str.strip())
    # -----------------------------------------

    cfg = req.config
    
    target = cfg['target_col']
    raw_fav = cfg['fav_outcome']
    
    # Make sure we also strip any spaces the user accidentally typed in the UI
    fav_outcome = int(raw_fav) if str(raw_fav).isdigit() else str(raw_fav).strip()
    
    results = {}

    for prot in cfg['prot_cols']:
        attr_results = {}
        
        raw_priv = cfg.get('group_mappings', {}).get(prot, {}).get('priv', '')
        raw_unpriv = cfg.get('group_mappings', {}).get(prot, {}).get('unpriv', '')
        
        # --- Apply the Binner ---
        binned_prot = create_binned_column(df, prot, raw_priv, raw_unpriv)
        
        # --- THE SAFETY NET ---
        priv_count = (df[binned_prot] == "Privileged").sum()
        unpriv_count = (df[binned_prot] == "Unprivileged").sum()
        
        # If the user made a typo or left it blank, stop the math and return a clear error!
        if priv_count == 0 or unpriv_count == 0:
            err_msg = f"Zero rows matched! Found {priv_count} Privileged and {unpriv_count} Unprivileged. Make sure you typed the conditions correctly (e.g. '>=40')."
            results[prot] = {
                'disparate_impact': {"error": err_msg},
                'data_desert': {"error": err_msg},
                'proxy': {"error": err_msg},
                'intersection': {"error": err_msg}
            }
            continue
        
        # 1. 4/5ths Rule
        di_ratio, is_legal = check_ratio(df, binned_prot, target, "Privileged", "Unprivileged", fav_outcome, cfg['threshold_45'])
        attr_results['disparate_impact'] = {
            "ratio": None if pd.isna(di_ratio) else di_ratio,
            "is_legal": bool(is_legal),
            "threshold": cfg['threshold_45']
        }
        
        # 2. Data Deserts
        desert_df = check_data_desert(df, binned_prot, cfg['desert_thresh'])
        desert_list = desert_df.reset_index().rename(columns={'index': 'group'}).to_dict('records')
        attr_results['data_desert'] = {
            "threshold": cfg['desert_thresh'],
            "groups": [{"group": row[binned_prot], "proportion": row["proportion"], "is_desert": row["is_desert"]} for row in desert_list]
        }
        
        # 3. Proxies 
        df_for_proxy = df.drop(columns=[prot]).copy()
        
        # --- NEW: The Scikit-Learn NaN Fix ---
        # Scikit-learn will crash if it sees missing data. We must fill empty cells first.
        for col in df_for_proxy.columns:
            if df_for_proxy[col].dtype == 'object':
                df_for_proxy[col] = df_for_proxy[col].fillna("Missing")
            else:
                df_for_proxy[col] = df_for_proxy[col].fillna(-9999)
        # -------------------------------------

        proxy_df = detect_proxy(df_for_proxy, binned_prot, cfg['proxy_thresh'], target)
        
        if not proxy_df.empty:
            proxy_list = proxy_df.reset_index().rename(columns={'index': 'feature'}).to_dict('records')
            attr_results['proxy'] = {"proxies": proxy_list}
        else:
            attr_results['proxy'] = {"proxies": []}

        # 4. Intersectional
        intersection_cols = list(dict.fromkeys([binned_prot] + cfg['sec_prots']))
        gap, is_gap, grp = check_intersection(df, intersection_cols, target, fav_outcome, threshold=0.2)
        attr_results['intersection'] = {
            "gap": gap,
            "is_gap": bool(is_gap),
            "groups": grp.to_dict('records')
        }
        
        results[prot] = attr_results

    return results

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)