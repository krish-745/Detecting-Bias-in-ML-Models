import pandas as pd
import numpy as np

# Set seed so we get the exact same fake data every time
np.random.seed(42)
n = 1000

# 1. Demographics
gender = np.random.choice(['Male', 'Female'], n, p=[0.6, 0.4])
# Hispanic is intentionally set to 8% to trigger your Data Desert warning (<10%)
race = np.random.choice(['White', 'Hispanic'], n, p=[0.92, 0.08]) 

# 2. The Proxy Trap
# ZipCode 10003/10004 is almost exclusively given to Hispanic applicants
zip_code = np.where(race == 'White', 
                    np.random.choice(['10001', '10002'], n), 
                    np.random.choice(['10003', '10004'], n))

# 3. The Biased Target (Approved for a Loan)
prob = np.ones(n) * 0.5
prob[gender == 'Male'] += 0.2    # Privileged boost
prob[race == 'White'] += 0.2     # Privileged boost
prob[(gender == 'Female') & (race == 'Hispanic')] -= 0.4 # Intersectional penalty

# Add noise and create final 1s and 0s
prob = np.clip(prob + np.random.normal(0, 0.1, n), 0, 1)
approved = (prob > 0.6).astype(int)

# 4. Build and Save
df = pd.DataFrame({
    'Gender': gender,
    'Race': race,
    'ZipCode': zip_code,
    'Income': np.random.randint(40000, 120000, n),
    'Approved': approved
})

df.to_csv('test_bias_data.csv', index=False)
print("test_bias_data.csv created successfully!")