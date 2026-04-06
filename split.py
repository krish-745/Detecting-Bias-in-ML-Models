import pandas as pd
from sklearn.preprocessing import LabelEncoder

# The absolute lifesaver script for 16GB RAM
print("Loading the massive adult.csv... hold tight macha.")

try:
    # Note: If your adult.csv already has a header row, you can delete the 'names' parameter
    columns = ['age', 'workclass', 'fnlwgt', 'education', 'education.num', 
               'marital.status', 'occupation', 'relationship', 'race', 'sex', 
               'capital.gain', 'capital.loss', 'hours.per.week', 'native.country', 'income']
    
    # skipinitialspace=True fixes the annoying spaces pandas sometimes reads in this dataset
    df = pd.read_csv('adult.csv', names=columns, skipinitialspace=True)
    
except FileNotFoundError:
    print("Ayyo! I can't find adult.csv. Make sure it's in the same folder as this script, da.")
    exit()

print(f"Original size: {len(df)} rows. That's absolute balls for an O(N^2) algorithm.")

# ... HACK 1: The Diet ...
# Grab 3,000 random rows. random_state=42 ensures you get the exact same mix every time.
df_sampled = df.sample(n=3000, random_state=42)
print("Trimmed down to a clean 3000 rows.")

# ... HACK 2: Nuke the Strings ...
print("Encoding strings to integers... popping that <U26 error.")
le = LabelEncoder()

# Loop through and find any column that contains text (objects), then convert to numbers
for col in df_sampled.columns:
    if df_sampled[col].dtype == 'object':
        df_sampled[col] = le.fit_transform(df_sampled[col].astype(str))

# Downcast the massive 64.bit integers to 8.bit or 16.bit to squeeze the file size even smaller
for col in df_sampled.columns:
    df_sampled[col] = pd.to_numeric(df_sampled[col], downcast='integer')

# Save the beautifully compressed, lightweight CSV
output_name = 'adult_small.csv'
df_sampled.to_csv(output_name, index=False)

print(f"Done da! {output_name} is saved and ready. Feed this to the FastAPI backend and watch it fly.")