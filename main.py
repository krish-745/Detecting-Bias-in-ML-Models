import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder

# Import your OptimizedPreprocessor class!
# Make sure the path matches where your file is actually saved
from preprocessing.optimized import OptimizedPreprocessor 

print("==========================================")
print(" 🚀 TESTING OPTIMIZED PREPROCESSOR")
print("==========================================\n")

print("1. Loading adult_small.csv...")
columns = [
    'age', 'workclass', 'fnlwgt', 'education', 'education.num', 
    'marital.status', 'occupation', 'relationship', 'race', 'sex', 
    'capital.gain', 'capital.loss', 'hours.per.week', 'native.country', 'income'
]
# We load it, and skip the header row if it exists
df_real = pd.read_csv("adult_small.csv", names=columns, na_values=" ?", skipinitialspace=True).dropna()

print("2. Putting data on a diet (Dimensionality Reduction)...")
# Compress Education levels
df_real['education'] = df_real['education'].replace(
    ['Preschool', '1st.4th', '5th.6th', '7th.8th', '9th', '10th', '11th', '12th', 'HS.grad'], 'Low')
df_real['education'] = df_real['education'].replace(
    ['Some.college', 'Assoc.voc', 'Assoc.acdm', 'Bachelors'], 'Mid')
df_real['education'] = df_real['education'].replace(
    ['Masters', 'Prof.school', 'Doctorate'], 'High')

# Compress Occupations
white_collar = ['Exec.managerial', 'Prof.specialty', 'Sales', 'Tech.support']
blue_collar = ['Craft.repair', 'Farming.fishing', 'Handlers.cleaners', 'Machine.op.inspct', 'Transport.moving']
df_real['occupation'] = df_real['occupation'].apply(
    lambda x: 'White.Collar' if x in white_collar else ('Blue.Collar' if x in blue_collar else 'Service/Other')
)

# Keep only the essentials
features_to_keep = ['age', 'education', 'occupation', 'race', 'sex', 'hours.per.week', 'income']
df_clean = df_real[features_to_keep].copy()

print("3. Encoding categories and mapping binaries...")
encoder = LabelEncoder()
df_clean['education'] = encoder.fit_transform(df_clean['education'])
df_clean['occupation'] = encoder.fit_transform(df_clean['occupation'])

# Ensure target and protected attributes are strict 1s and 0s
df_clean['income'] = df_clean['income'].astype(str).apply(lambda x: 1 if '>50K' in x else 0)
df_clean['sex'] = df_clean['sex'].astype(str).apply(lambda x: 1 if 'Male' in x else 0)
df_clean['race'] = df_clean['race'].astype(str).apply(lambda x: 1 if 'White' in x else 0)

# ==========================================
# THE CRITICAL STRING ERROR FIX
# ==========================================
print("4. Nuking stray strings so pandas.qcut doesn't cry...")
df_clean['age'] = pd.to_numeric(df_clean['age'], errors='coerce')
df_clean['hours.per.week'] = pd.to_numeric(df_clean['hours.per.week'], errors='coerce')
df_clean = df_clean.dropna() # Drops any row that was text (like the header)

print("\n--- ORIGINAL BIASED INCOME RATES ---")
print(df_clean.groupby(['race', 'sex'])['income'].mean().round(3))
print("------------------------------------\n")

print("5. Firing up the CVXPY Optimizer Engine...")
engine = OptimizedPreprocessor(
    prot=['race', 'sex'], 
    target='income', 
    e=0.05,        # 5% margin of error
    distortion=3.0 # Allow enough wiggle room for fairness
)

print("   -> Fitting the model (Finding the optimal fairness matrix)...")
engine.fit(df_clean, cols=['age', 'hours.per.week'], bins=4)

print("   -> Transforming the dataset...")
df_fair = engine.transform(df_clean, cols=['age', 'hours.per.week'])

print("\n--- NEW OPTIMIZED FAIR INCOME RATES ---")
print(df_fair.groupby(['race', 'sex'])['income'].mean().round(3))
print("---------------------------------------")

print("\n✅ SUCCESS MACHA! The Optimizer ran without crashing.")