import os
import random
import math
import numpy as np
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
from pathlib import Path
env_path = Path(__file__).resolve().parent.parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing Supabase credentials in environment")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def train():
    print("[SGD Trainer] Fetching profiles, deals, and engagement logs...")
    
    # 1. Fetch data
    profiles_res = supabase.table("profiles").select("id").execute()
    user_ids = [p["id"] for p in (profiles_res.data or [])]
    
    deals_res = supabase.table("deals").select("id, category").execute()
    deals = deals_res.data or []
    deal_id_to_cat = {d["id"]: (d["category"] or "Unknown") for d in deals}
    deal_ids = [d["id"] for d in deals]
    
    logs_res = supabase.table("engagement_logs").select("user_id, event_type, item_id").execute()
    logs = logs_res.data or []
    
    if not user_ids or not deal_ids:
        print("[SGD Trainer] Insufficient users or deals in the database. Aborting training.")
        return
        
    print(f"[SGD Trainer] Found {len(user_ids)} users, {len(deal_ids)} deals, and {len(logs)} logs.")
    
    # 2. Map interactions into feedback scores
    # Scale: redeem/claim = 1.0, save/favorite = 0.8, view/click = 0.4
    interactions = {}
    user_implicit_sets = {uid: set() for uid in user_ids}
    
    for log in logs:
        uid = log.get("user_id")
        iid = log.get("item_id")
        event = log.get("event_type")
        
        if uid not in user_ids or iid not in deal_ids:
            continue
            
        score = 0.1
        if event in ("redeem", "claim"):
            score = 1.0
        elif event in ("save", "favorite"):
            score = 0.8
        elif event == "dwell":
            score = 0.6
        elif event in ("view", "click"):
            score = 0.4
        elif event == "scroll":
            score = 0.3
        elif event == "hover":
            score = 0.2
            
        key = (uid, iid)
        interactions[key] = max(interactions.get(key, 0.0), score)
        
        # Add to implicit feedback set I_u
        user_implicit_sets[uid].add(iid)
        
    # If no interactions exist, let's inject a few default interactions for training stability
    if not interactions:
        print("[SGD Trainer] No engagement logs found. Injecting mock interactions for training.")
        for uid in user_ids[:2]:
            for iid in deal_ids[:3]:
                interactions[(uid, iid)] = random.choice([0.4, 0.8, 1.0])
                user_implicit_sets[uid].add(iid)
                
    # 3. Initialize SVD++ Parameters
    k = 32 # latent dimensions
    eta = 0.05 # learning rate
    lambda_reg = 0.02 # regularization
    epochs = 40
    
    # Global mean mu
    mu = np.mean(list(interactions.values())) if interactions else 0.5
    
    # User vectors (p_u) and biases (b_u)
    p = {uid: np.random.normal(0, 0.1, k) for uid in user_ids}
    b_u = {uid: 0.0 for uid in user_ids}
    
    # Deal vectors (q_i) and biases (b_i)
    q = {iid: np.random.normal(0, 0.1, k) for iid in deal_ids}
    b_i = {iid: 0.0 for iid in deal_ids}
    
    # Category implicit feedback vectors (y_c)
    unique_categories = set(deal_id_to_cat.values())
    y = {cat: np.random.normal(0, 0.1, k) for cat in unique_categories}
    
    print(f"[SGD Trainer] Starting SVD++ training for {epochs} epochs (k={k}, eta={eta}, lambda={lambda_reg})...")
    
    # 4. SGD Optimization Loop
    for epoch in range(epochs):
        loss = 0.0
        
        # Shuffle interactions
        samples = list(interactions.items())
        random.shuffle(samples)
        
        for (uid, iid), r in samples:
            I_u = user_implicit_sets[uid]
            sz_I_u = len(I_u)
            
            # Compute SVD++ components
            sum_y = np.zeros(k)
            for j in I_u:
                cat = deal_id_to_cat.get(j, "Unknown")
                sum_y += y[cat]
                
            norm_sum_y = sum_y / math.sqrt(sz_I_u) if sz_I_u > 0 else np.zeros(k)
            u_factor = p[uid] + norm_sum_y
            
            # Predict
            r_hat = mu + b_u[uid] + b_i[iid] + np.dot(q[iid], u_factor)
            
            # Error
            err = r - r_hat
            loss += err ** 2
            
            # Update biases
            b_u[uid] += eta * (err - lambda_reg * b_u[uid])
            b_i[iid] += eta * (err - lambda_reg * b_i[iid])
            
            # Update latent vectors
            p_update = eta * (err * q[iid] - lambda_reg * p[uid])
            q_update = eta * (err * u_factor - lambda_reg * q[iid])
            
            p[uid] += p_update
            q[iid] += q_update
            
            # Update implicit factors
            if sz_I_u > 0:
                y_update_factor = err * (1.0 / math.sqrt(sz_I_u)) * q[iid]
                for j in I_u:
                    cat = deal_id_to_cat.get(j, "Unknown")
                    y[cat] += eta * (y_update_factor - lambda_reg * y[cat])
                    
        loss_rmse = math.sqrt(loss / len(samples))
        if (epoch + 1) % 10 == 0 or epoch == 0:
            print(f"  Epoch {epoch+1}/{epochs} - RMSE Loss: {loss_rmse:.4f}")
            
    print("[SGD Trainer] Training completed. Upserting parameters to database...")
    
    # 5. Bulk-upsert results
    # A. User factors
    user_payloads = [
        {"user_id": uid, "factors": p[uid].tolist(), "bias": float(b_u[uid])}
        for uid in user_ids
    ]
    supabase.table("user_latent_factors").upsert(user_payloads).execute()
    print(f"  Upserted {len(user_payloads)} user latent factors.")
    
    # B. Deal factors
    deal_payloads = [
        {"deal_id": iid, "factors": q[iid].tolist(), "bias": float(b_i[iid])}
        for iid in deal_ids
    ]
    supabase.table("deal_latent_factors").upsert(deal_payloads).execute()
    print(f"  Upserted {len(deal_payloads)} deal latent factors.")
    
    # C. Implicit category factors
    category_payloads = [
        {"category": cat, "factors": y[cat].tolist()}
        for cat in unique_categories
    ]
    supabase.table("implicit_latent_factors").upsert(category_payloads).execute()
    print(f"  Upserted {len(category_payloads)} category implicit factors.")
    
    print("[SGD Trainer] Latent factor training pipeline successfully completed!")

if __name__ == "__main__":
    train()
