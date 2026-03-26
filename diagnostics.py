import pandas as pd
import numpy as np
from scipy.stats import entropy
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_selection import mutual_info_classif
from sklearn.preprocessing import LabelEncoder

def detect_proxy(df, prot, threshold,target=None):
    
    rf_threshold=np.interp(threshold,[0,100],[0.01,0.2])
    cov_threshold=np.interp(threshold,[0,100],[0.1,0.8])
    mi_threshold=np.interp(threshold,[0,100],[0.01,0.2])
    
    x=df.copy()
    if target and target in x.columns:
        x=x.drop(columns=[target])
    y=x.pop(prot)
    
    le={}
    for col in x.columns:
        if x[col].dtype=='object' or str(x[col].dtype)=='category':
            x[col]=LabelEncoder().fit_transform(x[col].astype(str))
    
    if y.dtype == 'object' or str(y.dtype) == 'category':
        y = pd.Series(LabelEncoder().fit_transform(y.astype(str)), index=y.index)
        
    score=pd.DataFrame(index=x.columns)
    
    cov=x.apply(lambda col: col.corr(pd.Series(y))).abs()
    score['cov']=cov.rank(ascending=False) 
    
    h_y=entropy(y.value_counts(normalize=True))
    mi=mutual_info_classif(x,y,random_state=42)
    mi=mi/h_y if h_y>0 else mi
    score['mi']=pd.Series(mi, index=x.columns).rank(ascending=False)
    
    rf=RandomForestClassifier(n_estimators=100, random_state=42,max_depth=5)
    rf.fit(x,y)
    score['rf']=pd.Series(rf.feature_importances_, index=x.columns).rank(ascending=False)
    
    score['score']=score[['cov','mi','rf']].mean(axis=1)
    
    is_proxy= (cov >= cov_threshold) | (mi >= mi_threshold) | (rf.feature_importances_ >= rf_threshold)
    score=score[is_proxy]
    score=score.sort_values('score', ascending=True)
    return score[['cov','mi','rf','score']]

def check_ratio(df,prot,target,priv,unpriv,fav,threshold=0.8):
    priv_total=(df[prot]==priv).sum()
    unpriv_total=(df[prot]==unpriv).sum()
    
    if priv_total==0 or unpriv_total==0:
        return np.nan, False
        
    priv_fav=((df[prot]==priv) & (df[target]==fav)).sum()
    unpriv_fav=((df[prot]==unpriv) & (df[target]==fav)).sum()
    
    priv_rate=priv_fav/priv_total
    unpriv_rate=unpriv_fav/unpriv_total
    
    if priv_rate==0:
        return np.nan, False
        
    di=unpriv_rate/priv_rate
    return di, di >= threshold


def check_data_desert(df,prot,threshold=0.1):
    counts = df[prot].value_counts()
    props = df[prot].value_counts(normalize=True)
    
    score = pd.DataFrame({
        'count': counts,
        'proportion': props
    })
    
    score['is_desert'] = score['proportion'] < threshold
    score = score.sort_values('proportion', ascending=True)

    return score

def check_intersection(df,prot,target,fav,threshold=0.2):
    x=df.copy()
    x['fav']=(x[target]==fav).astype(int)
    
    grp=x.groupby(prot)['fav'].agg(['mean','count']).reset_index()
    grp=grp.rename(columns={'mean':'rate'})
    
    gap=grp['rate'].max()-grp['rate'].min()
    is_intersection=(gap >= threshold)
    
    grp=grp.sort_values('rate', ascending=True)
    return gap,is_intersection,grp