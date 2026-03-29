import streamlit as st
import pandas as pd
import plotly.express as px
from diagnostics import detect_proxy, check_ratio, check_data_desert, check_intersection

st.set_page_config(page_title="Bias Diagnostic Clinic", layout="wide")

st.title("⚖️ Bias Diagnostic Clinic")
st.markdown("Upload your training data to run the 4-part fairness X-ray.")

uploaded_file = st.file_uploader("Upload Training Data (CSV)", type=["csv"])

if uploaded_file is not None:
    df = pd.read_csv(uploaded_file)
    st.success("Data loaded successfully!")
    
    with st.expander("⚙️ Configure Diagnostic Parameters", expanded=True):
        col1, col2 = st.columns(2)
        
        with col1:
            target_col = st.selectbox("🎯 Target Column (The Prediction)", df.columns, index=len(df.columns)-1 if len(df.columns) > 0 else 0)
            fav_outcome = st.text_input("Favorable Outcome Value (e.g., 1)", value="1")
            sec_prot = st.selectbox("Secondary Attribute (For Intersections)", df.columns, index=1 if len(df.columns) > 1 else 0)
            
        with col2:
            prot_col = st.selectbox("🛡️ Protected Attribute (The Demographic)", df.columns, index=0)
            priv_class = st.text_input("Privileged Class (e.g., White)", value="White")
            unpriv_class = st.text_input("Unprivileged Class (e.g., Hispanic)", value="Hispanic")
            
        with st.expander("🛠️ Advanced Threshold Settings"):
            st.markdown("Tweak the mathematical strictness of the diagnostics.")
            threshold_45 = st.slider("4/5ths Rule Legal Line", 0.0, 1.0, 0.80)
            desert_thresh = st.slider("Data Desert Danger Zone", 0.0, 0.5, 0.10)
            proxy_thresh = st.slider("Proxy Detection Sensitivity", 0, 100, 50)

    if st.button("Run Diagnostics", type="primary"):
        
        # --- The Anti-Crash Safety Lock ---
        if target_col == prot_col:
            st.error("🚨 Hold up! Your Target Column and Protected Attribute cannot be the exact same column. Fix your dropdowns!")
            st.stop()
            
        st.divider()
        
        # Auto-convert inputs to integers if the user typed numbers
        try:
            fav_outcome = int(fav_outcome) if str(fav_outcome).isdigit() else fav_outcome
            priv_class = int(priv_class) if str(priv_class).isdigit() else priv_class
            unpriv_class = int(unpriv_class) if str(unpriv_class).isdigit() else unpriv_class
        except:
            pass

        # ---------------------------------------------------------
        # 1. Disparate Impact (4/5ths Rule)
        # ---------------------------------------------------------
        st.subheader("1. Disparate Impact (4/5ths Rule) Legal Check")
        di_ratio, is_legal = check_ratio(df, prot_col, target_col, priv_class, unpriv_class, fav_outcome, threshold_45)
        
        if pd.isna(di_ratio):
            st.warning(f"Could not calculate 4/5ths rule. Are you sure '{priv_class}' and '{unpriv_class}' exist in the '{prot_col}' column?")
        else:
            if is_legal:
                st.success(f"✅ Pass: Ratio is {di_ratio:.2f} (Above {threshold_45})")
            else:
                st.error(f"❌ Fail: Ratio is {di_ratio:.2f} (Below {threshold_45}). Disparate Impact Detected.")

        st.divider()

        # ---------------------------------------------------------
        # 2. Data Desert Test
        # ---------------------------------------------------------
        st.subheader("2. Data Desert Test (Class Imbalance)")
        desert_df = check_data_desert(df, prot_col, desert_thresh)
        
        desert_df_plot = desert_df.reset_index().rename(columns={prot_col: 'Group'})
        fig_desert = px.bar(desert_df_plot, x='Group', y='proportion', 
                     color='is_desert', 
                     color_discrete_map={True: '#ff4b4b', False: '#1f77b4'})
        fig_desert.add_hline(y=desert_thresh, line_dash="dash", line_color="red", annotation_text=f"Danger Zone (< {desert_thresh})")
        fig_desert.update_layout(showlegend=False)
        st.plotly_chart(fig_desert, use_container_width=True)

        st.divider()

        # ---------------------------------------------------------
        # 3. Proxy Variable Radar
        # ---------------------------------------------------------
        st.subheader("3. Proxy Variable Radar")
        with st.spinner("Triangulating proxies..."):
            proxy_df = detect_proxy(df, prot_col, proxy_thresh, target_col)
            
            if proxy_df.empty:
                st.success("✅ No dangerous proxy variables detected at this sensitivity.")
            else:
                st.error(f"❌ {len(proxy_df)} potential proxies detected.")
                plot_df = proxy_df.reset_index().rename(columns={'index': 'Feature'})
                fig_proxy = px.bar(plot_df, x='Feature', y=['cov', 'mi', 'rf'], barmode='group')
                fig_proxy.update_layout(yaxis_title="Risk Rank Score")
                st.plotly_chart(fig_proxy, use_container_width=True)

        st.divider()

        # ---------------------------------------------------------
        # 4. Intersectional Gap Test
        # ---------------------------------------------------------
        st.subheader("4. Intersectional Gap Test")
        gap, is_gap, grp = check_intersection(df, [prot_col, sec_prot], target_col, fav_outcome, threshold=0.2)
        
        if is_gap:
            st.error(f"❌ Massive Intersectional Gap Detected: {(gap*100):.1f}% difference between highest and lowest groups.")
        else:
            st.success(f"✅ Intersectional gaps are within safe margins ({(gap*100):.1f}%).")
            
        # Format the dataframe so it looks clean in the UI
        st.dataframe(grp.style.format({'rate': '{:.1%}'}), use_container_width=True)